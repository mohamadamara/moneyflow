"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronRight, ChevronLeft, Plus, Bell, Search, Wallet } from "lucide-react";
import { NAV, NAV_FOOTER, MOBILE_NAV } from "@/lib/nav";
import { Icon } from "./icon";
import { useStore } from "@/lib/store";
import { useUI } from "./quick-add";
import { addMonths } from "@/lib/calc";
import { fmtMonth } from "@/lib/format";
import { GlobalSearch } from "./search";

function useUnread() {
  const { db } = useStore();
  return db.notifications.filter((n) => !n.read).length;
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
        active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-ink"
      )}
    >
      <Icon name={icon} size={18} />
      {label}
    </Link>
  );
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 right-0 hidden w-64 flex-col border-l border-border bg-surface lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
          <Wallet size={18} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-extrabold text-ink">مِيزان</p>
          <p className="text-[11px] text-muted">نظام أموال الأسرة</p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV.map((g) => (
          <div key={g.title}>
            <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">{g.title}</p>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <NavLink key={it.href} {...it} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-0.5 border-t border-border px-3 py-3">
        {NAV_FOOTER.map((it) => (
          <NavLink key={it.href} {...it} />
        ))}
      </div>
    </aside>
  );
}

function MonthSwitcher() {
  const { month, setMonth } = useStore();
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-surface px-1">
      <button onClick={() => setMonth(addMonths(month, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2" aria-label="الشهر التالي">
        <ChevronRight size={18} />
      </button>
      <span className="min-w-[110px] text-center text-sm font-bold text-ink">{fmtMonth(`${month}-01`)}</span>
      <button onClick={() => setMonth(addMonths(month, -1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2" aria-label="الشهر السابق">
        <ChevronLeft size={18} />
      </button>
    </div>
  );
}

function Topbar({ onSearch }: { onSearch: () => void }) {
  const { openAdd } = useUI();
  const unread = useUnread();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur lg:px-8">
      <div className="lg:hidden flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
          <Wallet size={16} />
        </div>
        <span className="font-extrabold text-ink">مِيزان</span>
      </div>

      <div className="hidden lg:block">
        <MonthSwitcher />
      </div>

      <div className="flex-1" />

      <button onClick={onSearch} className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm text-muted hover:bg-surface-2">
        <Search size={16} />
        <span className="hidden sm:inline">بحث…</span>
      </button>

      <Link href="/notifications" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:bg-surface-2" aria-label="التنبيهات">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-neg px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </Link>

      <button onClick={() => openAdd()} className="flex h-10 items-center gap-1.5 rounded-xl bg-brand px-3.5 text-sm font-semibold text-white hover:opacity-90">
        <Plus size={18} />
        <span className="hidden sm:inline">إضافة</span>
      </button>
    </header>
  );
}

function MobileMonth() {
  return (
    <div className="flex justify-center border-b border-border bg-surface py-2 lg:hidden">
      <MonthSwitcher />
    </div>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const { openAdd } = useUI();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-border bg-surface/95 backdrop-blur lg:hidden">
      {MOBILE_NAV.map((it) => {
        if (it.href === "__add__") {
          return (
            <button key="add" onClick={() => openAdd()} className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-2xl bg-brand text-white shadow-pop" aria-label="إضافة">
              <Plus size={24} />
            </button>
          );
        }
        const active = pathname === it.href;
        return (
          <Link key={it.href} href={it.href} className={clsx("flex flex-col items-center gap-0.5 text-[10px] font-semibold", active ? "text-brand" : "text-muted")}>
            <Icon name={it.icon} size={20} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:mr-64">
        <Topbar onSearch={() => setSearchOpen(true)} />
        <MobileMonth />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>
      </div>
      <MobileNav />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
