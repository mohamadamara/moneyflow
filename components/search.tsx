"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { Modal, Input } from "./form";
import { useStore } from "@/lib/store";
import { activeTx } from "@/lib/calc";
import { money, fmtShort } from "@/lib/format";
import { Icon } from "./icon";

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return { tx: [], bills: [], subs: [], goals: [] };
    const match = (s?: string) => (s ?? "").toLowerCase().includes(term);
    return {
      tx: activeTx(db).filter((t) => match(t.merchant) || match(t.notes)).slice(0, 8),
      bills: db.bills.filter((b) => match(b.name)).slice(0, 4),
      subs: db.subscriptions.filter((s) => match(s.name)).slice(0, 4),
      goals: db.goals.filter((g) => match(g.name)).slice(0, 4),
    };
  }, [q, db]);

  function go(href: string) {
    onClose();
    setQ("");
    router.push(href);
  }

  const empty = q.trim() && !results.tx.length && !results.bills.length && !results.subs.length && !results.goals.length;

  return (
    <Modal open={open} onClose={onClose} title="بحث" wide>
      <div className="relative mb-4">
        <SearchIcon size={16} className="pointer-events-none absolute inset-y-0 right-3.5 my-auto text-muted" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن معاملة، فاتورة، اشتراك…" className="pr-9" />
      </div>

      {!q.trim() && <p className="py-6 text-center text-sm text-muted">اكتب للبحث في كل بياناتك المالية.</p>}
      {empty && <p className="py-6 text-center text-sm text-muted">لا توجد نتائج مطابقة لـ «{q}».</p>}

      <div className="space-y-4">
        {results.tx.length > 0 && (
          <Group title="المعاملات">
            {results.tx.map((t) => (
              <button key={t.id} onClick={() => go("/transactions")} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-right hover:bg-surface-2">
                <span className="text-sm text-ink">{t.merchant}</span>
                <span className="tnum text-sm text-muted">{fmtShort(t.date)} · {money(t.type === "income" ? t.amount : -t.amount, db.household.currency, { sign: true })}</span>
              </button>
            ))}
          </Group>
        )}
        {results.bills.length > 0 && (
          <Group title="الفواتير">
            {results.bills.map((b) => (
              <button key={b.id} onClick={() => go("/bills")} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-right hover:bg-surface-2">
                <span className="flex items-center gap-2 text-sm text-ink"><Icon name="Receipt" size={15} /> {b.name}</span>
                <span className="tnum text-sm text-muted">{money(b.amount, db.household.currency)}</span>
              </button>
            ))}
          </Group>
        )}
        {results.subs.length > 0 && (
          <Group title="الاشتراكات">
            {results.subs.map((s) => (
              <button key={s.id} onClick={() => go("/subscriptions")} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-right hover:bg-surface-2">
                <span className="flex items-center gap-2 text-sm text-ink"><Icon name="Repeat" size={15} /> {s.name}</span>
                <span className="tnum text-sm text-muted">{money(s.amount, db.household.currency)}</span>
              </button>
            ))}
          </Group>
        )}
        {results.goals.length > 0 && (
          <Group title="أهداف الادخار">
            {results.goals.map((g) => (
              <button key={g.id} onClick={() => go("/goals")} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-right hover:bg-surface-2">
                <span className="flex items-center gap-2 text-sm text-ink"><Icon name="Target" size={15} /> {g.name}</span>
              </button>
            ))}
          </Group>
        )}
      </div>
    </Modal>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wide text-faint">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
