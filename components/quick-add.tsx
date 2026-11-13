"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, Loader2, ScanLine } from "lucide-react";
import { scanInvoice } from "@/lib/scan";
import { useStore } from "@/lib/store";
import { Modal, Field, Input, Select, Textarea } from "./form";
import { Button } from "./ui";
import { Icon } from "./icon";
import type { Ownership, TxType } from "@/lib/types";
import { accountKindLabel, activeTx } from "@/lib/calc";

interface UIContextValue {
  openAdd: (type?: TxType) => void;
}
const UIContext = createContext<UIContextValue | null>(null);
export const useUI = () => {
  const c = useContext(UIContext);
  if (!c) throw new Error("useUI outside provider");
  return c;
};

// Local calendar date (not UTC) so late-night entries land on the right day.
function localISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const CURRENCY_SYMBOL: Record<string, string> = { ILS: "₪", USD: "$", EUR: "€", GBP: "£" };

// Remember the last account / owner so the next entry needs fewer taps.
const PREFS_KEY = "hmos:quickadd";
function loadPrefs(): { accountId?: string; who?: string } {
  try {
    return JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function savePrefs(p: { accountId: string; who: string }) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

const TYPE_OPTIONS: { value: TxType; label: string; on: string }[] = [
  { value: "expense", label: "مصروف", on: "bg-neg-soft text-neg" },
  { value: "income", label: "دخل", on: "bg-pos-soft text-pos" },
  { value: "transfer", label: "تحويل", on: "bg-brand-soft text-brand" },
];

const VISIBLE_CATS = 8;

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TxType>("expense");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const value = useMemo<UIContextValue>(
    () => ({
      openAdd: (t) => {
        setType(t ?? "expense");
        setOpen(true);
      },
    }),
    []
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }, []);

  return (
    <UIContext.Provider value={value}>
      {children}
      <AddTransactionModal open={open} onClose={() => setOpen(false)} type={type} setType={setType} onSaved={showToast} />
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4" role="status">
          <div className="animate-pop flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface shadow-pop">
            <Check size={16} />
            {toast}
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "tap shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors",
        active ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface text-muted"
      )}
    >
      {children}
    </button>
  );
}

function AddTransactionModal({
  open,
  onClose,
  type,
  setType,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  type: TxType;
  setType: (t: TxType) => void;
  onSaved: (msg: string) => void;
}) {
  const { db, addTransaction } = useStore();
  const members = db.household.members;
  const accounts = db.accounts.filter((a) => !a.archived);
  const symbol = CURRENCY_SYMBOL[db.household.currency] ?? "₪";

  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [who, setWho] = useState<string>("shared"); // memberId | "shared"
  const [split, setSplit] = useState(false);
  const [date, setDate] = useState(localISO());
  const [notes, setNotes] = useState("");
  const [allCats, setAllCats] = useState(false);
  const [more, setMore] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanPct, setScanPct] = useState(0);
  const [scanMsg, setScanMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const resetEntry = useCallback(() => {
    setAmount("");
    setMerchant("");
    setCategoryId("");
    setNotes("");
    setSplit(false);
  }, []);

  // reset when opened; restore the last-used account and owner
  useEffect(() => {
    if (!open) return;
    resetEntry();
    setDate(localISO());
    setAllCats(false);
    setMore(false);
    setScanning(false);
    setScanMsg(null);
    const prefs = loadPrefs();
    const acc = accounts.find((a) => a.id === prefs.accountId) ?? accounts[0];
    setAccountId(acc?.id ?? "");
    setToAccountId(accounts.find((a) => a.id !== acc?.id)?.id ?? "");
    setWho(prefs.who && (prefs.who === "shared" || members.some((m) => m.id === prefs.who)) ? prefs.who : "shared");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // a category belongs to one type — clear it when the type changes
  useEffect(() => {
    setCategoryId("");
    setAllCats(false);
  }, [type]);

  // Categories for this type, most-used first.
  const cats = useMemo(() => {
    const use = new Map<string, number>();
    for (const t of activeTx(db)) if (t.categoryId) use.set(t.categoryId, (use.get(t.categoryId) ?? 0) + 1);
    return db.categories
      .filter((c) => (type === "income" ? c.kind === "income" : c.kind === "expense"))
      .map((c, i) => ({ c, i, n: use.get(c.id) ?? 0 }))
      .sort((a, b) => b.n - a.n || a.i - b.i)
      .map((x) => x.c);
  }, [db, type]);

  // Recent distinct descriptions for this type — one tap fills name + category.
  const recents = useMemo(() => {
    const seen = new Set<string>();
    const out: { merchant: string; categoryId?: string }[] = [];
    const sorted = activeTx(db)
      .filter((t) => t.type === type)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    for (const t of sorted) {
      const key = t.merchant.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ merchant: key, categoryId: t.categoryId });
      if (out.length >= 8) break;
    }
    return out;
  }, [db, type]);

  // Photo of an invoice -> fills amount, name, date and category.
  // It is read on this device; the photo is not uploaded or kept anywhere.
  async function onScan(file: File | undefined) {
    if (!file || scanning) return;
    setScanning(true);
    setScanPct(0);
    setScanMsg(null);
    try {
      const r = await scanInvoice(
        file,
        {
          categoryIds: db.categories.filter((c) => c.kind === "expense").map((c) => c.id),
          history: activeTx(db)
            .filter((t) => t.type === "expense")
            .map((t) => ({ merchant: t.merchant, categoryId: t.categoryId })),
        },
        setScanPct
      );
      setType("expense");
      if (r.amount) setAmount(String(r.amount));
      if (r.merchant) setMerchant(r.merchant);
      if (r.date) setDate(r.date);
      // wait for the type-change effect (which clears the category) before setting it
      setTimeout(() => r.categoryId && setCategoryId(r.categoryId), 0);
      setScanMsg(
        r.amount
          ? { tone: "ok", text: "تمت تعبئة البيانات من الفاتورة. راجعها ثم اضغط حفظ." }
          : { tone: "err", text: "لم نجد المبلغ في الصورة. أدخله يدويًا." }
      );
    } catch (e) {
      setScanMsg({ tone: "err", text: (e as Error).message });
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const q = merchant.trim();
  const suggestions = recents.filter((r) => r.merchant !== q && (!q || r.merchant.includes(q))).slice(0, 6);

  let shownCats = allCats ? cats : cats.slice(0, VISIBLE_CATS);
  const picked = cats.find((c) => c.id === categoryId);
  if (picked && !shownCats.includes(picked)) shownCats = [picked, ...shownCats.slice(0, VISIBLE_CATS - 1)];

  const amt = parseFloat(amount);
  const valid =
    amt > 0 && !!accountId && (type !== "transfer" || (!!toAccountId && accountId !== toAccountId));

  function save(keepOpen: boolean) {
    if (!valid) return;
    let ownership: Ownership = who === "shared" ? "shared" : "personal";
    let splits;
    let memberId: string | undefined = who === "shared" ? undefined : who;

    if (type === "expense" && who === "shared" && split && members.length > 1) {
      ownership = "split";
      const each = Math.round((amt / members.length) * 100) / 100;
      splits = members.map((m, i) => ({
        memberId: m.id,
        amount: i === members.length - 1 ? Math.round((amt - each * (members.length - 1)) * 100) / 100 : each,
      }));
      memberId = members[0].id;
    }

    // The description is optional: fall back to the category name.
    const fallback = type === "transfer" ? "تحويل بين الحسابات" : picked?.name ?? (type === "income" ? "دخل" : "مصروف");

    addTransaction({
      type,
      amount: amt,
      date,
      merchant: q || fallback,
      categoryId: type === "transfer" ? undefined : categoryId || undefined,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : undefined,
      ownership,
      memberId,
      splits,
      notes: notes.trim() || undefined,
      recurrence: "none",
    });
    savePrefs({ accountId, who });
    onSaved(`تم الحفظ · ${symbol}${amt}`);

    if (keepOpen) {
      resetEntry();
      amountRef.current?.focus();
    } else {
      onClose();
    }
  }

  const accountName = accounts.find((a) => a.id === accountId)?.name ?? "";
  const dateLabel = date === localISO() ? "اليوم" : date === localISO(-1) ? "أمس" : date;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة جديدة"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="tap flex-1" onClick={() => save(true)} disabled={!valid}>
            حفظ وإضافة أخرى
          </Button>
          <Button size="lg" className="tap flex-1" onClick={() => save(false)} disabled={!valid}>
            حفظ
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        {/* type */}
        <div className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1">
          {TYPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setType(o.value)}
              className={clsx(
                "tap flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors",
                type === o.value ? o.on : "text-muted"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* scan an invoice: the camera opens, the form fills itself */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => onScan(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="tap mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand bg-brand-soft text-sm font-bold text-brand disabled:opacity-70"
        >
          {scanning ? <Loader2 size={18} className="animate-spin" /> : <ScanLine size={18} />}
          {scanning ? `جارٍ قراءة الفاتورة… ${scanPct > 0 ? `${scanPct}%` : ""}` : "امسح فاتورة لتعبئة البيانات تلقائيًا"}
        </button>
        {scanMsg && (
          <p
            role="status"
            className={clsx(
              "mb-3 rounded-xl px-3 py-2 text-xs font-semibold",
              scanMsg.tone === "ok" ? "bg-pos-soft text-pos" : "bg-neg-soft text-neg"
            )}
          >
            {scanMsg.text}
          </p>
        )}

        {/* amount — the one required field */}
        <label className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-surface-2 px-4 py-4" dir="ltr">
          <span className="text-2xl font-bold text-muted">{symbol}</span>
          <input
            ref={amountRef}
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            aria-label="المبلغ"
            value={amount}
            onChange={(e) => {
              // accept Arabic-Indic digits and comma decimals
              const v = e.target.value
                .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
                .replace(/[,٫]/g, ".")
                .replace(/[^0-9.]/g, "")
                .replace(/(\..*)\./g, "$1");
              setAmount(v);
            }}
            placeholder="0"
            autoFocus
            className="tnum w-full min-w-0 bg-transparent text-center text-4xl font-extrabold text-ink outline-none placeholder:text-faint"
          />
        </label>

        {type === "transfer" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="من حساب">
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="إلى حساب">
              <Select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </Field>
            {accountId === toAccountId && (
              <p className="col-span-2 -mt-2 mb-3 text-xs text-neg">اختر حسابين مختلفين.</p>
            )}
          </div>
        ) : (
          <>
            {/* category — tap instead of scrolling a dropdown */}
            <div className="mb-4">
              <span className="mb-1.5 block text-sm font-semibold text-ink">الفئة</span>
              <div className="grid grid-cols-4 gap-2">
                {shownCats.map((c) => {
                  const active = c.id === categoryId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(active ? "" : c.id)}
                      aria-pressed={active}
                      className={clsx(
                        "tap flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 transition-colors",
                        active ? "border-brand bg-brand-soft" : "border-border bg-surface"
                      )}
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                        style={{ background: c.color }}
                      >
                        <Icon name={c.icon} size={18} />
                      </span>
                      <span className={clsx("w-full truncate text-center text-[11px] font-semibold", active ? "text-brand" : "text-muted")}>
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              {cats.length > VISIBLE_CATS && (
                <button
                  type="button"
                  onClick={() => setAllCats((v) => !v)}
                  className="tap mt-2 w-full rounded-lg py-2 text-xs font-semibold text-brand"
                >
                  {allCats ? "عرض أقل" : `كل الفئات (${cats.length})`}
                </button>
              )}
            </div>

            {/* description — optional, with one-tap recents */}
            <div className="mb-4">
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                ما هذا؟ <span className="font-normal text-faint">(اختياري)</span>
              </span>
              <Input
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder={picked?.name ?? "مثال: سوبرماركت"}
                enterKeyHint="done"
              />
              {suggestions.length > 0 && (
                <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
                  {suggestions.map((s) => (
                    <Chip
                      key={s.merchant}
                      active={false}
                      onClick={() => {
                        setMerchant(s.merchant);
                        if (s.categoryId && cats.some((c) => c.id === s.categoryId)) setCategoryId(s.categoryId);
                      }}
                    >
                      {s.merchant}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            {/* who */}
            <div className="mb-4">
              <span className="mb-1.5 block text-sm font-semibold text-ink">من؟</span>
              <div className="flex flex-wrap gap-2">
                <Chip active={who === "shared"} onClick={() => setWho("shared")}>مشترك</Chip>
                {members.map((m) => (
                  <Chip key={m.id} active={who === m.id} onClick={() => setWho(m.id)}>
                    {m.name}
                  </Chip>
                ))}
              </div>
              {who === "shared" && type === "expense" && members.length > 1 && (
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={split}
                    onChange={(e) => setSplit(e.target.checked)}
                    className="h-5 w-5 accent-[color:var(--brand)]"
                  />
                  قسّم بالتساوي بيننا
                </label>
              )}
            </div>
          </>
        )}

        {/* date — today / yesterday in one tap */}
        <div className="mb-4">
          <span className="mb-1.5 block text-sm font-semibold text-ink">التاريخ</span>
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={date === localISO()} onClick={() => setDate(localISO())}>اليوم</Chip>
            <Chip active={date === localISO(-1)} onClick={() => setDate(localISO(-1))}>أمس</Chip>
            <input
              type="date"
              aria-label="تاريخ آخر"
              value={date}
              max="2099-12-31"
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="tap h-[38px] min-w-0 flex-1 rounded-full border border-border bg-surface px-3 text-base text-muted outline-none focus:border-brand sm:text-sm"
            />
          </div>
        </div>

        {/* rarely-changed details stay folded away */}
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          aria-expanded={more}
          className="tap mb-2 flex w-full items-center justify-between rounded-xl bg-surface-2 px-3.5 py-3 text-sm"
        >
          <span className="font-semibold text-ink">تفاصيل أكثر</span>
          <span className="flex min-w-0 items-center gap-1.5 text-muted">
            {type !== "transfer" && <span className="truncate">{accountName} · {dateLabel}</span>}
            <ChevronDown size={16} className={clsx("shrink-0 transition-transform", more && "rotate-180")} />
          </span>
        </button>

        {more && (
          <div className="pt-2">
            {type !== "transfer" && (
              <Field label="الحساب">
                <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {accountKindLabel(a.kind)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="ملاحظات (اختياري)">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي تفاصيل إضافية…" />
            </Field>
          </div>
        )}

        {/* lets the keyboard's Enter/Done key submit */}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
