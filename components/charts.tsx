"use client";

// Small charts drawn with plain HTML/SVG — no chart library needed.
// They take the app's real numbers and adapt to any width.

import React, { useState } from "react";
import clsx from "clsx";
import { money, compact } from "@/lib/format";
import type { CurrencyCode } from "@/lib/types";

export interface FlowPoint {
  key: string; // yyyy-mm
  label: string; // short month name
  income: number;
  expense: number;
}

/** Income vs. spending per month. Tap or hover a month to read it; click to open it. */
export function CashflowChart({
  data,
  currency,
  activeKey,
  onSelect,
}: {
  data: FlowPoint[];
  currency: CurrencyCode;
  activeKey: string;
  onSelect?: (key: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)));
  const shown = data.find((d) => d.key === (hover ?? activeKey)) ?? data[data.length - 1];
  const net = shown.income - shown.expense;

  return (
    <div>
      {/* the selected month, in words — also what a screen reader hears */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs" aria-live="polite">
        <span className="flex items-center gap-1.5 text-muted">
          <span className="h-2 w-2 rounded-sm bg-brand" />
          الدخل <b className="tnum font-semibold text-ink">{money(shown.income, currency)}</b>
        </span>
        <span className="flex items-center gap-1.5 text-muted">
          <span className="h-2 w-2 rounded-sm bg-faint" />
          المصروفات <b className="tnum font-semibold text-ink">{money(shown.expense, currency)}</b>
        </span>
        <span className="text-muted">
          الصافي{" "}
          <b className={clsx("tnum font-semibold", net >= 0 ? "text-pos" : "text-neg")}>{money(net, currency, { sign: true })}</b>
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        {/* axis */}
        <div className="flex h-36 w-9 shrink-0 flex-col justify-between text-[10px] text-faint md:h-48" aria-hidden>
          <span className="tnum -translate-y-1.5">{compact(max)}</span>
          <span className="tnum">{compact(max / 2)}</span>
          <span className="tnum translate-y-1.5">0</span>
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-36 flex-col justify-between md:h-48" aria-hidden>
            <span className="border-t border-dashed border-border" />
            <span className="border-t border-dashed border-border" />
            <span className="border-t border-border" />
          </div>

          <div className="relative flex" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => {
              const active = d.key === activeKey;
              const lit = d.key === shown.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onMouseEnter={() => setHover(d.key)}
                  onFocus={() => setHover(d.key)}
                  onBlur={() => setHover(null)}
                  onClick={() => onSelect?.(d.key)}
                  aria-label={`${d.label}: الدخل ${money(d.income, currency)}، المصروفات ${money(d.expense, currency)}`}
                  aria-pressed={active}
                  className="group flex min-w-0 flex-1 flex-col items-center"
                >
                  <span className={clsx("flex h-36 w-full items-end justify-center gap-[3px] rounded-lg px-1 transition-colors md:h-48 md:gap-1", lit && "bg-surface-2")}>
                    <Bar value={d.income} max={max} className="bg-brand" delay={i * 40} dim={!lit} />
                    <Bar value={d.expense} max={max} className="bg-faint" delay={i * 40 + 20} dim={!lit} />
                  </span>
                  <span className={clsx("mt-2 w-full truncate text-center text-[10px] md:text-xs", active ? "font-bold text-ink" : "text-muted")}>{d.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({ value, max, className, delay, dim }: { value: number; max: number; className: string; delay: number; dim: boolean }) {
  const pct = value > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <span
      className={clsx("animate-bar w-full max-w-[18px] rounded-t-[4px] md:max-w-[26px] transition-opacity", className, dim && "opacity-55")}
      style={{ height: `${pct}%`, animationDelay: `${delay}ms` }}
    />
  );
}

export interface Slice {
  name: string;
  amount: number;
  color: string;
  note?: string;
}

/** Share of spending by category group, with the legend as the readable part. */
export function DonutChart({ slices, currency, totalLabel }: { slices: Slice[]; currency: CurrencyCode; totalLabel: string }) {
  const total = slices.reduce((s, x) => s + x.amount, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  const gap = slices.length > 1 ? 2 : 0;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col 2xl:flex-row">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={`${totalLabel}: ${money(total, currency)}`}>
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="11" />
          {total > 0 &&
            slices.map((s) => {
              const len = (s.amount / total) * C;
              const el = (
                <circle
                  key={s.name}
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="11"
                  strokeDasharray={`${Math.max(0.5, len - gap)} ${C}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] text-muted">{totalLabel}</span>
          <span className="tnum text-lg font-bold tracking-tight text-ink">{money(total, currency)}</span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-2.5">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-2.5 text-[13px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate font-medium text-ink">
              {s.name}
              {s.note && <span className="mr-1.5 text-xs font-normal text-faint">{s.note}</span>}
            </span>
            <span className="tnum text-xs text-faint">{total > 0 ? Math.round((s.amount / total) * 100) : 0}%</span>
            <span className="tnum w-16 shrink-0 text-left font-semibold text-ink">{money(s.amount, currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
