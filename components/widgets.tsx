"use client";

import React from "react";
import clsx from "clsx";
import { Icon } from "./icon";
import { money, fmtShort } from "@/lib/format";
import type { Category, CurrencyCode, Member, Transaction } from "@/lib/types";

export function StatTile({
  label,
  value,
  tone = "ink",
  icon,
  hint,
  delta,
}: {
  label: string;
  value: string;
  tone?: "ink" | "pos" | "neg" | "brand";
  icon?: string;
  hint?: string;
  delta?: React.ReactNode;
}) {
  const toneCls = {
    ink: "text-ink",
    pos: "text-pos",
    neg: "text-neg",
    brand: "text-brand",
  }[tone];
  return (
    <div className="min-w-0 rounded-3xl bg-surface p-4 shadow-card">
      <div className="mb-2 flex items-center gap-2 text-muted">
        {icon && <Icon name={icon} size={15} className="shrink-0" />}
        <p className="truncate text-xs font-medium">{label}</p>
      </div>
      <p className={clsx("tnum truncate text-xl font-bold tracking-tight", toneCls)}>{value}</p>
      {(hint || delta) && (
        <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted">
          {delta}
          {hint}
        </p>
      )}
    </div>
  );
}

// Change against the previous period. `goodWhenUp` says which
// direction is good news (income up = good, spending up = bad).
export function Delta({ now, prev, goodWhenUp = false }: { now: number; prev: number; goodWhenUp?: boolean }) {
  if (!prev) return null;
  const d = ((now - prev) / Math.abs(prev)) * 100;
  if (Math.abs(d) < 0.5) return <span className="font-semibold text-faint">بلا تغيير</span>;
  const up = d > 0;
  const good = up === goodWhenUp;
  return (
    <span className={clsx("tnum inline-flex items-center gap-0.5 font-semibold", good ? "text-pos" : "text-neg")}>
      <Icon name={up ? "ArrowUpRight" : "ArrowDownRight"} size={13} />
      {Math.round(Math.abs(d))}%
    </span>
  );
}

export function Avatar({ name, color, size = 28 }: { name: string; color?: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ background: color ?? "#64748b", width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden
    >
      {name.trim().slice(0, 1) || "؟"}
    </span>
  );
}

export function MemberChip({ member }: { member?: Member }) {
  if (!member) return <span className="text-xs text-muted">مشترك</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: member.color }}>
        {member.name.slice(0, 1)}
      </span>
      {member.name}
    </span>
  );
}

export function CategoryDot({ category }: { category?: Category }) {
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
      style={{ background: (category?.color ?? "#64748b") + "1f", color: category?.color ?? "#64748b" }}
    >
      <Icon name={category?.icon ?? "Ellipsis"} size={20} />
    </span>
  );
}

export function TxRow({
  tx,
  category,
  member,
  currency,
  onClick,
  showWho,
}: {
  tx: Transaction;
  category?: Category;
  member?: Member;
  currency: CurrencyCode;
  onClick?: () => void;
  showWho?: boolean; // only when the household has more than one person
}) {
  const isIncome = tx.type === "income";
  const isTransfer = tx.type === "transfer";
  const isShared = tx.ownership === "shared" || tx.ownership === "split";
  const amountStr = isTransfer
    ? money(tx.amount, currency)
    : money(isIncome ? tx.amount : -tx.amount, currency, { sign: true });
  const who = showWho && member ? (isShared ? `دفع ${member.name}` : member.name) : "";

  return (
    <button
      onClick={onClick}
      className="tap flex w-full items-center gap-3 rounded-2xl px-1 py-2.5 text-right active:bg-surface-2"
    >
      {isTransfer ? (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted">
          <Icon name="ArrowLeftRight" size={20} />
        </span>
      ) : (
        <CategoryDot category={category} />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-ink">{tx.merchant}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
          {isShared && showWho && (
            <span className="rounded-full bg-brand-soft px-2 py-px text-[10px] font-bold text-brand">مشترك</span>
          )}
          <span className="truncate">
            {category?.name ?? (isTransfer ? "تحويل" : fmtShort(tx.date))}
            {who ? ` · ${who}` : ""}
          </span>
        </p>
      </div>
      <span
        className={clsx(
          "tnum shrink-0 text-[15px] font-bold",
          isTransfer ? "text-muted" : isIncome ? "text-pos" : "text-ink"
        )}
      >
        {amountStr}
      </span>
    </button>
  );
}

export function CategoryBar({
  name,
  color,
  spent,
  budget,
  currency,
}: {
  name: string;
  color: string;
  spent: number;
  budget?: number;
  currency: CurrencyCode;
}) {
  const ratio = budget && budget > 0 ? spent / budget : 0;
  const over = ratio > 1;
  const pct = Math.min(100, ratio * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold text-ink">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          {name}
        </span>
        <span className="tnum text-muted">
          {money(spent, currency)}
          {budget ? <span className="text-faint"> / {money(budget, currency)}</span> : null}
        </span>
      </div>
      {budget ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div className={clsx("h-full rounded-full", over ? "bg-neg" : "")} style={{ width: `${pct}%`, background: over ? undefined : color }} />
        </div>
      ) : null}
    </div>
  );
}
