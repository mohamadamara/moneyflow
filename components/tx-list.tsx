"use client";

// One list of transactions, used on every page that shows them.

import React from "react";
import { useStore } from "@/lib/store";
import { TxRow } from "./widgets";
import type { Transaction } from "@/lib/types";

export function TxList({ items, onSelect }: { items: Transaction[]; onSelect: (t: Transaction) => void }) {
  const { db } = useStore();
  const cur = db.household.currency;
  const many = db.household.members.length > 1;
  const cat = (id?: string) => db.categories.find((c) => c.id === id);
  const mem = (id?: string) => db.household.members.find((m) => m.id === id);
  return (
    <div className="divide-y divide-border">
      {items.map((t) => (
        <TxRow
          key={t.id}
          tx={t}
          category={cat(t.categoryId)}
          member={mem(t.memberId)}
          currency={cur}
          showWho={many}
          onClick={() => onSelect(t)}
        />
      ))}
    </div>
  );
}
