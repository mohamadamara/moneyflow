"use client";

// First time after signing up: start a new household, or join your
// partner's household with the 6-letter code they sent you.

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Scale, Plus, KeyRound, ChevronRight } from "lucide-react";
import { Button } from "./ui";
import { Field, Input, Segmented } from "./form";
import { createHousehold, joinHousehold } from "@/lib/supabase/repo";
import type { CurrencyCode } from "@/lib/types";

type Step = "choose" | "new" | "join";

export function Onboarding({
  sb,
  defaultName,
  onDone,
  onSignOut,
}: {
  sb: SupabaseClient;
  defaultName: string;
  onDone: (householdId: string) => void;
  onSignOut?: () => void;
}) {
  const [step, setStep] = useState<Step>("choose");
  const [name, setName] = useState(defaultName);
  const [currency, setCurrency] = useState<CurrencyCode>("ILS");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createNew() {
    setBusy(true);
    setError("");
    try {
      const id = await createHousehold(sb, {
        name: "عائلتنا",
        currency,
        ownerName: name.trim() || "أنا",
        accounts: [
          { name: "الحساب البنكي", kind: "bank", opening: 0 },
          { name: "نقد", kind: "cash", opening: 0 },
        ],
      });
      onDone(id);
    } catch (e) {
      console.error("[onboarding] createHousehold failed:", e);
      setError("لم ينجح الإنشاء. تأكّد من الإنترنت وحاول مرة أخرى.");
      setBusy(false);
    }
  }

  async function join() {
    setBusy(true);
    setError("");
    try {
      const id = await joinHousehold(sb, code, name);
      onDone(id);
    } catch (e) {
      const msg = ((e as { message?: string })?.message ?? "").toLowerCase();
      setError(msg.includes("invalid code") ? "الرمز غير صحيح أو انتهى. اطلب من شريكك رمزًا جديدًا." : "لم ينجح الدخول. تأكّد من الإنترنت وحاول مرة أخرى.");
      setBusy(false);
    }
  }

  return (
    <div className="app-frame flex flex-col px-5 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-on-brand">
          <Scale size={26} />
        </span>
        <h1 className="text-2xl font-extrabold text-ink">أهلًا بك في ميزان</h1>
        <p className="mt-1 text-sm text-muted">خطوة واحدة وتبدأ.</p>
      </div>

      {error && <div className="mb-4 rounded-2xl bg-neg-soft px-4 py-3 text-sm font-semibold text-neg">{error}</div>}

      {step === "choose" && (
        <div className="space-y-3">
          <button onClick={() => setStep("new")} className="tap flex w-full items-center gap-3 rounded-3xl bg-surface p-4 text-right shadow-card">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Plus size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-ink">أبدأ من جديد</span>
              <span className="block text-xs text-muted">أنا أول واحد، وسأدعو شريكي بعدها</span>
            </span>
          </button>
          <button onClick={() => setStep("join")} className="tap flex w-full items-center gap-3 rounded-3xl bg-surface p-4 text-right shadow-card">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <KeyRound size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-ink">عندي رمز من شريكي</span>
              <span className="block text-xs text-muted">أدخل نفس الحساب من هاتفي</span>
            </span>
          </button>
        </div>
      )}

      {step !== "choose" && (
        <div className="rounded-3xl bg-surface p-5 shadow-card">
          <button
            onClick={() => {
              setStep("choose");
              setError("");
            }}
            className="tap mb-3 flex items-center gap-1 text-sm font-bold text-muted"
          >
            <ChevronRight size={18} /> رجوع
          </button>

          <Field label="اسمك">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" />
          </Field>

          {step === "new" ? (
            <>
              <Field label="العملة">
                <Segmented<CurrencyCode>
                  value={currency}
                  onChange={setCurrency}
                  options={[
                    { value: "ILS", label: "₪ شيكل" },
                    { value: "USD", label: "$ دولار" },
                    { value: "EUR", label: "€ يورو" },
                  ]}
                />
              </Field>
              <Button size="lg" className="mt-2 w-full" onClick={createNew} disabled={busy || !name.trim()}>
                {busy ? "لحظة…" : "ابدأ"}
              </Button>
            </>
          ) : (
            <>
              <Field label="الرمز من شريكك" hint="٦ أحرف، تجده عنده في صفحة «بيننا».">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  placeholder="ABC123"
                  dir="ltr"
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="tnum text-center text-2xl font-extrabold tracking-[0.3em]"
                />
              </Field>
              <Button size="lg" className="mt-2 w-full" onClick={join} disabled={busy || code.length !== 6}>
                {busy ? "لحظة…" : "ادخل"}
              </Button>
            </>
          )}
        </div>
      )}

      {onSignOut && (
        <button onClick={onSignOut} className="tap mt-auto pt-8 text-center text-sm text-muted">
          تسجيل الخروج
        </button>
      )}
    </div>
  );
}
