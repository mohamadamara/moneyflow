"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, TriangleAlert, CircleCheck, Info, Wallet, CalendarClock } from "lucide-react";
import { useStore } from "@/lib/store";
import { useUI } from "@/components/quick-add";
import {
  totalMoney,
  monthlyIncome,
  monthlyExpense,
  monthlySavings,
  monthlyRemaining,
  spendingByGroup,
  activeTx,
  upcomingBills,
  insights,
  addMonths,
  todayKey,
} from "@/lib/calc";
import { money, fmtMonth, fmtMonthShort } from "@/lib/format";
import { Card, CardHeader, Button, EmptyState, Skeleton, Badge } from "@/components/ui";
import { StatTile, Delta } from "@/components/widgets";
import { TxList } from "@/components/tx-list";
import { CashflowChart, DonutChart, type Slice } from "@/components/charts";
import { TxDetail } from "@/components/tx-detail";
import { DEFAULT_CATEGORIES } from "@/lib/data/categories";
import type { Transaction, TxType } from "@/lib/types";

const GROUP_COLOR: Record<string, string> = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.group, c.color]));
const linkCls = "tap -my-2 inline-flex items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-semibold text-brand hover:underline";

export default function Dashboard() {
  const { db, ready, month, setMonth } = useStore();
  const { openAdd } = useUI();
  const cur = db.household.currency;
  const [sel, setSel] = useState<Transaction | null>(null);

  // Six months of real totals. The window ends at the current month and
  // only moves when the selected month falls outside it, so tapping a
  // bar does not make the chart jump.
  const flow = useMemo(
    () =>
      [-5, -4, -3, -2, -1, 0].map((d) => {
        const now = todayKey();
        const end = month > now || month < addMonths(now, -5) ? month : now;
        const key = addMonths(end, d);
        return { key, label: fmtMonthShort(`${key}-01`), income: monthlyIncome(db, key), expense: monthlyExpense(db, key) };
      }),
    [db, month]
  );

  if (!ready) return <DashboardSkeleton />;

  const prev = addMonths(month, -1);
  const total = totalMoney(db);
  const income = monthlyIncome(db, month);
  const spent = monthlyExpense(db, month);
  const saved = monthlySavings(db, month);
  const remaining = monthlyRemaining(db, month);
  const incomePrev = monthlyIncome(db, prev);
  const spentPrev = monthlyExpense(db, prev);

  // spending by group, with its budget when one is set
  const catBudget = new Map(db.budgets.filter((b) => b.scope === "category").map((b) => [b.categoryId, b.amount]));
  const groupBudget = (group: string) =>
    db.categories.filter((c) => c.group === group).reduce((s, c) => s + (catBudget.get(c.id) ?? 0), 0);
  const groups = spendingByGroup(db, month);
  const slices: Slice[] = groups.slice(0, 5).map((g) => {
    const budget = groupBudget(g.group);
    return { name: g.group, amount: g.amount, color: GROUP_COLOR[g.group] ?? "#64748b", note: budget ? `من ${money(budget, cur)}` : undefined };
  });
  const rest = groups.slice(5).reduce((s, g) => s + g.amount, 0);
  if (rest > 0) slices.push({ name: "فئات أخرى", amount: rest, color: "#94a3b8" });

  const recent = activeTx(db)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 7);
  const upcoming = upcomingBills(db, 14);
  const tips = insights(db, month);
  const noData = activeTx(db).length === 0;
  const monthName = fmtMonth(`${month}-01`);

  if (noData) {
    return (
      <Card>
        <EmptyState
          icon={<Wallet size={22} />}
          title="لنبدأ بتتبّع أموالكم"
          desc="أضف أول عملية دخل أو مصروف لترى تدفّق أموالكم يظهر هنا."
          action={<Button onClick={() => openAdd()}>إضافة أول عملية</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ---------- desktop / tablet heading ---------- */}
      <div className="hidden items-end justify-between gap-4 md:flex">
        <div>
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-ink">نظرة عامة</h1>
          <p className="mt-1 text-sm text-muted">أموال {db.household.name} في {monthName}</p>
        </div>
        <QuickActions onAdd={openAdd} />
      </div>

      {/* ---------- phone: one balance card + quick actions ---------- */}
      <div className="space-y-3 md:hidden">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted">إجمالي الأموال</p>
          <p className="tnum mt-1 text-[32px] font-bold leading-none tracking-tight text-ink">{money(total, cur)}</p>
          <div className="mt-4 grid grid-cols-3 divide-x divide-x-reverse divide-border border-t border-border pt-3">
            <MiniStat label="الدخل" value={money(income, cur)} tone="text-pos" />
            <MiniStat label="المصروفات" value={money(spent, cur)} tone="text-ink" />
            <MiniStat label="المتبقّي" value={money(remaining, cur)} tone={remaining < 0 ? "text-neg" : "text-ink"} />
          </div>
        </Card>
        <QuickActions onAdd={openAdd} />
      </div>

      {/* ---------- desktop / tablet: KPI row ---------- */}
      <div className="hidden grid-cols-2 gap-4 md:grid xl:grid-cols-4">
        <StatTile label="إجمالي الأموال" value={money(total, cur)} icon="Wallet" hint={`في ${db.accounts.filter((a) => !a.archived).length} حسابات`} />
        <StatTile
          label="الدخل"
          value={money(income, cur)}
          icon="TrendingUp"
          delta={<Delta now={income} prev={incomePrev} goodWhenUp />}
          hint={incomePrev ? "عن الشهر السابق" : monthName}
        />
        <StatTile
          label="المصروفات"
          value={money(spent, cur)}
          icon="TrendingDown"
          delta={<Delta now={spent} prev={spentPrev} />}
          hint={spentPrev ? "عن الشهر السابق" : monthName}
        />
        <StatTile
          label="المتبقّي"
          value={money(remaining, cur)}
          tone={remaining < 0 ? "neg" : "ink"}
          icon="PiggyBank"
          hint={saved > 0 ? `بعد ادّخار ${money(saved, cur)}` : "الدخل ناقص المصروفات"}
        />
      </div>

      <div className="grid gap-4 md:gap-5 lg:grid-cols-3">
        {/* ---------- cash flow ---------- */}
        <Card className="lg:col-span-2">
          <CardHeader title="الدخل والمصروفات" sub="آخر 6 أشهر · اضغط على شهر لفتحه" />
          <div className="p-4 md:p-5">
            <CashflowChart data={flow} currency={cur} activeKey={month} onSelect={setMonth} />
          </div>
        </Card>

        {/* ---------- spending split ---------- */}
        <Card>
          <CardHeader title="أين ذهب المال" sub={monthName} action={<Link href="/expenses" className={linkCls}>التفاصيل</Link>} />
          <div className="p-4 md:p-5">
            {slices.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">لا مصروفات في هذا الشهر.</p>
            ) : (
              <DonutChart slices={slices} currency={cur} totalLabel="المصروفات" />
            )}
          </div>
        </Card>

        {/* ---------- recent activity ---------- */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="آخر العمليات"
            action={
              <Link href="/transactions" className={linkCls}>
                الكل <ArrowLeft size={13} />
              </Link>
            }
          />
          <div className="p-2 md:pt-3">
            <TxList items={recent} onSelect={setSel} />
          </div>
        </Card>

        {/* ---------- side column ---------- */}
        <div className="space-y-4 md:space-y-5">
          <Card>
            <CardHeader title="فواتير قادمة" sub="خلال أسبوعين" action={<Link href="/bills" className={linkCls}>الفواتير</Link>} />
            <div className="px-4 pb-3 pt-2 md:px-5">
              {upcoming.length === 0 ? (
                <p className="flex items-center gap-2 py-5 text-sm text-muted">
                  <CalendarClock size={16} className="text-faint" /> لا فواتير مستحقّة قريبًا.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {upcoming.slice(0, 4).map((u) => (
                    <li key={u.bill.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-ink">{u.bill.name}</p>
                        <p className="text-xs text-muted">يوم {u.bill.dueDay} من الشهر</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {u.status === "due_soon" && <Badge tone="warn">قريبًا</Badge>}
                        {u.status === "overdue" && <Badge tone="neg">متأخّرة</Badge>}
                        <span className="tnum text-[13px] font-semibold text-ink">{money(u.bill.amount, cur)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="يحتاج انتباهك" />
            <ul className="space-y-3 p-4 md:p-5">
              {tips.length === 0 && (
                <li className="flex items-center gap-2 text-sm text-muted">
                  <CircleCheck size={16} className="text-pos" /> كل شيء يبدو جيدًا.
                </li>
              )}
              {tips.map((t, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  {t.tone === "warn" ? (
                    <TriangleAlert size={15} className="mt-0.5 shrink-0 text-warn" />
                  ) : t.tone === "good" ? (
                    <CircleCheck size={15} className="mt-0.5 shrink-0 text-pos" />
                  ) : (
                    <Info size={15} className="mt-0.5 shrink-0 text-faint" />
                  )}
                  <p className="text-[13px] leading-relaxed text-ink">{t.text}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <TxDetail tx={sel} onClose={() => setSel(null)} />
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 px-2 text-center first:pr-0 last:pl-0">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={clsx("tnum mt-0.5 truncate text-sm font-bold", tone)}>{value}</p>
    </div>
  );
}

// The three things people do most — one tap each.
function QuickActions({ onAdd }: { onAdd: (type?: TxType) => void }) {
  const items: { type: TxType; label: string; icon: React.ReactNode }[] = [
    { type: "expense", label: "مصروف", icon: <ArrowUpRight size={16} /> },
    { type: "income", label: "دخل", icon: <ArrowDownLeft size={16} /> },
    { type: "transfer", label: "تحويل", icon: <ArrowLeftRight size={16} /> },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 md:flex">
      {items.map((it) => (
        <Button key={it.type} variant="outline" onClick={() => onAdd(it.type)}>
          {it.icon}
          {it.label}
        </Button>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6" aria-busy="true" aria-label="جارٍ التحميل">
      <Skeleton className="h-36 rounded-2xl md:hidden" />
      <Skeleton className="hidden h-12 w-64 md:block" />
      <div className="hidden grid-cols-2 gap-4 md:grid xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:gap-5 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
