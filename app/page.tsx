"use client";

import Link from "next/link";
import { ArrowLeft, TriangleAlert, CircleCheck, Info, ArrowDown } from "lucide-react";
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
  budgetStatus,
} from "@/lib/calc";
import { money } from "@/lib/format";
import { Card, CardHeader, Button, EmptyState, Skeleton, Badge } from "@/components/ui";
import { StatTile, TxRow, CategoryBar } from "@/components/widgets";
import { DEFAULT_CATEGORIES } from "@/lib/data/categories";

const GROUP_COLOR: Record<string, string> = Object.fromEntries(
  DEFAULT_CATEGORIES.map((c) => [c.group, c.color])
);

export default function Dashboard() {
  const { db, ready, month } = useStore();
  const { openAdd } = useUI();
  const cur = db.household.currency;

  if (!ready) return <DashboardSkeleton />;

  const total = totalMoney(db);
  const income = monthlyIncome(db, month);
  const spent = monthlyExpense(db, month);
  const saved = monthlySavings(db, month);
  const remaining = monthlyRemaining(db, month);

  const groups = spendingByGroup(db, month);
  const recent = activeTx(db)
    .filter((t) => true)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);
  const upcoming = upcomingBills(db, 14);
  const tips = insights(db, month);

  // budget by group (map group -> budget via categories inside)
  const catBudget = new Map(db.budgets.filter((b) => b.scope === "category").map((b) => [b.categoryId, b.amount]));
  const groupBudget = (group: string) => {
    let sum = 0;
    let has = false;
    for (const c of db.categories.filter((c) => c.group === group)) {
      const amt = catBudget.get(c.id);
      if (amt) { sum += amt; has = true; }
    }
    return has ? sum : undefined;
  };

  const cat = (id?: string) => db.categories.find((c) => c.id === id);
  const mem = (id?: string) => db.household.members.find((m) => m.id === id);

  const noData = activeTx(db).length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">مرحبًا بعودتك 👋</p>
          <h1 className="text-2xl font-extrabold text-ink">نظرة عامة على أموالكم</h1>
        </div>
      </div>

      {noData ? (
        <Card>
          <EmptyState
            title="لنبدأ بتتبّع أموالكم"
            desc="أضف أول عملية دخل أو مصروف لترى تدفّق أموالكم يظهر هنا."
            action={<Button onClick={() => openAdd()}>+ إضافة عملية</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="إجمالي الأموال" value={money(total, cur)} icon="Wallet" tone="brand" />
            <StatTile label="الدخل هذا الشهر" value={money(income, cur)} icon="TrendingUp" tone="pos" />
            <StatTile label="المصروفات" value={money(spent, cur)} icon="TrendingDown" tone="neg" />
            <StatTile label="المدّخر" value={money(saved, cur)} icon="Target" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Money flow */}
            <Card className="lg:col-span-1">
              <CardHeader title="تدفّق الأموال" sub="هذا الشهر" />
              <div className="space-y-2 p-5 pt-4">
                <FlowRow label="الدخل" value={money(income, cur)} tone="pos" />
                <FlowArrow />
                <FlowRow label="المصروفات" value={money(spent, cur)} tone="neg" />
                <FlowArrow />
                <FlowRow label="الادخار" value={money(saved, cur)} tone="ink" />
                <FlowArrow />
                <div className="rounded-xl bg-brand-soft p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-brand">المتبقّي</span>
                    <span className="tnum text-lg font-extrabold text-brand">{money(remaining, cur)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Spending by category */}
            <Card className="lg:col-span-2">
              <CardHeader
                title="الإنفاق حسب الفئة"
                action={<Link href="/expenses" className="text-xs font-semibold text-brand hover:underline">عرض الكل</Link>}
              />
              <div className="space-y-4 p-5 pt-4">
                {groups.length === 0 && <p className="py-6 text-center text-sm text-muted">لا مصروفات هذا الشهر بعد.</p>}
                {groups.slice(0, 6).map((g) => (
                  <CategoryBar
                    key={g.group}
                    name={g.group}
                    color={GROUP_COLOR[g.group] ?? "#64748b"}
                    spent={g.amount}
                    budget={groupBudget(g.group)}
                    currency={cur}
                  />
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Needs attention */}
            <Card className="lg:col-span-1">
              <CardHeader title="يحتاج انتباهك" />
              <div className="space-y-2 p-5 pt-4">
                {tips.length === 0 && <p className="py-4 text-center text-sm text-muted">كل شيء يبدو جيدًا ✨</p>}
                {tips.map((t, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-xl bg-surface-2 p-3">
                    {t.tone === "warn" ? (
                      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warn" />
                    ) : t.tone === "good" ? (
                      <CircleCheck size={16} className="mt-0.5 shrink-0 text-pos" />
                    ) : (
                      <Info size={16} className="mt-0.5 shrink-0 text-muted" />
                    )}
                    <p className="text-sm text-ink">{t.text}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Upcoming */}
            <Card className="lg:col-span-1">
              <CardHeader title="قادم قريبًا" action={<Link href="/bills" className="text-xs font-semibold text-brand hover:underline">الفواتير</Link>} />
              <div className="p-3">
                {upcoming.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">لا فواتير قادمة خلال أسبوعين.</p>
                ) : (
                  upcoming.slice(0, 5).map((u) => (
                    <div key={u.bill.id} className="flex items-center justify-between px-2 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-ink">{u.bill.name}</p>
                        <p className="text-xs text-muted">يوم {u.bill.dueDay} من الشهر</p>
                      </div>
                      <div className="text-left">
                        <p className="tnum text-sm font-bold text-ink">{money(u.bill.amount, cur)}</p>
                        {u.status === "due_soon" && <Badge tone="warn">قريبًا</Badge>}
                        {u.status === "overdue" && <Badge tone="neg">متأخّرة</Badge>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Recent activity */}
            <Card className="lg:col-span-1">
              <CardHeader title="آخر العمليات" action={<Link href="/transactions" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">الكل <ArrowLeft size={13} /></Link>} />
              <div className="p-3">
                {recent.map((t) => (
                  <TxRow key={t.id} tx={t} category={cat(t.categoryId)} member={mem(t.memberId)} currency={cur} onClick={() => {}} />
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function FlowRow({ label, value, tone }: { label: string; value: string; tone: "pos" | "neg" | "ink" }) {
  const c = { pos: "text-pos", neg: "text-neg", ink: "text-ink" }[tone];
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className={`tnum text-base font-bold ${c}`}>{value}</span>
    </div>
  );
}
function FlowArrow() {
  return (
    <div className="flex justify-center">
      <ArrowDown size={16} className="text-faint" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
      </div>
    </div>
  );
}
