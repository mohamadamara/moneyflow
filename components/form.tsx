"use client";

import React, { useEffect, useState } from "react";
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

  // keep the sheet mounted briefly after closing so it can slide away
  const [shown, setShown] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) {
      setShown(true);
      setClosing(false);
      return;
    }
    setClosing(true);
    const t = setTimeout(() => {
      setShown(false);
      setClosing(false);
    }, 180);
    return () => clearTimeout(t);
  }, [open]);

  if (!shown) return null;
  return (
    <div className={clsx("fixed inset-0 z-50 flex items-end justify-center sm:items-center", closing && "pointer-events-none")}>
      <div className={clsx("absolute inset-0 bg-black/40", closing ? "animate-fade-out" : "animate-fade")} onClick={onClose} />
      <div
        className={clsx(
          closing ? "animate-sheet-out" : "animate-sheet",
          "relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-border bg-surface shadow-pop sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" aria-hidden />
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3 sm:py-4">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="tap flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-2"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-border px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
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
  "w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-base text-ink sm:py-2.5 sm:text-sm outline-none transition-colors placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/20";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, inputMode, ...rest }, ref) {
    // number fields open the phone's numeric keypad
    const mode = inputMode ?? (rest.type === "number" ? "decimal" : undefined);
    return <input ref={ref} inputMode={mode} className={clsx(inputCls, className)} {...rest} />;
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
              "tap flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
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

/** Asks before anything that cannot be undone. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "حذف",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const btn = "tap h-11 flex-1 rounded-xl px-4 text-sm font-semibold md:h-9 md:text-[13px]";
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex gap-2">
          <button className={clsx(btn, "bg-neg text-on-brand hover:opacity-90")} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className={clsx(btn, "border border-border-strong bg-surface text-ink hover:bg-surface-2")} onClick={onCancel}>
            تراجع
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-muted">{message}</p>
    </Modal>
  );
}
