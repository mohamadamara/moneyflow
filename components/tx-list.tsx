"use client";

// One list of transactions, two shapes:
//  · phones  → large tappable rows
//  · tablets and up → a compact table
// Every page that lists transactions uses this, so they all look and behave the same.

import React from "react";
import clsx from "clsx";
import { ArrowLeftRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { money, relativeDay } from "@/lib/format";
import { TxRow, CategoryDot, MemberChip } from "./widgets";
import type { Transaction } from "@/lib/types";

export function TxList({
  items,
  onSelect,
  hideDate,
  hideHead,
}: {
  items: Transaction[];
  onSelect: (t: Transaction) => void;
  hideDate?: boolean; // when the list is already grouped by day
  hideHead?: boolean;
}) {
  const { db } = useStore();
  const cur = db.household.currency;
  const cat = (id?: string) => db.categories.find((c) => c.id === id);
  const mem = (id?: string) => db.household.members.find((m) => m.id === id);
  const th = "px-3 pb-2 font-medium";

  return (
    <>
      <div className="md:hidden">
        {items.map((t) => (
          <TxRow key={t.id} tx={t} category={cat(t.categoryId)} member={mem(t.memberId)} currency={cur} onClick={() => onSelect(t)} />
        ))}
      </div>

      <table className="hidden w-full table-fixed text-[13px] md:table">
        <thead className={clsx(hideHead && "sr-only")}>
          <tr className="text-right text-[11px] text-faint">
            <th className={th}>العملية</th>
            <th className={clsx(th, "w-[22%]")}>الفئة</th>
            <th className={clsx(th, "hidden w-[18%] xl:table-cell")}>لمن</th>
            {!hideDate && <th className={clsx(th, "w-[18%]")}>التاريخ</th>}
            <th className={clsx(th, "w-[19%] text-left")}>المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t, i) => {
            const c = cat(t.categoryId);
            const isIncome = t.type === "income";
            const isTransfer = t.type === "transfer";
            return (
              <tr
                key={t.id}
                tabIndex={0}
                role="button"
                onClick={() => onSelect(t)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(t);
                  }
                }}
                className={clsx("cursor-pointer transition-colors hover:bg-surface-2", (i > 0 || !hideHead) && "border-t border-border")}
              >
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2.5">
                    {isTransfer ? (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
                        <ArrowLeftRight size={16} />
                      </span>
                    ) : (
                      <span className="shrink-0">
                        <CategoryDot category={c} />
                      </span>
                    )}
                    <span className="truncate font-semibold text-ink">{t.merchant || (isTransfer ? "تحويل" : "—")}</span>
                  </span>
                </td>
                <td className="truncate px-3 py-2 text-muted">{c?.name ?? (isTransfer ? "تحويل بين الحسابات" : "—")}</td>
                <td className="hidden truncate px-3 py-2 xl:table-cell">
                  {t.ownership === "split" ? (
                    <span className="text-xs text-muted">مقسّم</span>
                  ) : (
                    <MemberChip member={t.ownership === "shared" ? undefined : mem(t.memberId)} />
                  )}
                </td>
                {!hideDate && <td className="truncate px-3 py-2 text-muted">{relativeDay(t.date)}</td>}
                <td className={clsx("tnum truncate px-3 py-2 text-left font-semibold", isTransfer ? "text-muted" : isIncome ? "text-pos" : "text-ink")}>
                  {isTransfer ? money(t.amount, cur) : money(isIncome ? t.amount : -t.amount, cur, { sign: true })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
