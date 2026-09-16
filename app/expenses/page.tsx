"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/components/quick-add";
import { activeTx, inMonth, monthlyExpense, spendingByGroup } from "@/lib/calc";
import { money, percent } from "@/lib/format";
import { PageTitle, Card, CardHeader, Button, EmptyState, Skeleton } from "@/components/ui";
import { TxRow } from "@/components/widgets";
import { TxDetail } from "@/components/tx-detail";
import { DEFAULT_CATEGORIES } from "@/lib/data/categories";
import type { Transaction } from "@/lib/types";

const GROUP_COLOR: Record<string, string> = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.group, c.color]));

export default function ExpensesPage() {
  const { db, ready, month } = useStore();
  const { openAdd } = useUI();
  const cur = db.household.currency;
  const [sel, setSel] = useState<Transaction | null>(null);
  const [group, setGroup] = useState<string | null>(null);

  if (!ready) return <Skeleton className="h-96 rounded-2xl" />;

  const total = monthlyExpense(db, month);
  const groups = spendingByGroup(db, month);
  const cat = (id?: string) => db.categories.find((c) => c.id === id);
  const mem = (id?: string) => db.household.members.find((m) => m.id === id);

  const list = activeTx(db)
    .filter((t) => t.type === "expense" && inMonth(t, month))
    .filter((t) => (group ? cat(t.categoryId)?.group === group : true))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div>
      <PageTitle title="المصروفات" sub={`إجمالي إنفاق ${money(total, cur)} هذا الشهر`} action={<Button onClick={() => openAdd("expense")}>+ مصروف</Button>} />

      {total === 0 ? (
        <Card>
          <EmptyState title="لا مصروفات هذا الشهر" desc="أضف مصروفًا لترى إلى أين تذهب أموالكم." action={<Button onClick={() => openAdd("expense")}>+ إضافة مصروف</Button>} />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="حسب الفئة" sub="اضغط لعرض المعاملات" />
            <div className="space-y-1 p-3">
              <button onClick={() => setGroup(null)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-right ${!group ? "bg-brand-soft" : "hover:bg-surface-2"}`}>
                <span className="text-sm font-bold text-ink">الكل</span>
                <span className="tnum text-sm font-bold text-ink">{money(total, cur)}</span>
              </button>
              {groups.map((g) => (
                <button key={g.group} onClick={() => setGroup(g.group)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-right ${group === g.group ? "bg-brand-soft" : "hover:bg-surface-2"}`}>
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: GROUP_COLOR[g.group] ?? "#64748b" }} />
                    {g.group}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-faint">{percent((g.amount / total) * 100)}</span>
                    <span className="tnum text-sm font-bold text-ink">{money(g.amount, cur)}</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title={group ? `معاملات: ${group}` : "كل المعاملات"} sub={`${list.length} عملية`} />
            <div className="p-3">
              {list.map((t) => (
                <TxRow key={t.id} tx={t} category={cat(t.categoryId)} member={mem(t.memberId)} currency={cur} onClick={() => setSel(t)} />
              ))}
            </div>
          </Card>
        </div>
      )}

      <TxDetail tx={sel} onClose={() => setSel(null)} />
    </div>
  );
}
