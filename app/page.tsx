"use client";

// Home: how much is left this month, where it went, what is between
// the two of you, and the last few things you added.

import { useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, Plus, ScanLine, UserPlus, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { useUI } from "@/components/quick-add";
import { MonthSwitch } from "@/components/shell";
import { Card, Skeleton } from "@/components/ui";
import { TxList } from "@/components/tx-list";
import { TxDetail } from "@/components/tx-detail";
import { Icon } from "@/components/icon";
import {
  activeTx,
  inMonth,
  monthlyExpense,
  monthlyIncome,
  sharedSummary,
  spendingByCategory,
  upcomingBills,
} from "@/lib/calc";
import { money, relativeDay } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export default function Home() {
  const { db, ready, month } = useStore();
  const { openAdd } = useUI();
  const [sel, setSel] = useState<Transaction | null>(null);
  const cur = db.household.currency;

  if (!ready) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-11 w-48 rounded-full" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  const hasAny = activeTx(db).length > 0;
  if (!hasAny) return <Welcome onAdd={() => openAdd()} />;

  const income = monthlyIncome(db, month);
  const spent = monthlyExpense(db, month);
  const left = income - spent;
  const usedRatio = income > 0 ? Math.min(1, spent / income) : spent > 0 ? 1 : 0;

  const cats = spendingByCategory(db, month).slice(0, 4);
  const topCat = Math.max(1, ...cats.map((c) => c.amount));

  const recent = activeTx(db)
    .filter((t) => inMonth(t, month))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5);

  const many = db.household.members.length > 1;
  const shared = sharedSummary(db, month);
  const bills = upcomingBills(db, 7);

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <MonthSwitch />
      </div>

      {/* what is left this month */}
      <section className="hero rounded-3xl p-5 shadow-pop">
        {/* with no income yet, "left" would just be minus the spending — show the spending instead */}
        <p className="text-sm font-medium opacity-80">{income > 0 ? "باقي معك هذا الشهر" : "صرفت هذا الشهر"}</p>
        <p className="tnum mt-1 text-[40px] font-extrabold leading-none tracking-tight">{money(income > 0 ? left : spent, cur)}</p>
        {income > 0 && (
          <>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20" aria-hidden>
              <div className="h-full rounded-full bg-white" style={{ width: `${usedRatio * 100}%` }} />
            </div>
            <p className="mt-1.5 text-xs opacity-80">صرفت {Math.round(usedRatio * 100)}% من دخلك</p>
          </>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="flex items-center gap-1 text-xs opacity-80">
              <ArrowDownLeft size={14} /> دخل
            </p>
            <p className="tnum mt-1 text-lg font-bold">{money(income, cur)}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="flex items-center gap-1 text-xs opacity-80">
              <ArrowUpRight size={14} /> صرف
            </p>
            <p className="tnum mt-1 text-lg font-bold">{money(spent, cur)}</p>
          </div>
        </div>
      </section>

      {/* between us */}
      {many && shared.total > 0 && (
        <Link href="/shared" className="tap flex items-center gap-3 rounded-3xl bg-surface p-4 shadow-card">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Users size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">بيننا هذا الشهر · {money(shared.total, cur)}</p>
            <p className="truncate text-[15px] font-bold text-ink">
              {shared.settle.length === 0
                ? "الحساب متعادل 👌"
                : `${shared.settle[0].from.name} يعطي ${shared.settle[0].to.name} ${money(shared.settle[0].amount, cur)}`}
            </p>
          </div>
          <ChevronLeft size={18} className="text-faint" />
        </Link>
      )}

      {/* bills in the next 7 days */}
      {bills.length > 0 && (
        <Link href="/bills" className="tap flex items-center gap-3 rounded-3xl bg-warn-soft p-4">
          <Icon name="CalendarClock" size={20} className="shrink-0 text-warn" />
          <p className="min-w-0 flex-1 text-sm font-semibold text-ink">
            {bills.length === 1
              ? `فاتورة ${bills[0].bill.name} ${relativeDay(bills[0].dueDate.toISOString())}`
              : `${bills.length} فواتير خلال أسبوع`}
          </p>
          <span className="tnum text-sm font-bold text-warn">
            {money(bills.reduce((s, b) => s + b.bill.amount, 0), cur)}
          </span>
        </Link>
      )}

      {/* where it went */}
      {cats.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 text-[15px] font-bold text-ink">أين ذهب المال</h2>
          <ul className="space-y-3">
            {cats.map((c) => (
              <li key={c.categoryId ?? "none"} className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: (c.category?.color ?? "#64748b") + "1f", color: c.category?.color ?? "#64748b" }}
                >
                  <Icon name={c.category?.icon ?? "Ellipsis"} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-semibold text-ink">{c.category?.name ?? "بدون فئة"}</span>
                    <span className="tnum font-bold text-ink">{money(c.amount, cur)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(c.amount / topCat) * 100}%`, background: c.category?.color ?? "#64748b" }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* latest */}
      <Card className="p-4 pb-2">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-ink">آخر العمليات</h2>
          <Link href="/transactions" className="tap text-sm font-bold text-brand">
            الكل
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">لا شيء في هذا الشهر بعد.</p>
        ) : (
          <TxList items={recent} onSelect={setSel} />
        )}
      </Card>

      <TxDetail tx={sel} onClose={() => setSel(null)} />
    </div>
  );
}

/** First open: explain the app in three lines and give one big button. */
function Welcome({ onAdd }: { onAdd: () => void }) {
  const { db } = useStore();
  const many = db.household.members.length > 1;
  const steps = [
    { icon: <Plus size={18} />, text: "اضغط + وسجّل أي مصروف أو دخل. المبلغ يكفي." },
    { icon: <ScanLine size={18} />, text: "أو صوّر الفاتورة، والتطبيق يكتب المبلغ عنك." },
    { icon: <Users size={18} />, text: "المصروف المشترك يُقسم بينكما، وتعرفون من يعطي من." },
  ];
  return (
    <div className="space-y-4 pt-2">
      <section className="hero rounded-3xl p-6 shadow-pop">
        <p className="text-2xl font-extrabold leading-snug">لنبدأ من الصفر</p>
        <p className="mt-2 text-sm leading-relaxed opacity-85">
          سجّل ما تصرفه وما يدخل، وميزان يحسب لك الباقي كل شهر.
        </p>
        <button
          onClick={onAdd}
          className="tap mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-base font-bold text-[#0a5543]"
        >
          <Plus size={20} strokeWidth={2.5} /> أضف أول عملية
        </button>
      </section>

      <Card className="divide-y divide-border px-4">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              {s.icon}
            </span>
            <p className="text-sm leading-relaxed text-ink">{s.text}</p>
          </div>
        ))}
      </Card>

      {!many && (
        <Link href="/shared" className="tap flex items-center gap-3 rounded-3xl bg-surface p-4 shadow-card">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <UserPlus size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-ink">تصرفون معًا؟</p>
            <p className="text-xs text-muted">أضف اسم شريكك لتعرفوا الحساب بينكما</p>
          </div>
          <ChevronLeft size={18} className="text-faint" />
        </Link>
      )}
    </div>
  );
}
