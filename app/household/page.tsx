"use client";

import { useStore } from "@/lib/store";
import {
  monthlyIncome,
  monthlyExpense,
  monthlySavings,
  monthlyRemaining,
  memberSpending,
  sharedSpending,
} from "@/lib/calc";
import { money } from "@/lib/format";
import { PageTitle, Card, CardHeader, Skeleton } from "@/components/ui";
import { StatTile } from "@/components/widgets";
import { relativeDay } from "@/lib/format";

export default function HouseholdPage() {
  const { db, ready, month } = useStore();
  const cur = db.household.currency;

  if (!ready) return <Skeleton className="h-96 rounded-2xl" />;

  const income = monthlyIncome(db, month);
  const spent = monthlyExpense(db, month);
  const saved = monthlySavings(db, month);
  const remaining = monthlyRemaining(db, month);
  const shared = sharedSpending(db, month);

  const perMember = db.household.members.map((m) => ({ member: m, amount: memberSpending(db, month, m.id) }));
  const maxSpend = Math.max(shared, ...perMember.map((p) => p.amount), 1);

  const mem = (id?: string) => db.household.members.find((m) => m.id === id);

  return (
    <div>
      <PageTitle title="الميزانية المشتركة" sub={`أموالنا · ${db.household.name}`} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="دخل الأسرة" value={money(income, cur)} tone="pos" icon="TrendingUp" />
        <StatTile label="إنفاق الأسرة" value={money(spent, cur)} tone="neg" icon="TrendingDown" />
        <StatTile label="ادخار الأسرة" value={money(saved, cur)} icon="Target" />
        <StatTile label="المتبقّي" value={money(remaining, cur)} tone="brand" icon="Wallet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="من أنفق ماذا" sub="هذا الشهر" />
          <div className="space-y-4 p-5 pt-4">
            {perMember.map((p) => (
              <div key={p.member.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: p.member.color }}>{p.member.name.slice(0, 1)}</span>
                    {p.member.name}
                  </span>
                  <span className="tnum text-muted">{money(p.amount, cur)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${(p.amount / maxSpend) * 100}%`, background: p.member.color }} />
                </div>
              </div>
            ))}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold text-ink">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold text-muted">م</span>
                  مشترك
                </span>
                <span className="tnum text-muted">{money(shared, cur)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-faint" style={{ width: `${(shared / maxSpend) * 100}%` }} />
              </div>
            </div>
            <p className="pt-1 text-xs text-muted">حصة كل شخص من المصروفات المشتركة تُوزّع بالتساوي.</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="سجلّ نشاط الأسرة" />
          <div className="p-3">
            {db.activity.slice(0, 12).map((a) => {
              const m = mem(a.memberId);
              return (
                <div key={a.id} className="flex items-start gap-3 px-2 py-2.5">
                  <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: m?.color ?? "#94a0b4" }}>
                    {m ? m.name.slice(0, 1) : "•"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{m ? `${m.name}: ` : ""}{a.message}</p>
                    <p className="text-xs text-faint">{relativeDay(a.at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
