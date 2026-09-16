"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Wallet, Check } from "lucide-react";
import { Button } from "./ui";
import { Field, Input, Segmented } from "./form";
import { Icon } from "./icon";
import { createHousehold } from "@/lib/supabase/repo";
import type { AccountKind, CurrencyCode } from "@/lib/types";

const STARTER: { key: string; name: string; kind: AccountKind; icon: string }[] = [
  { key: "bank", name: "الحساب البنكي", kind: "bank", icon: "Landmark" },
  { key: "cash", name: "نقد", kind: "cash", icon: "Banknote" },
  { key: "credit", name: "بطاقة ائتمان", kind: "credit", icon: "CreditCard" },
  { key: "savings", name: "حساب توفير", kind: "savings", icon: "PiggyBank" },
];

export function Onboarding({
  sb,
  defaultName,
  onDone,
}: {
  sb: SupabaseClient;
  defaultName: string;
  onDone: (householdId: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [ownerName, setOwnerName] = useState(defaultName);
  const [householdName, setHouseholdName] = useState("عائلتي");
  const [currency, setCurrency] = useState<CurrencyCode>("ILS");
  const [selected, setSelected] = useState<Record<string, boolean>>({ bank: true, cash: true });
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
    setBusy(true);
    setError("");
    try {
      const accounts = STARTER.filter((s) => selected[s.key]).map((s) => ({
        name: s.name,
        kind: s.kind,
        opening: parseFloat(balances[s.key] ?? "") || 0,
      }));
      const id = await createHousehold(sb, { name: householdName.trim() || "عائلتي", currency, ownerName: ownerName.trim() || "أنا", accounts });
      onDone(id);
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? String(e);
      setError(`تعذّر إنشاء الأسرة: ${msg}`);
      console.error("[onboarding] createHousehold failed:", e);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
            <Wallet size={22} />
          </div>
          <h1 className="text-xl font-extrabold text-ink">لنُجهّز مساحتكم المالية</h1>
          <p className="mt-1 text-sm text-muted">خطوتان سريعتان — يمكنكم تعديل كل شيء لاحقًا.</p>
        </div>

        <div className="mb-4 flex items-center justify-center gap-2">
          {[1, 2].map((s) => (
            <span key={s} className={`h-2 w-8 rounded-full ${step >= s ? "bg-brand" : "bg-surface-2"}`} />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          {error && <div className="mb-4 rounded-xl bg-neg-soft px-3 py-2 text-sm text-neg">{error}</div>}

          {step === 1 && (
            <>
              <Field label="اسمك">
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="اسمك" autoFocus />
              </Field>
              <Field label="اسم الأسرة / المجموعة">
                <Input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="عائلتي" />
              </Field>
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
              <Button size="lg" className="mt-2 w-full" onClick={() => setStep(2)} disabled={!ownerName.trim()}>
                التالي
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="mb-3 text-sm font-semibold text-ink">أضف حساباتك (اختر ما ينطبق)</p>
              <div className="space-y-2">
                {STARTER.map((s) => {
                  const on = selected[s.key];
                  return (
                    <div key={s.key} className={`rounded-xl border p-3 transition-colors ${on ? "border-brand bg-brand-soft" : "border-border"}`}>
                      <button
                        type="button"
                        onClick={() => setSelected((p) => ({ ...p, [s.key]: !p[s.key] }))}
                        className="flex w-full items-center gap-3 text-right"
                      >
                        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${on ? "bg-brand text-white" : "bg-surface-2 text-muted"}`}>
                          <Icon name={s.icon} size={17} />
                        </span>
                        <span className="flex-1 text-sm font-semibold text-ink">{s.name}</span>
                        {on && <Check size={18} className="text-brand" />}
                      </button>
                      {on && (
                        <div className="mt-2 pr-12">
                          <Input
                            type="number"
                            value={balances[s.key] ?? ""}
                            onChange={(e) => setBalances((p) => ({ ...p, [s.key]: e.target.value }))}
                            placeholder="الرصيد الحالي (اختياري)"
                            className="!h-9 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} disabled={busy}>رجوع</Button>
                <Button className="flex-1" onClick={finish} disabled={busy}>
                  {busy ? "جارٍ الإنشاء…" : "إنشاء والبدء"}
                </Button>
              </div>
              <button onClick={finish} disabled={busy} className="mt-3 block w-full text-center text-sm text-muted hover:underline">
                تخطّي وإنشاء بدون حسابات
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
