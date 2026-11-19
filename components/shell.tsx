"use client";

// The frame of the app: a simple header at the top and four tabs at the
// bottom with the big + in the middle. Made for the phone; on a computer
// the same phone-sized column sits in the middle of the screen.

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { TABS, pageTitle, isSubPage } from "@/lib/nav";
import { Icon } from "./icon";
import { Avatar } from "./widgets";
import { useUI } from "./quick-add";
import { useStore } from "@/lib/store";
import { addMonths, todayKey } from "@/lib/calc";
import { fmtMonth } from "@/lib/format";

/** ‹ نوفمبر 2026 › — used by the pages that show one month. */
export function MonthSwitch() {
  const { month, setMonth } = useStore();
  const isNow = month === todayKey();
  return (
    <div className="flex items-center gap-1 rounded-full bg-surface p-1 shadow-card">
      <button
        onClick={() => setMonth(addMonths(month, -1))}
        className="tap flex h-9 w-9 items-center justify-center rounded-full text-muted active:bg-surface-2"
        aria-label="الشهر السابق"
      >
        <ChevronRight size={18} />
      </button>
      <button
        onClick={() => setMonth(todayKey())}
        className="tap min-w-[104px] px-1 text-center text-sm font-bold text-ink"
        aria-label="العودة إلى الشهر الحالي"
      >
        {fmtMonth(`${month}-01`)}
      </button>
      <button
        onClick={() => setMonth(addMonths(month, 1))}
        disabled={isNow}
        className="tap flex h-9 w-9 items-center justify-center rounded-full text-muted active:bg-surface-2 disabled:opacity-30"
        aria-label="الشهر التالي"
      >
        <ChevronLeft size={18} />
      </button>
    </div>
  );
}

function Header() {
  const pathname = usePathname();
  const { db } = useStore();
  const me = db.household.members[0];

  if (pathname === "/") {
    return (
      <header className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">أهلًا</p>
          <h1 className="truncate text-xl font-bold text-ink">{me?.name ?? "ميزان"}</h1>
        </div>
        <Link href="/settings" aria-label="الإعدادات" className="tap">
          <Avatar name={me?.name ?? "م"} color={me?.color} size={40} />
        </Link>
      </header>
    );
  }

  const sub = isSubPage(pathname);
  return (
    <header className="flex items-center gap-2 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
      {sub && (
        <Link
          href="/more"
          aria-label="رجوع"
          className="tap -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-ink active:bg-surface-2"
        >
          <ChevronRight size={22} />
        </Link>
      )}
      <h1 className="truncate text-[22px] font-bold text-ink">{pageTitle(pathname)}</h1>
    </header>
  );
}

function TabBar() {
  const pathname = usePathname();
  const { openAdd } = useUI();
  const activeHref = isSubPage(pathname) ? "/more" : pathname;

  return (
    <nav
      aria-label="التنقّل"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid h-16 grid-cols-5">
        {TABS.map((it) => {
          if (it.href === "__add__") {
            return (
              <li key="add" className="flex items-center justify-center">
                <button
                  onClick={() => openAdd()}
                  aria-label="إضافة مصروف أو دخل"
                  className="tap -mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-on-brand shadow-pop ring-4 ring-bg"
                >
                  <Plus size={28} strokeWidth={2.5} />
                </button>
              </li>
            );
          }
          const active = activeHref === it.href;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "tap flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                  active ? "text-brand" : "text-faint"
                )}
              >
                <span className={clsx("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-brand-soft")}>
                  <Icon name={it.icon} size={20} strokeWidth={active ? 2.4 : 2} />
                </span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-frame">
      <Header />
      <main key={pathname} className="animate-page px-4 pb-28 pt-2">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
