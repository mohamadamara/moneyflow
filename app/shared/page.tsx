"use client";

// "بيننا" — the shared account, explained simply.
// A shared expense belongs to everyone equally. Each month the app adds
// up who paid what, and says who should give whom how much to be even.

import { useState } from "react";
import { ArrowLeft, Check, Copy, Info, Send, Smartphone, UserPlus } from "lucide-react";
import { useStore } from "@/lib/store";
import { sharedSummary } from "@/lib/calc";
import { money } from "@/lib/format";
import { MonthSwitch } from "@/components/shell";
import { Card, Button, Skeleton } from "@/components/ui";
import { Input } from "@/components/form";
import { Avatar } from "@/components/widgets";
import { TxList } from "@/components/tx-list";
import { TxDetail } from "@/components/tx-detail";
import { useUI } from "@/components/quick-add";
import { useAuth } from "@/lib/auth-context";
import { useMe } from "@/lib/me";
import type { Transaction } from "@/lib/types";

const COLORS = ["#ec4899", "#0ea5e9", "#f59e0b", "#a855f7", "#14b8a6"];

export default function SharedPage() {
  const { db, ready, month, updateHousehold } = useStore();
  const { openAdd } = useUI();
  const auth = useAuth();
  const me = useMe();
  const online = !!auth.createInvite;
  const [sel, setSel] = useState<Transaction | null>(null);
  const [name, setName] = useState("");
  const cur = db.household.currency;

  if (!ready) return <Skeleton className="h-80 rounded-3xl" />;

  const members = db.household.members;

  function addPartner() {
    const n = name.trim();
    if (!n) return;
    updateHousehold({
      members: [
        ...members,
        { id: `m-${Date.now().toString(36)}`, name: n, role: "partner", color: COLORS[(members.length - 1) % COLORS.length] },
      ],
    });
    setName("");
  }

  // Only one person: explain the idea and ask for the partner's name.
  if (members.length < 2) {
    return (
      <div className="space-y-4">
        <section className="hero rounded-3xl p-6 shadow-pop">
          <p className="text-2xl font-extrabold">حساب بينكما</p>
          <p className="mt-2 text-sm leading-relaxed opacity-90">
            إيجار، أكل، فواتير… أي شيء لكم أنتما الاثنين. كل واحد يدفع مرّة، وميزان يحسب ويقول لكم في آخر الشهر: من يعطي من، وكم.
          </p>
        </section>

        {online ? (
          <InviteBox title="ادعُ شريكك ليدخل من هاتفه" />
        ) : (
        <Card className="p-4">
          <p className="mb-3 text-[15px] font-bold text-ink">ما اسم شريكك؟</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addPartner();
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: سارة" enterKeyHint="done" />
            <Button type="submit" disabled={!name.trim()}>
              <UserPlus size={18} /> أضف
            </Button>
          </form>
        </Card>
        )}

        <HowItWorks />
      </div>
    );
  }

  // online: people added by name who have not signed in from their own phone yet
  const notLinked = online && me?.role === "owner" ? members.filter((m) => !m.userId && m.role !== "owner") : [];

  const s = sharedSummary(db, month);
  const even = s.settle.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <MonthSwitch />
      </div>

      {/* the answer, in one sentence */}
      <section className="hero rounded-3xl p-5 shadow-pop">
        <p className="text-sm opacity-80">المصروف المشترك هذا الشهر</p>
        <p className="tnum mt-1 text-[34px] font-extrabold leading-none">{money(s.total, cur)}</p>

        <div className="mt-5 rounded-2xl bg-white/10 p-4">
          {s.total === 0 ? (
            <p className="text-sm font-semibold">لا مصروف مشترك بعد. اضغط + واختر «لنا الاثنين».</p>
          ) : even ? (
            <p className="flex items-center gap-2 text-base font-bold">
              <Check size={20} /> الحساب متعادل، لا أحد يدين لأحد
            </p>
          ) : (
            <ul className="space-y-3">
              {s.settle.map((x, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Avatar name={x.from.name} color={x.from.color} size={32} />
                  <span className="text-sm font-semibold">{x.from.name}</span>
                  <ArrowLeft size={16} className="opacity-70" />
                  <Avatar name={x.to.name} color={x.to.color} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{x.to.name}</span>
                  <span className="tnum text-lg font-extrabold">{money(x.amount, cur)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* who paid what */}
      {s.total > 0 && (
        <Card className="p-4">
          <h2 className="mb-1 text-[15px] font-bold text-ink">من دفع كم</h2>
          <p className="mb-3 text-xs text-muted">
            حصّة كل واحد = {money(s.total - s.noPayer, cur)} ÷ {members.length} ={" "}
            {money((s.total - s.noPayer) / members.length, cur)}
          </p>
          <ul className="space-y-2">
            {s.people.map((p) => (
              <li key={p.member.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                <Avatar name={p.member.name} color={p.member.color} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{p.member.name}</p>
                  <p className="text-xs text-muted">
                    دفع <b className="tnum text-ink">{money(p.paid, cur)}</b>
                  </p>
                </div>
                <span
                  className={
                    Math.abs(p.net) < 0.5
                      ? "text-xs font-bold text-muted"
                      : p.net > 0
                        ? "tnum text-sm font-bold text-pos"
                        : "tnum text-sm font-bold text-neg"
                  }
                >
                  {Math.abs(p.net) < 0.5 ? "متعادل" : p.net > 0 ? `له ${money(p.net, cur)}` : `عليه ${money(-p.net, cur)}`}
                </span>
              </li>
            ))}
          </ul>
          {s.noPayer > 0 && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
              <Info size={14} className="mt-0.5 shrink-0" />
              {money(s.noPayer, cur)} بدون اسم من دفع، فلم تدخل في الحساب. افتحها واختر من دفع.
            </p>
          )}
        </Card>
      )}

      {/* the shared expenses themselves */}
      <Card className="p-4 pb-2">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-ink">المصاريف المشتركة</h2>
          <button onClick={() => openAdd()} className="tap text-sm font-bold text-brand">
            + إضافة
          </button>
        </div>
        {s.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">لا شيء هذا الشهر.</p>
        ) : (
          <TxList items={s.items} onSelect={setSel} />
        )}
      </Card>

      {notLinked.map((m) => (
        <InviteBox key={m.id} memberId={m.id} title={`${m.name} لم يدخل من هاتفه بعد`} />
      ))}

      <HowItWorks />
      <TxDetail tx={sel} onClose={() => setSel(null)} />
    </div>
  );
}

function HowItWorks() {
  const rows = [
    ["١", "عند الإضافة اختر «لنا الاثنين» واختر من دفع."],
    ["٢", "المصروف المشترك يُقسم بالتساوي بينكما."],
    ["٣", "من دفع أكثر من حصّته، يأخذ الفرق من الآخر."],
    ["٤", "الحساب يبدأ من جديد كل شهر."],
  ];
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-[15px] font-bold text-ink">كيف يعمل؟</h2>
      <ol className="space-y-2.5">
        {rows.map(([n, t]) => (
          <li key={n} className="flex items-start gap-3 text-sm text-ink">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
              {n}
            </span>
            {t}
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** Makes a 6-letter code the partner types after signing up on their phone. */
function InviteBox({ title, memberId }: { title: string; memberId?: string }) {
  const auth = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function make() {
    if (!auth.createInvite) return;
    setBusy(true);
    setMsg("");
    try {
      setCode(await auth.createInvite(memberId));
    } catch {
      setMsg("لم ينجح. تأكّد من الإنترنت وحاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  const link = typeof window !== "undefined" ? window.location.origin : "";
  const text = `ادخل إلى ميزان من هاتفك: ${link}\nأنشئ حسابًا، ثم اختر «عندي رمز من شريكي» واكتب: ${code}`;

  async function send() {
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setMsg("تم النسخ. الصقه في واتساب.");
      }
    } catch {
      /* closed the share sheet */
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Smartphone size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-ink">{title}</p>
          <p className="text-xs text-muted">تعطيه رمزًا، يكتبه في هاتفه، ويرى كل شيء معك.</p>
        </div>
      </div>

      {code ? (
        <div className="mt-4">
          <p className="tnum rounded-2xl bg-surface-2 py-4 text-center text-3xl font-extrabold tracking-[0.35em] text-ink" dir="ltr">
            {code}
          </p>
          <p className="mt-2 text-center text-xs text-muted">يعمل مرة واحدة، لمدة ٧ أيام.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={send}>
              <Send size={18} /> أرسل
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(code);
                  setMsg("تم نسخ الرمز.");
                } catch {
                  /* clipboard blocked */
                }
              }}
            >
              <Copy size={18} /> انسخ الرمز
            </Button>
          </div>
        </div>
      ) : (
        <Button className="mt-4 w-full" onClick={make} disabled={busy}>
          {busy ? "لحظة…" : "اصنع رمز دعوة"}
        </Button>
      )}
      {msg && <p className="mt-2 text-center text-xs font-semibold text-muted">{msg}</p>}
    </Card>
  );
}
