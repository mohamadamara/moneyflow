import type { CurrencyCode } from "./types";

const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  ILS: "₪",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

// We keep Western digits (0-9) but Arabic labels — this is the most
// common preference for finance apps in Arabic-speaking markets and
// keeps numbers scannable. Change `numberingSystem` to "arab" for ٠١٢٣.
const NF = new Intl.NumberFormat("ar-EG-u-nu-latn", {
  maximumFractionDigits: 0,
});
const NF2 = new Intl.NumberFormat("ar-EG-u-nu-latn", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(
  amount: number,
  currency: CurrencyCode = "ILS",
  opts?: { sign?: boolean; decimals?: boolean }
): string {
  const sym = CURRENCY_SYMBOL[currency] ?? "₪";
  const abs = Math.abs(amount);
  const body = opts?.decimals ? NF2.format(abs) : NF.format(Math.round(abs));
  const signStr = opts?.sign ? (amount < 0 ? "−" : "+") : amount < 0 ? "−" : "";
  return `${signStr}${sym}${body}`;
}

export function num(n: number): string {
  return NF.format(n);
}

export function percent(n: number): string {
  return `${NF.format(Math.round(n))}%`;
}

const DAY = new Intl.DateTimeFormat("ar", { weekday: "long" });
const FULL = new Intl.DateTimeFormat("ar", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const SHORT = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long" });
const MONTH = new Intl.DateTimeFormat("ar", { month: "long", year: "numeric" });

export function fmtDate(iso: string): string {
  return FULL.format(new Date(iso));
}
export function fmtShort(iso: string): string {
  return SHORT.format(new Date(iso));
}
export function fmtMonth(iso: string): string {
  return MONTH.format(new Date(iso));
}
export function fmtDay(iso: string): string {
  return DAY.format(new Date(iso));
}

export function relativeDay(iso: string): string {
  const today = new Date();
  const d = new Date(iso);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const t1 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((t1.getTime() - t0.getTime()) / 86400000);
  if (diff === 0) return "اليوم";
  if (diff === -1) return "أمس";
  if (diff === 1) return "غدًا";
  if (diff < 0 && diff > -7) return `قبل ${Math.abs(diff)} أيام`;
  if (diff > 0 && diff < 7) return `بعد ${diff} أيام`;
  return fmtShort(iso);
}
