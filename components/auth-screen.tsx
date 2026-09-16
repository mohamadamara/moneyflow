"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Wallet } from "lucide-react";
import { Button } from "./ui";
import { Field, Input } from "./form";

type Mode = "login" | "signup" | "reset";

// Human-readable Arabic messages for common Supabase auth errors.
function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (m.includes("already registered") || m.includes("already been registered")) return "هذا البريد مسجّل بالفعل. سجّل الدخول بدلاً من ذلك.";
  if (m.includes("password should be")) return "كلمة المرور قصيرة جدًا (٦ أحرف على الأقل).";
  if (m.includes("email not confirmed")) return "يرجى تأكيد بريدك الإلكتروني أولاً عبر الرسالة المُرسلة إليك.";
  if (m.includes("rate limit")) return "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.";
  return "تعذّر إتمام العملية. تحقّق من بياناتك وحاول مجددًا.";
}

export function AuthScreen({ sb }: { sb: SupabaseClient }) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        // onAuthStateChange in the gate will re-render.
      } else if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        if (data.session) {
          // auto-signed in
        } else {
          setNotice("تم إنشاء الحساب. تفقّد بريدك لتأكيد الحساب ثم سجّل الدخول.");
          setMode("login");
        }
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        setNotice("أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك.");
        setMode("login");
      }
    } catch (err) {
      setError(friendly((err as Error).message ?? ""));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "تسجيل الدخول" : mode === "signup" ? "إنشاء حساب" : "استعادة كلمة المرور";

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
            <Wallet size={22} />
          </div>
          <h1 className="text-2xl font-extrabold text-ink">مِيزان</h1>
          <p className="mt-1 text-sm text-muted">شاهد أموالكم بوضوح. أدِروها معًا.</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <h2 className="mb-4 text-lg font-bold text-ink">{title}</h2>

          {error && <div className="mb-4 rounded-xl bg-neg-soft px-3 py-2 text-sm text-neg">{error}</div>}
          {notice && <div className="mb-4 rounded-xl bg-pos-soft px-3 py-2 text-sm text-pos">{notice}</div>}

          <form onSubmit={submit}>
            {mode === "signup" && (
              <Field label="الاسم">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" autoFocus required />
              </Field>
            )}
            <Field label="البريد الإلكتروني">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </Field>
            {mode !== "reset" && (
              <Field label="كلمة المرور">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete={mode === "login" ? "current-password" : "new-password"} />
              </Field>
            )}

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={busy}>
              {busy ? "جارٍ…" : title}
            </Button>
          </form>

          <div className="mt-4 space-y-1 text-center text-sm">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("signup")} className="text-brand hover:underline">ليس لديك حساب؟ أنشئ حسابًا</button>
                <div><button onClick={() => setMode("reset")} className="text-muted hover:underline">نسيت كلمة المرور؟</button></div>
              </>
            )}
            {mode === "signup" && (
              <button onClick={() => setMode("login")} className="text-brand hover:underline">لديك حساب؟ سجّل الدخول</button>
            )}
            {mode === "reset" && (
              <button onClick={() => setMode("login")} className="text-brand hover:underline">العودة لتسجيل الدخول</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
