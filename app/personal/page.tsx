"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { activeTx, inMonth, memberSpending, memberIncome, budgetStatus } from "@/lib/calc";
import { money } from "@/lib/format";
import { PageTitle, Card, CardHeader, Skeleton, Progress } from "@/components/ui";
import { StatTile, TxRow } from "@/components/widgets";
import { Select } from "@/components/form";
import { TxDetail } from "@/components/tx-detail";
import type { Transaction } from "@/lib/types";

export default function PersonalPage() {
  const { db, ready, month } = useStore();
  const cur = db.household.currency;
  const [memberId, setMemberId] = useState(db.household.members[0]?.id ?? "");
  const [sel, setSel] = useState<Transaction | null>(null);

  if (!ready) return <Skeleton className="h-96 rounded-2xl" />;

  const spending = memberSpending(db, month, memberId);
  const income = memberIncome(db, month, memberId);
  const personalBudget = db.budgets.find((b) => b.scope === "personal" && b.memberId === memberId);
  const bStatus = personalBudget ? budgetStatus(db, personalBudget, month) : null;

  // member's own personal transactions + splits they're in
  const myTx = activeTx(db)
    .filter((t) => t.type === "expense" && inMonth(t, month))
    .filter((t) => t.memberId === memberId || t.ownership === "shared" || t.splits?.some((s) => s.memberId === memberId))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 12);

  const cat = (id?: string) => db.categories.find((c) => c.id === id);
  const mem = (id?: string) => db.household.members.find((m) => m.id === id);

  const sharedContribution = activeTx(db)
    .filter((t) => t.type === "expense" && t.ownership === "shared" && inMonth(t, month))
    .reduce((s, t) => s + t.amount / Math.max(1, db.household.members.length), 0);

  return (
    <div>
      <PageTitle
        title="إنفاقي الشخصي"
        sub="أموالي — منفصلة عن أموالنا المشتركة"
        action={
          <Select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="!w-auto">
            {db.household.members.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </Select>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="إنفاقي هذا الشهر" value={money(spending, cur)} tone="neg" icon="TrendingDown" />
        <StatTile label="دخلي" value={money(income, cur)} tone="pos" icon="TrendingUp" />
        <StatTile label="ميزانيتي الشخصية" value={personalBudget ? money(personalBudget.amount, cur) : "—"} icon="PieChart" />
        <StatTile label="مساهمتي المشتركة" value={money(sharedContribution, cur)} icon="Users" />
      </div>

      {bStatus && (
        <Card className="mb-6 p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-bold text-ink">ميزانيتي الشخصية</p>
            <span className="tnum text-sm text-muted">{money(bStatus.spent, cur)} / {money(bStatus.budget.amount, cur)}</span>
          </div>
          <Progress value={bStatus.ratio} tone={bStatus.level === "ok" ? "pos" : bStatus.level === "warn" ? "warn" : "neg"} />
        </Card>
      )}

      <Card>
        <CardHeader title="آخر مصروفاتي" />
        <div className="p-3">
          {myTx.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">لا مصروفات شخصية هذا الشهر.</p>
          ) : (
            myTx.map((t) => <TxRow key={t.id} tx={t} category={cat(t.categoryId)} member={mem(t.memberId)} currency={cur} onClick={() => setSel(t)} />)
          )}
        </div>
      </Card>

      <TxDetail tx={sel} onClose={() => setSel(null)} />
    </div>
  );
}
