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
    <div className="flex items-start justify-between gap-3 px-4 pt-4 md:px-5 md:pt-5">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
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
    "tap inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl font-semibold disabled:opacity-50 disabled:pointer-events-none";
  const sizes: Record<BtnSize, string> = {
    // comfortable for thumbs on phones, compact with a mouse
    sm: "h-10 px-3.5 text-[13px] md:h-8 md:px-3 md:text-xs",
    md: "h-11 px-4 text-sm md:h-9 md:px-3.5 md:text-[13px]",
    lg: "h-12 px-5 text-[15px] md:h-11",
  };
  const variants: Record<BtnVariant, string> = {
    primary: "bg-brand text-on-brand hover:opacity-90",
    danger: "bg-neg text-on-brand hover:opacity-90",
    outline: "border border-border-strong bg-surface text-ink shadow-card hover:bg-surface-2",
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
    <span className={clsx("inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold", tones[tone])}>
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
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={clsx("h-full rounded-full transition-all duration-500", colors[tone])} style={{ width: `${pct}%` }} />
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
    // On phones the top bar already shows the page name, so the big
    // heading only appears from tablet size up.
    <div className={clsx("mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6 md:items-end", !sub && !action && "max-md:hidden")}>
      <div className="min-w-0">
        <h1 className="hidden text-[22px] font-bold leading-tight tracking-tight text-ink md:block">{title}</h1>
        {sub && <p className="text-[13px] text-muted md:mt-1 md:text-sm">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
