"use client";

import React, { useEffect } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 animate-fade" onClick={onClose} />
      <div
        className={clsx(
          "animate-pop relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-border bg-surface shadow-pop sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-border px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/20";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={clsx(inputCls, className)} {...rest} />;
  }
);

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea className={clsx(inputCls, "min-h-[80px] resize-y", className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(inputCls, "appearance-none", className)} {...rest}>
      {children}
    </select>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; tone?: "pos" | "neg" | "brand" }[];
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={clsx(
              "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
