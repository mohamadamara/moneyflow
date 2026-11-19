"use client";

// Everything you added in one month, newest first, grouped by day.

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { useUI } from "@/components/quick-add";
import { MonthSwitch } from "@/components/shell";
import { activeTx, inMonth } from "@/lib/calc";
import { money, relativeDay } from "@/lib/format";
import { Card, Button, EmptyState, Skeleton } from "@/components/ui";
import { TxList } from "@/components/tx-list";
import { TxDetail } from "@/components/tx-detail";
import type { Transaction } from "@/lib/types";

type Filter = "" | "expense" | "income" | "shared";

export default function TransactionsPage() {
  const { db, ready, month } = useStore();
  const { openAdd } = useUI();
  const cur = db.household.currency;
  const many = db.household.members.length > 1;

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("");
  const [selected, setSelected] = useState<Transaction | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return activeTx(db)
      .filter((t) => inMonth(t, month))
      .filter((t) => {
        if (filter === "shared") return t.type === "expense" && (t.ownership === "shared" || t.ownership === "split");
        return filter ? t.type === filter : true;
      })
      .filter((t) => (term ? `${t.merchant} ${t.notes ?? ""}`.toLowerCase().includes(term) : true))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1));
  }, [db, q, filter, month]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of list) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    return [...map.entries()];
  }, [list]);

  if (!ready) return <Skeleton className="h-96 rounded-3xl" />;

  const total = list.reduce((s, t) => s + (t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0), 0);
  const filters: [Filter, string][] = [
    ["", "الكل"],
    ["expense", "مصروف"],
    ["income", "دخل"],
    ...(many ? ([["shared", "مشترك"]] as [Filter, string][]) : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <MonthSwitch />
      </div>

      <label className="flex h-12 items-center gap-2 rounded-2xl bg-surface px-4 shadow-card">
        <Search size={18} className="shrink-0 text-faint" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث…"
          aria-label="بحث"
          className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-faint"
        />
      </label>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {filters.map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setFilter(val)}
            className={clsx(
              "tap shrink-0 rounded-full px-4 py-2 text-sm font-bold",
              filter === val ? "bg-ink text-bg" : "bg-surface text-muted shadow-card"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            title={q || filter ? "لا نتائج" : "لا شيء في هذا الشهر"}
            desc={q || filter ? "جرّب كلمة أخرى أو اختر «الكل»." : "اضغط + لإضافة مصروف أو دخل."}
            action={!q && !filter ? <Button onClick={() => openAdd()}>+ إضافة</Button> : undefined}
          />
        </Card>
      ) : (
        <>
          <p className="px-1 text-xs text-muted">
            {list.length} عملية ·{" "}
            <b className={clsx("tnum", total >= 0 ? "text-pos" : "text-ink")}>{money(total, cur, { sign: true })}</b>
          </p>
          {groups.map(([day, items]) => (
            <section key={day}>
              <p className="mb-1.5 px-1 text-xs font-bold text-muted">{relativeDay(day)}</p>
              <Card className="px-3 py-1">
                <TxList items={items} onSelect={setSelected} />
              </Card>
            </section>
          ))}
        </>
      )}

      <TxDetail tx={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
