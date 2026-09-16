import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Account,
  ActivityEvent,
  AppNotification,
  Bill,
  Budget,
  Category,
  CurrencyCode,
  Database,
  Household,
  Member,
  SavingsGoal,
  Subscription,
  Transaction,
} from "../types";
import { DEFAULT_CATEGORIES } from "../data/categories";

// Money is stored in the DB as integer minor units (agorot/cents).
const toMinor = (n: number) => Math.round(n * 100);
const toMajor = (n: number) => (n ?? 0) / 100;

type Row = Record<string, unknown>;

// ---------------- LOAD ----------------

export async function resolveHouseholdId(sb: SupabaseClient): Promise<string | null> {
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await sb
    .from("household_members")
    .select("household_id")
    .eq("user_id", auth.user.id)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0].household_id as string;
}

export async function loadDatabase(sb: SupabaseClient, householdId: string): Promise<Database> {
  const [
    hh,
    members,
    accounts,
    categories,
    txs,
    splits,
    budgets,
    bills,
    subs,
    goals,
    contribs,
    notifications,
    activity,
    prefs,
  ] = await Promise.all([
    sb.from("households").select("*").eq("id", householdId).single(),
    sb.from("household_members").select("*").eq("household_id", householdId).order("created_at"),
    sb.from("accounts").select("*").eq("household_id", householdId).order("created_at"),
    sb.from("categories").select("*").eq("household_id", householdId).order("created_at"),
    sb.from("transactions").select("*").eq("household_id", householdId).order("occurred_on", { ascending: false }),
    sb.from("transaction_splits").select("*"),
    sb.from("budgets").select("*").eq("household_id", householdId),
    sb.from("bills").select("*").eq("household_id", householdId),
    sb.from("subscriptions").select("*").eq("household_id", householdId),
    sb.from("savings_goals").select("*").eq("household_id", householdId),
    sb.from("savings_contributions").select("*").eq("household_id", householdId),
    sb.from("notifications").select("*").eq("household_id", householdId).order("created_at", { ascending: false }),
    sb.from("activity_events").select("*").eq("household_id", householdId).order("created_at", { ascending: false }).limit(100),
    sb.from("user_preferences").select("*").maybeSingle(),
  ]);

  const memberRows = (members.data ?? []) as Row[];
  const householdMembers: Member[] = memberRows.map((m) => ({
    id: m.id as string,
    name: m.display_name as string,
    role: m.role as Member["role"],
    color: (m.color as string) ?? "#6366f1",
  }));

  const household: Household = {
    id: householdId,
    name: (hh.data?.name as string) ?? "عائلتي",
    currency: ((hh.data?.currency as string) ?? "ILS") as CurrencyCode,
    members: householdMembers,
  };

  const splitsByTx = new Map<string, { memberId: string; amount: number }[]>();
  for (const s of (splits.data ?? []) as Row[]) {
    const tid = s.transaction_id as string;
    if (!splitsByTx.has(tid)) splitsByTx.set(tid, []);
    splitsByTx.get(tid)!.push({ memberId: s.member_id as string, amount: toMajor(s.amount as number) });
  }

  const transactions: Transaction[] = ((txs.data ?? []) as Row[]).map((t) => ({
    id: t.id as string,
    type: t.type as Transaction["type"],
    amount: toMajor(t.amount as number),
    date: t.occurred_on as string,
    merchant: (t.merchant as string) ?? "",
    categoryId: (t.category_id as string) ?? undefined,
    accountId: t.account_id as string,
    toAccountId: (t.to_account_id as string) ?? undefined,
    ownership: t.own as Transaction["ownership"],
    memberId: (t.member_id as string) ?? undefined,
    splits: splitsByTx.get(t.id as string),
    paymentMethod: (t.payment_method as string) ?? undefined,
    notes: (t.notes as string) ?? undefined,
    tags: (t.tags as string[]) ?? undefined,
    receiptId: (t.receipt_id as string) ?? undefined,
    recurrence: (t.recur as Transaction["recurrence"]) ?? "none",
    createdAt: (t.created_at as string) ?? new Date().toISOString(),
    deletedAt: (t.deleted_at as string) ?? undefined,
  }));

  const accountsD: Account[] = ((accounts.data ?? []) as Row[]).map((a) => ({
    id: a.id as string,
    name: a.name as string,
    kind: a.kind as Account["kind"],
    openingBalance: toMajor(a.opening_balance as number),
    archived: (a.archived as boolean) ?? false,
  }));

  const categoriesD: Category[] = ((categories.data ?? []) as Row[]).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    group: c.grp as string,
    icon: (c.icon as string) ?? "Ellipsis",
    color: (c.color as string) ?? "#64748b",
    kind: (c.kind as Category["kind"]) ?? "expense",
    isCustom: (c.is_custom as boolean) ?? false,
  }));

  const budgetsD: Budget[] = ((budgets.data ?? []) as Row[]).map((b) => ({
    id: b.id as string,
    name: b.name as string,
    scope: b.scope as Budget["scope"],
    categoryId: (b.category_id as string) ?? undefined,
    memberId: (b.member_id as string) ?? undefined,
    amount: toMajor(b.amount as number),
  }));

  const billsD: Bill[] = ((bills.data ?? []) as Row[]).map((b) => ({
    id: b.id as string,
    name: b.name as string,
    amount: toMajor(b.amount as number),
    dueDay: b.due_day as number,
    categoryId: (b.category_id as string) ?? undefined,
    accountId: (b.account_id as string) ?? undefined,
    memberId: (b.member_id as string) ?? undefined,
    recurrence: (b.recur as Bill["recurrence"]) ?? "monthly",
    notes: (b.notes as string) ?? undefined,
    paidMonths: (b.paid_months as string[]) ?? [],
  }));

  const subsD: Subscription[] = ((subs.data ?? []) as Row[]).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    amount: toMajor(s.amount as number),
    cycle: s.cycle as Subscription["cycle"],
    nextChargeDate: s.next_charge_date as string,
    categoryId: (s.category_id as string) ?? undefined,
    accountId: (s.account_id as string) ?? undefined,
    status: s.status as Subscription["status"],
  }));

  const contribByGoal = new Map<string, SavingsGoal["contributions"]>();
  for (const c of (contribs.data ?? []) as Row[]) {
    const gid = c.goal_id as string;
    if (!contribByGoal.has(gid)) contribByGoal.set(gid, []);
    contribByGoal.get(gid)!.push({
      id: c.id as string,
      amount: toMajor(c.amount as number),
      date: c.contributed_on as string,
      memberId: (c.member_id as string) ?? undefined,
    });
  }

  const goalsD: SavingsGoal[] = ((goals.data ?? []) as Row[]).map((g) => ({
    id: g.id as string,
    name: g.name as string,
    target: toMajor(g.target as number),
    targetDate: (g.target_date as string) ?? undefined,
    monthlyContribution: g.monthly_contribution ? toMajor(g.monthly_contribution as number) : undefined,
    contributions: contribByGoal.get(g.id as string) ?? [],
  }));

  const notificationsD: AppNotification[] = ((notifications.data ?? []) as Row[]).map((n) => ({
    id: n.id as string,
    at: n.created_at as string,
    category: n.category as AppNotification["category"],
    title: n.title as string,
    read: (n.read as boolean) ?? false,
  }));

  const activityD: ActivityEvent[] = ((activity.data ?? []) as Row[]).map((a) => ({
    id: a.id as string,
    at: a.created_at as string,
    memberId: (a.member_id as string) ?? undefined,
    kind: a.kind as string,
    message: a.message as string,
  }));

  void prefs;

  return {
    household,
    accounts: accountsD,
    categories: categoriesD,
    transactions,
    budgets: budgetsD,
    bills: billsD,
    subscriptions: subsD,
    goals: goalsD,
    activity: activityD,
    notifications: notificationsD,
    onboardingDone: true,
  };
}

// ---------------- WRITE HELPERS ----------------
// Each returns the new/affected id where relevant. All are household-scoped;
// RLS enforces that the caller is a member.

async function currentMemberId(sb: SupabaseClient, householdId: string): Promise<string | null> {
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data } = await sb
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

export async function logActivity(sb: SupabaseClient, householdId: string, kind: string, message: string) {
  const memberId = await currentMemberId(sb, householdId);
  const { data: auth } = await sb.auth.getUser();
  await sb.from("activity_events").insert({
    household_id: householdId,
    member_id: memberId,
    actor: auth.user?.id,
    kind,
    message,
  });
}

export async function insertTransaction(
  sb: SupabaseClient,
  householdId: string,
  t: Omit<Transaction, "id" | "createdAt">
): Promise<void> {
  const { data: auth } = await sb.auth.getUser();
  const { data, error } = await sb
    .from("transactions")
    .insert({
      household_id: householdId,
      type: t.type,
      amount: toMinor(t.amount),
      occurred_on: t.date,
      merchant: t.merchant,
      category_id: t.categoryId ?? null,
      account_id: t.accountId,
      to_account_id: t.toAccountId ?? null,
      own: t.ownership,
      member_id: t.memberId ?? null,
      payment_method: t.paymentMethod ?? null,
      notes: t.notes ?? null,
      tags: t.tags ?? null,
      recur: t.recurrence,
      created_by: auth.user?.id,
    })
    .select("id")
    .single();
  if (error) throw error;

  if (t.splits && t.splits.length) {
    await sb.from("transaction_splits").insert(
      t.splits.map((s) => ({ transaction_id: data.id, member_id: s.memberId, amount: toMinor(s.amount) }))
    );
  }
}

export async function updateTransactionRow(sb: SupabaseClient, id: string, patch: Partial<Transaction>): Promise<void> {
  const row: Row = {};
  if (patch.merchant !== undefined) row.merchant = patch.merchant;
  if (patch.amount !== undefined) row.amount = toMinor(patch.amount);
  if (patch.categoryId !== undefined) row.category_id = patch.categoryId ?? null;
  if (patch.accountId !== undefined) row.account_id = patch.accountId;
  if (patch.date !== undefined) row.occurred_on = patch.date;
  if (patch.notes !== undefined) row.notes = patch.notes ?? null;
  if (patch.deletedAt !== undefined) row.deleted_at = patch.deletedAt ?? null;
  const { error } = await sb.from("transactions").update(row).eq("id", id);
  if (error) throw error;
}

export async function insertAccount(sb: SupabaseClient, householdId: string, a: Omit<Account, "id">) {
  const { error } = await sb.from("accounts").insert({
    household_id: householdId,
    name: a.name,
    kind: a.kind,
    opening_balance: toMinor(a.openingBalance),
    archived: a.archived ?? false,
  });
  if (error) throw error;
}

export async function insertBudget(sb: SupabaseClient, householdId: string, b: Omit<Budget, "id">) {
  const { error } = await sb.from("budgets").insert({
    household_id: householdId,
    name: b.name,
    scope: b.scope,
    category_id: b.categoryId ?? null,
    member_id: b.memberId ?? null,
    amount: toMinor(b.amount),
  });
  if (error) throw error;
}

export async function deleteBudgetRow(sb: SupabaseClient, id: string) {
  await sb.from("budgets").delete().eq("id", id);
}

export async function insertBill(sb: SupabaseClient, householdId: string, b: Omit<Bill, "id" | "paidMonths">) {
  const { error } = await sb.from("bills").insert({
    household_id: householdId,
    name: b.name,
    amount: toMinor(b.amount),
    due_day: b.dueDay,
    category_id: b.categoryId ?? null,
    account_id: b.accountId ?? null,
    member_id: b.memberId ?? null,
    recur: b.recurrence,
    notes: b.notes ?? null,
  });
  if (error) throw error;
}

export async function setBillPaidMonths(sb: SupabaseClient, id: string, months: string[]) {
  await sb.from("bills").update({ paid_months: months }).eq("id", id);
}

export async function insertSubscription(sb: SupabaseClient, householdId: string, s: Omit<Subscription, "id">) {
  const { error } = await sb.from("subscriptions").insert({
    household_id: householdId,
    name: s.name,
    amount: toMinor(s.amount),
    cycle: s.cycle,
    next_charge_date: s.nextChargeDate,
    category_id: s.categoryId ?? null,
    account_id: s.accountId ?? null,
    status: s.status,
  });
  if (error) throw error;
}

export async function updateSubscriptionRow(sb: SupabaseClient, id: string, patch: Partial<Subscription>) {
  const row: Row = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.amount !== undefined) row.amount = toMinor(patch.amount);
  await sb.from("subscriptions").update(row).eq("id", id);
}

export async function insertGoal(sb: SupabaseClient, householdId: string, g: Omit<SavingsGoal, "id" | "contributions">) {
  const { error } = await sb.from("savings_goals").insert({
    household_id: householdId,
    name: g.name,
    target: toMinor(g.target),
    target_date: g.targetDate ?? null,
    monthly_contribution: g.monthlyContribution ? toMinor(g.monthlyContribution) : null,
  });
  if (error) throw error;
}

export async function insertContribution(sb: SupabaseClient, householdId: string, goalId: string, amount: number, memberId?: string) {
  const { error } = await sb.from("savings_contributions").insert({
    goal_id: goalId,
    household_id: householdId,
    amount: toMinor(amount),
    member_id: memberId ?? null,
  });
  if (error) throw error;
}

export async function insertCategory(sb: SupabaseClient, householdId: string, c: Omit<Category, "id">) {
  await sb.from("categories").insert({
    household_id: householdId,
    name: c.name,
    grp: c.group,
    icon: c.icon,
    color: c.color,
    kind: c.kind,
    is_custom: true,
  });
}

export async function markNotifRead(sb: SupabaseClient, id: string) {
  await sb.from("notifications").update({ read: true }).eq("id", id);
}
export async function markAllNotifRead(sb: SupabaseClient, householdId: string) {
  await sb.from("notifications").update({ read: true }).eq("household_id", householdId);
}

export async function updateHouseholdRow(sb: SupabaseClient, householdId: string, patch: { name?: string; currency?: string }) {
  await sb.from("households").update(patch).eq("id", householdId);
}

export async function addMemberRow(sb: SupabaseClient, householdId: string, name: string, color: string) {
  await sb.from("household_members").insert({ household_id: householdId, display_name: name, role: "partner", color });
}
export async function removeMemberRow(sb: SupabaseClient, id: string) {
  await sb.from("household_members").delete().eq("id", id);
}

// ---------------- ONBOARDING ----------------

export async function createHousehold(
  sb: SupabaseClient,
  opts: { name: string; currency: CurrencyCode; ownerName: string; accounts: { name: string; kind: Account["kind"]; opening: number }[] }
): Promise<string> {
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error("not authenticated");

  const { data: hh, error: e1 } = await sb
    .from("households")
    .insert({ name: opts.name, currency: opts.currency, created_by: auth.user.id })
    .select("id")
    .single();
  if (e1) throw e1;
  const householdId = hh.id as string;

  // owner membership
  const { error: e2 } = await sb.from("household_members").insert({
    household_id: householdId,
    user_id: auth.user.id,
    display_name: opts.ownerName,
    role: "owner",
    color: "#6366f1",
  });
  if (e2) throw e2;

  // default categories
  await sb.from("categories").insert(
    DEFAULT_CATEGORIES.map((c) => ({
      household_id: householdId,
      name: c.name,
      grp: c.group,
      icon: c.icon,
      color: c.color,
      kind: c.kind,
      is_custom: false,
    }))
  );

  // starting accounts
  if (opts.accounts.length) {
    await sb.from("accounts").insert(
      opts.accounts.map((a) => ({
        household_id: householdId,
        name: a.name,
        kind: a.kind,
        opening_balance: toMinor(a.opening),
      }))
    );
  }

  await sb.from("household_settings").insert({ household_id: householdId }).select().maybeSingle();

  return householdId;
}
