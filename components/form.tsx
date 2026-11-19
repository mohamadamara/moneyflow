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
    <div className={clsx("fixed inset-0 z-50 flex items-end justify-center", closing && "pointer-events-none")}>
      <div className={clsx("absolute inset-0 bg-black/40", closing ? "animate-fade-out" : "animate-fade")} onClick={onClose} />
      <div
        className={clsx(
          closing ? "animate-sheet-out" : "animate-sheet",
          "relative z-10 flex max-h-[92dvh] w-full max-w-[480px] flex-col rounded-t-[28px] bg-surface shadow-pop"
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong" aria-hidden />
        <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-2">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="tap -ml-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
  "h-12 w-full rounded-2xl border border-transparent bg-surface-2 px-4 text-base text-ink outline-none transition-colors placeholder:text-faint focus:border-brand focus:bg-surface";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, inputMode, ...rest }, ref) {
    // number fields open the phone's numeric keypad
    const mode = inputMode ?? (rest.type === "number" ? "decimal" : undefined);
    return <input ref={ref} inputMode={mode} className={clsx(inputCls, className)} {...rest} />;
  }
);

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea className={clsx(inputCls, "h-auto min-h-[80px] resize-y py-3", className)} {...rest} />;
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
    <div className="flex gap-1 rounded-2xl bg-surface-2 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={clsx(
              "tap flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
              active ? "bg-surface text-ink shadow-card" : "text-muted"
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
  const btn = "tap h-12 flex-1 rounded-2xl px-4 text-sm font-bold";
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex gap-2">
          <button className={clsx(btn, "bg-neg text-white")} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className={clsx(btn, "bg-surface-2 text-ink")} onClick={onCancel}>
            تراجع
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-muted">{message}</p>
    </Modal>
  );
}
