import type {
  Account,
  Bill,
  Budget,
  Category,
  Database,
  SavingsGoal,
  Subscription,
  Transaction,
} from "./types";

// ---------- date helpers ----------

export function monthKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function todayKey(): string {
  return monthKey(new Date());
}

export function inMonth(tx: { date: string }, key: string): boolean {
  return monthKey(tx.date) === key;
}

export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

export function monthStartISO(key: string): string {
  return `${key}-01`;
}

// ---------- base selectors ----------

export function activeTx(db: Database): Transaction[] {
  return db.transactions.filter((t) => !t.deletedAt);
}

// ---------- account balances ----------
// Never stored — always derived, so it cannot drift.
export function accountBalance(db: Database, accountId: string): number {
  const acc = db.accounts.find((a) => a.id === accountId);
  let bal = acc?.openingBalance ?? 0;
  for (const t of activeTx(db)) {
    if (t.type === "income" && t.accountId === accountId) bal += t.amount;
    else if (t.type === "expense" && t.accountId === accountId) bal -= t.amount;
    else if (t.type === "transfer") {
      if (t.accountId === accountId) bal -= t.amount;
      if (t.toAccountId === accountId) bal += t.amount;
    }
  }
  return bal;
}

export function totalMoney(db: Database): number {
  return db.accounts
    .filter((a) => !a.archived)
    .reduce((s, a) => s + accountBalance(db, a.id), 0);
}

// "Available" excludes savings & investment accounts.
export function availableMoney(db: Database): number {
  return db.accounts
    .filter((a) => !a.archived && a.kind !== "savings" && a.kind !== "investment")
    .reduce((s, a) => s + accountBalance(db, a.id), 0);
}

// ---------- monthly flow ----------

export function monthlyIncome(db: Database, key: string): number {
  return activeTx(db)
    .filter((t) => t.type === "income" && inMonth(t, key))
    .reduce((s, t) => s + t.amount, 0);
}

// Expenses only — transfers are NOT spending.
export function monthlyExpense(db: Database, key: string): number {
  return activeTx(db)
    .filter((t) => t.type === "expense" && inMonth(t, key))
    .reduce((s, t) => s + t.amount, 0);
}

export function monthlySavings(db: Database, key: string): number {
  return db.goals.reduce(
    (s, g) =>
      s +
      g.contributions
        .filter((c) => inMonth(c, key))
        .reduce((a, c) => a + c.amount, 0),
    0
  );
}

export function monthlyRemaining(db: Database, key: string): number {
  return (
    monthlyIncome(db, key) - monthlyExpense(db, key) - monthlySavings(db, key)
  );
}

export interface MonthlyCycle {
  key: string;
  starting: number;
  income: number;
  expenses: number;
  savings: number;
  ending: number;
}

// Starting money for a month = total money minus this-and-later months' net.
export function monthlyCycle(db: Database, key: string): MonthlyCycle {
  const income = monthlyIncome(db, key);
  const expenses = monthlyExpense(db, key);
  const savings = monthlySavings(db, key);
  // Ending = current total money rolled back through future months.
  const now = totalMoney(db);
  let future = 0;
  let k = addMonths(todayKey(), 0);
  // sum net change of all months strictly after `key` up to today
  const months = new Set(activeTx(db).map((t) => monthKey(t.date)));
  months.forEach((mk) => {
    if (mk > key) {
      future += monthlyIncome(db, mk) - monthlyExpense(db, mk);
    }
  });
  void k;
  const ending = now - future;
  const starting = ending - income + expenses; // savings stays inside accounts
  return { key, starting, income, expenses, savings, ending };
}

// ---------- spending by category ----------

export interface CategorySpend {
  category?: Category;
  categoryId?: string;
  amount: number;
}

export function spendingByCategory(
  db: Database,
  key: string
): CategorySpend[] {
  const map = new Map<string, number>();
  for (const t of activeTx(db)) {
    if (t.type !== "expense" || !inMonth(t, key)) continue;
    const id = t.categoryId ?? "__none";
    map.set(id, (map.get(id) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([id, amount]) => ({
      categoryId: id === "__none" ? undefined : id,
      category: db.categories.find((c) => c.id === id),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

// Group spend (Food, Housing…) by category.group
export function spendingByGroup(db: Database, key: string) {
  const map = new Map<string, number>();
  for (const cs of spendingByCategory(db, key)) {
    const g = cs.category?.group ?? "أخرى";
    map.set(g, (map.get(g) ?? 0) + cs.amount);
  }
  return [...map.entries()]
    .map(([group, amount]) => ({ group, amount }))
    .sort((a, b) => b.amount - a.amount);
}

// ---------- per-member spending ----------
// A member's spend = their personal expenses
//   + their share of every shared expense (split equally)
//   + their explicit part of every split expense.
export function memberSpending(
  db: Database,
  key: string,
  memberId: string
): number {
  const memberCount = Math.max(1, db.household.members.length);
  let total = 0;
  for (const t of activeTx(db)) {
    if (t.type !== "expense" || !inMonth(t, key)) continue;
    if (t.ownership === "personal") {
      if (t.memberId === memberId) total += t.amount;
    } else if (t.ownership === "shared") {
      total += t.amount / memberCount;
    } else if (t.ownership === "split") {
      const part = t.splits?.find((s) => s.memberId === memberId);
      if (part) total += part.amount;
    }
  }
  return total;
}

export function sharedSpending(db: Database, key: string): number {
  return activeTx(db)
    .filter((t) => t.type === "expense" && t.ownership === "shared" && inMonth(t, key))
    .reduce((s, t) => s + t.amount, 0);
}

export function memberIncome(db: Database, key: string, memberId: string): number {
  return activeTx(db)
    .filter(
      (t) =>
        t.type === "income" &&
        inMonth(t, key) &&
        (t.memberId === memberId || t.ownership === "shared")
    )
    .reduce((s, t) => s + (t.memberId === memberId ? t.amount : 0), 0);
}

// ---------- budgets ----------

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  ratio: number; // 0..>1
  level: "ok" | "warn" | "danger" | "over";
}

export function budgetStatus(db: Database, b: Budget, key: string): BudgetStatus {
  let spent = 0;
  if (b.scope === "category" && b.categoryId) {
    spent = activeTx(db)
      .filter((t) => t.type === "expense" && t.categoryId === b.categoryId && inMonth(t, key))
      .reduce((s, t) => s + t.amount, 0);
  } else if (b.scope === "total") {
    spent = monthlyExpense(db, key);
  } else if (b.scope === "personal" && b.memberId) {
    spent = memberSpending(db, key, b.memberId);
  }
  const ratio = b.amount > 0 ? spent / b.amount : 0;
  const level: BudgetStatus["level"] =
    ratio > 1 ? "over" : ratio >= 0.9 ? "danger" : ratio >= 0.7 ? "warn" : "ok";
  return { budget: b, spent, remaining: b.amount - spent, ratio, level };
}

// ---------- bills ----------

export function billStatus(bill: Bill, ref = new Date()): {
  status: Bill extends never ? never : import("./types").BillStatus;
  dueDate: Date;
} {
  const key = monthKey(ref);
  const dueDate = new Date(ref.getFullYear(), ref.getMonth(), bill.dueDay);
  const paid = bill.paidMonths.includes(key);
  let status: import("./types").BillStatus;
  if (paid) status = "paid";
  else {
    const days = Math.round((dueDate.getTime() - ref.getTime()) / 86400000);
    if (days < 0) status = "overdue";
    else if (days <= 5) status = "due_soon";
    else status = "upcoming";
  }
  return { status, dueDate };
}

export function upcomingBills(db: Database, withinDays = 14, ref = new Date()) {
  return db.bills
    .map((b) => ({ bill: b, ...billStatus(b, ref) }))
    .filter((x) => x.status !== "paid")
    .filter((x) => {
      const days = Math.round((x.dueDate.getTime() - ref.getTime()) / 86400000);
      return days <= withinDays;
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

export function upcomingBillsTotal(db: Database, withinDays = 14): number {
  return upcomingBills(db, withinDays).reduce((s, x) => s + x.bill.amount, 0);
}

// ---------- subscriptions ----------

export function subMonthlyTotal(subs: Subscription[]): number {
  return subs
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (s.cycle === "monthly" ? s.amount : s.amount / 12), 0);
}
export function subYearlyTotal(subs: Subscription[]): number {
  return subs
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + (s.cycle === "yearly" ? s.amount : s.amount * 12), 0);
}

// ---------- savings goals ----------

export function goalSaved(g: SavingsGoal): number {
  return g.contributions.reduce((s, c) => s + c.amount, 0);
}
export function goalRatio(g: SavingsGoal): number {
  return g.target > 0 ? goalSaved(g) / g.target : 0;
}
// Estimated months to completion at recent contribution pace.
export function goalEtaMonths(g: SavingsGoal): number | null {
  const saved = goalSaved(g);
  const remaining = g.target - saved;
  if (remaining <= 0) return 0;
  const pace =
    g.monthlyContribution && g.monthlyContribution > 0
      ? g.monthlyContribution
      : averageMonthly(g.contributions);
  if (!pace || pace <= 0) return null;
  return Math.ceil(remaining / pace);
}

function averageMonthly(contribs: { amount: number; date: string }[]): number {
  if (contribs.length === 0) return 0;
  const byMonth = new Map<string, number>();
  for (const c of contribs) byMonth.set(monthKey(c.date), (byMonth.get(monthKey(c.date)) ?? 0) + c.amount);
  const vals = [...byMonth.values()];
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ---------- insights (deterministic, explains user's own data) ----------

export interface Insight {
  tone: "info" | "warn" | "good";
  text: string;
}

export function insights(db: Database, key: string): Insight[] {
  const out: Insight[] = [];
  const prev = addMonths(key, -1);

  // food-ish category month-over-month
  const groupsNow = new Map(spendingByGroup(db, key).map((g) => [g.group, g.amount]));
  const groupsPrev = new Map(spendingByGroup(db, prev).map((g) => [g.group, g.amount]));
  for (const [group, now] of groupsNow) {
    const before = groupsPrev.get(group) ?? 0;
    if (before > 0 && now > before * 1.15) {
      out.push({
        tone: "warn",
        text: `أنفقت على ${group} أكثر بـ ${Math.round(((now - before) / before) * 100)}% مقارنةً بالشهر الماضي.`,
      });
    }
  }

  // subscriptions
  const monthly = subMonthlyTotal(db.subscriptions);
  if (monthly > 0) {
    out.push({
      tone: "info",
      text: `اشتراكاتك تكلّف حوالي ${Math.round(monthly)} شهريًا.`,
    });
  }

  // upcoming bills
  const upTotal = upcomingBillsTotal(db, 14);
  if (upTotal > 0) {
    out.push({
      tone: "info",
      text: `لديك فواتير قادمة بقيمة ${Math.round(upTotal)} خلال الأيام الـ14 القادمة.`,
    });
  }

  // savings goals eta / milestones
  for (const g of db.goals) {
    const r = goalRatio(g);
    if (r >= 0.7 && r < 1) {
      out.push({ tone: "good", text: `وصلت إلى ${Math.round(r * 100)}% من هدف «${g.name}».` });
    } else if (r < 0.7) {
      const eta = goalEtaMonths(g);
      if (eta && eta > 0)
        out.push({
          tone: "info",
          text: `بمعدّل ادّخارك الحالي قد تحقّق هدف «${g.name}» خلال حوالي ${eta} أشهر.`,
        });
    }
  }

  // budgets over
  for (const b of db.budgets) {
    const st = budgetStatus(db, b, key);
    if (st.level === "over")
      out.push({ tone: "warn", text: `تجاوزت ميزانية «${b.name}».` });
  }

  return out.slice(0, 6);
}

export function accountKindLabel(kind: Account["kind"]): string {
  return {
    bank: "حساب بنكي",
    savings: "حساب توفير",
    cash: "نقد",
    credit: "بطاقة ائتمان",
    investment: "استثمار",
  }[kind];
}
