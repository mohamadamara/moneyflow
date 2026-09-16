"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/components/quick-add";
import { activeTx, inMonth, monthlyIncome } from "@/lib/calc";
import { money } from "@/lib/format";
import { PageTitle, Card, CardHeader, Button, EmptyState, Skeleton } from "@/components/ui";
import { StatTile, TxRow } from "@/components/widgets";
import { TxDetail } from "@/components/tx-detail";
import type { Transaction } from "@/lib/types";

export default function IncomePage() {
  const { db, ready, month } = useStore();
  const { openAdd } = useUI();
  const cur = db.household.currency;
  const [sel, setSel] = useState<Transaction | null>(null);

  if (!ready) return <Skeleton className="h-96 rounded-2xl" />;

  const income = activeTx(db).filter((t) => t.type === "income" && inMonth(t, month)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const total = monthlyIncome(db, month);
  const recurring = activeTx(db).filter((t) => t.type === "income" && t.recurrence === "monthly");
  const expected = recurring.reduce((s, t) => s + t.amount, 0);

  const cat = (id?: string) => db.categories.find((c) => c.id === id);
  const mem = (id?: string) => db.household.members.find((m) => m.id === id);

  // by member
  const byMember = db.household.members.map((m) => ({
    member: m,
    amount: income.filter((t) => t.memberId === m.id).reduce((s, t) => s + t.amount, 0),
  }));

  return (
    <div>
      <PageTitle title="الدخل" sub="من أين تأتي أموالكم" action={<Button onClick={() => openAdd("income")}>+ دخل</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="دخل هذا الشهر" value={money(total, cur)} tone="pos" icon="TrendingUp" />
        <StatTile label="الدخل المتوقّع شهريًا" value={money(expected, cur)} icon="Repeat" hint={`${recurring.length} مصدر متكرّر`} />
        {byMember.map((b) => (
          <StatTile key={b.member.id} label={`دخل ${b.member.name}`} value={money(b.amount, cur)} />
        ))}
      </div>

      <Card>
        <CardHeader title="عمليات الدخل" sub="هذا الشهر" />
        <div className="p-3">
          {income.length === 0 ? (
            <EmptyState title="لا دخل مسجّل هذا الشهر" desc="سجّل راتبك أو أي دخل آخر لترى صورة أموالكم كاملة." action={<Button onClick={() => openAdd("income")}>+ إضافة دخل</Button>} />
          ) : (
            income.map((t) => <TxRow key={t.id} tx={t} category={cat(t.categoryId)} member={mem(t.memberId)} currency={cur} onClick={() => setSel(t)} />)
          )}
        </div>
      </Card>

      <TxDetail tx={sel} onClose={() => setSel(null)} />
    </div>
  );
}
