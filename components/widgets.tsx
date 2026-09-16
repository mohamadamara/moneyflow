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
}: {
  label: string;
  value: string;
  tone?: "ink" | "pos" | "neg" | "brand";
  icon?: string;
  hint?: string;
}) {
  const toneCls = {
    ink: "text-ink",
    pos: "text-pos",
    neg: "text-neg",
    brand: "text-brand",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted">{label}</p>
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-2 text-muted">
            <Icon name={icon} size={15} />
          </span>
        )}
      </div>
      <p className={clsx("tnum text-2xl font-extrabold", toneCls)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
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
      className="flex h-9 w-9 items-center justify-center rounded-xl"
      style={{ background: (category?.color ?? "#64748b") + "22", color: category?.color ?? "#64748b" }}
    >
      <Icon name={category?.icon ?? "Ellipsis"} size={17} />
    </span>
  );
}

export function TxRow({
  tx,
  category,
  member,
  currency,
  onClick,
}: {
  tx: Transaction;
  category?: Category;
  member?: Member;
  currency: CurrencyCode;
  onClick?: () => void;
}) {
  const isIncome = tx.type === "income";
  const isTransfer = tx.type === "transfer";
  const amountStr = isTransfer
    ? money(tx.amount, currency)
    : money(isIncome ? tx.amount : -tx.amount, currency, { sign: true });
  const ownLabel =
    tx.ownership === "shared" ? "مشترك" : tx.ownership === "split" ? "مقسّم" : member?.name ?? "";

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-2 py-2.5 text-right transition-colors hover:bg-surface-2 rounded-xl"
    >
      {isTransfer ? (
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-muted">
          <Icon name="ArrowLeftRight" size={17} />
        </span>
      ) : (
        <CategoryDot category={category} />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{tx.merchant}</p>
        <p className="truncate text-xs text-muted">
          {fmtShort(tx.date)}
          {category ? ` · ${category.name}` : ""}
          {ownLabel ? ` · ${ownLabel}` : ""}
        </p>
      </div>
      <span
        className={clsx(
          "tnum shrink-0 text-sm font-bold",
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
