"use client";

import { Download } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  monthlyIncome,
  monthlyExpense,
  monthlySavings,
  monthlyRemaining,
  spendingByGroup,
  memberSpending,
  addMonths,
} from "@/lib/calc";
import { money, fmtMonth, percent } from "@/lib/format";
import { PageTitle, Card, CardHeader, Button, Skeleton } from "@/components/ui";
import { transactionsToCSV, downloadText } from "@/lib/csv";
import { DEFAULT_CATEGORIES } from "@/lib/data/categories";

const GROUP_COLOR: Record<string, string> = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.group, c.color]));

function Delta({ now, prev }: { now: number; prev: number }) {
  if (prev === 0) return <span className="text-xs text-faint">—</span>;
  const d = ((now - prev) / prev) * 100;
  const up = d > 0;
  return (
    <span className={`text-xs font-semibold ${up ? "text-neg" : "text-pos"}`}>
      {up ? "▲" : "▼"} {percent(Math.abs(d))}
    </span>
  );
}

export default function ReportsPage() {
  const { db, ready, month } = useStore();
  const cur = db.household.currency;

  if (!ready) return <Skeleton className="h-96 rounded-2xl" />;

  const prev = addMonths(month, -1);
  const inc = monthlyIncome(db, month);
  const exp = monthlyExpense(db, month);
  const sav = monthlySavings(db, month);
  const rem = monthlyRemaining(db, month);

  const incP = monthlyIncome(db, prev);
  const expP = monthlyExpense(db, prev);

  const groups = spendingByGroup(db, month);
  const groupsPrev = new Map(spendingByGroup(db, prev).map((g) => [g.group, g.amount]));

  const rows: { label: string; now: number; prev: number; tone?: string }[] = [
    { label: "الدخل", now: inc, prev: incP, tone: "text-pos" },
    { label: "المصروفات", now: exp, prev: expP, tone: "text-neg" },
    { label: "الادخار", now: sav, prev: monthlySavings(db, prev) },
    { label: "المتبقّي", now: rem, prev: monthlyRemaining(db, prev), tone: "text-brand" },
  ];

  return (
    <div>
      <PageTitle
        title="التقارير"
        sub={`${fmtMonth(`${month}-01`)} · مقارنةً بـ ${fmtMonth(`${prev}-01`)}`}
        action={
          <Button variant="outline" onClick={() => downloadText(`ميزان-${month}.csv`, transactionsToCSV(db))}>
            <Download size={16} /> تصدير CSV
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader title="ملخّص الشهر" sub="الأرقام مقابل الشهر السابق" />
        <div className="divide-y divide-border px-5 pb-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-3">
              <span className="text-sm font-semibold text-muted">{r.label}</span>
              <div className="flex items-center gap-3">
                <Delta now={r.now} prev={r.prev} />
                <span className={`tnum w-28 text-left text-base font-extrabold ${r.tone ?? "text-ink"}`}>{money(r.now, cur)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="الإنفاق حسب الفئة" />
          <div className="space-y-3 p-5 pt-4">
            {groups.length === 0 && <p className="py-4 text-center text-sm text-muted">لا مصروفات.</p>}
            {groups.map((g) => (
              <div key={g.group}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: GROUP_COLOR[g.group] ?? "#64748b" }} />
                    {g.group}
                  </span>
                  <span className="flex items-center gap-2">
                    <Delta now={g.amount} prev={groupsPrev.get(g.group) ?? 0} />
                    <span className="tnum text-muted">{money(g.amount, cur)}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="الإنفاق حسب الشخص" />
          <div className="space-y-3 p-5 pt-4">
            {db.household.members.map((m) => {
              const now = memberSpending(db, month, m.id);
              const before = memberSpending(db, prev, m.id);
              return (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: m.color }}>{m.name.slice(0, 1)}</span>
                    {m.name}
                  </span>
                  <span className="flex items-center gap-2">
                    <Delta now={now} prev={before} />
                    <span className="tnum text-muted">{money(now, cur)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
