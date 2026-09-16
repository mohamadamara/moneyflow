"use client";

import React from "react";
import clsx from "clsx";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-border bg-surface shadow-card",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  sub,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div>
        <h3 className="text-[15px] font-bold text-ink">{title}</h3>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

type BtnVariant = "primary" | "ghost" | "outline" | "danger" | "soft";
type BtnSize = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: {
  variant?: BtnVariant;
  size?: BtnSize;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50 disabled:pointer-events-none";
  const sizes: Record<BtnSize, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-[15px]",
  };
  const variants: Record<BtnVariant, string> = {
    primary: "bg-brand text-white hover:opacity-90",
    danger: "bg-neg text-white hover:opacity-90",
    outline: "border border-border bg-surface text-ink hover:bg-surface-2",
    ghost: "text-muted hover:bg-surface-2 hover:text-ink",
    soft: "bg-brand-soft text-brand hover:brightness-95",
  };
  return (
    <button className={clsx(base, sizes[size], variants[variant], className)} {...rest}>
      {children}
    </button>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "pos" | "neg" | "warn" | "brand";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    pos: "bg-pos-soft text-pos",
    neg: "bg-neg-soft text-neg",
    warn: "bg-warn-soft text-warn",
    brand: "bg-brand-soft text-brand",
  };
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function Progress({
  value,
  tone = "brand",
}: {
  value: number; // 0..1 (can exceed 1)
  tone?: "brand" | "pos" | "warn" | "neg";
}) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const colors = {
    brand: "bg-brand",
    pos: "bg-pos",
    warn: "bg-warn",
    neg: "bg-neg",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={clsx("h-full rounded-full transition-all", colors[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">
          {icon}
        </div>
      )}
      <div>
        <p className="font-bold text-ink">{title}</p>
        {desc && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} />;
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
