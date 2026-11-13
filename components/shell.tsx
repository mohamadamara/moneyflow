"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronRight, ChevronLeft, ChevronDown, ChevronsRight, ChevronsLeft, Ellipsis, Plus, Bell, Search, Scale } from "lucide-react";
import { NAV_MAIN, NAV_MORE, NAV_FOOTER, MOBILE_NAV, pageTitle, usesMonth } from "@/lib/nav";
import { Icon } from "./icon";
import { Avatar } from "./widgets";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useUI } from "./quick-add";
import { addMonths, todayKey } from "@/lib/calc";
import { fmtMonth } from "@/lib/format";
import { GlobalSearch } from "./search";

const SIDEBAR_KEY = "hmos:sidebar";

function useUnread() {
  const { db } = useStore();
  return db.notifications.filter((n) => !n.read).length;
}

/* ------------------------------------------------------------------
   Sidebar — tablets get the icon rail, laptops and up get the full
   menu, which the user can fold back down to the rail.
   `rail` = the user chose the folded menu.
------------------------------------------------------------------- */

function NavLink({ href, label, icon, rail }: { href: string; label: string; icon: string; rail: boolean }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] transition-colors",
        "max-lg:justify-center",
        rail && "justify-center",
        active ? "bg-surface-2 font-semibold text-ink" : "font-medium text-muted hover:bg-surface-2 hover:text-ink"
      )}
    >
      {active && <span className="absolute -right-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-brand" aria-hidden />}
      <Icon name={icon} size={17} className={clsx("shrink-0", active && "text-brand")} />
      <span className={clsx("hidden truncate", !rail && "lg:inline")}>{label}</span>
    </Link>
  );
}

function Sidebar({ rail, onToggle }: { rail: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { db } = useStore();
  const auth = useAuth();
  const [more, setMore] = useState(false);
  // the extra pages stay folded unless you are on one of them
  const open = more || NAV_MORE.some((it) => it.href === pathname);
  const owner = db.household.members[0];
  const label = (cls?: string) => clsx("hidden", !rail && "lg:block", cls);

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 right-0 z-40 hidden w-[68px] flex-col border-l border-border bg-surface transition-[width] duration-200 md:flex",
        !rail && "lg:w-60"
      )}
    >
      <div className={clsx("flex h-14 shrink-0 items-center gap-2.5 px-3.5 max-lg:justify-center", rail && "justify-center")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-surface">
          <Scale size={16} />
        </div>
        <div className={label("min-w-0 leading-tight")}>
          <p className="text-sm font-bold text-ink">مِيزان</p>
          <p className="truncate text-[11px] text-muted">{db.household.name}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3 py-2" aria-label="القائمة الرئيسية">
        {NAV_MAIN.map((it) => (
          <NavLink key={it.href} {...it} rail={rail} />
        ))}

        <div className="!my-2 border-t border-border" />

        <button
          onClick={() => setMore(!open)}
          aria-expanded={open}
          title="المزيد"
          className={clsx(
            "flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink max-lg:justify-center",
            rail && "justify-center"
          )}
        >
          <Ellipsis size={17} className="shrink-0" />
          <span className={label("flex-1 text-right")}>المزيد</span>
          <ChevronDown size={15} className={clsx("hidden transition-transform", !rail && "lg:block", open && "rotate-180")} />
        </button>
        {open && NAV_MORE.map((it) => <NavLink key={it.href} {...it} rail={rail} />)}
      </nav>

      <div className="shrink-0 space-y-0.5 border-t border-border px-3 py-2">
        {NAV_FOOTER.map((it) => (
          <NavLink key={it.href} {...it} rail={rail} />
        ))}
        <button
          onClick={onToggle}
          title={rail ? "توسيع القائمة" : "طيّ القائمة"}
          className={clsx(
            "hidden h-9 w-full items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink lg:flex",
            rail && "justify-center"
          )}
        >
          {rail ? <ChevronsLeft size={17} className="shrink-0" /> : <ChevronsRight size={17} className="shrink-0" />}
          <span className={label()}>طيّ القائمة</span>
        </button>
      </div>

      <Link
        href="/settings"
        title={owner?.name ?? "الحساب"}
        className={clsx(
          "flex shrink-0 items-center gap-2.5 border-t border-border px-3.5 py-3 transition-colors hover:bg-surface-2 max-lg:justify-center",
          rail && "justify-center"
        )}
      >
        <Avatar name={owner?.name ?? "م"} color={owner?.color} size={30} />
        <div className={label("min-w-0 leading-tight")}>
          <p className="truncate text-[13px] font-semibold text-ink">{owner?.name ?? "الحساب"}</p>
          <p className="truncate text-[11px] text-muted" dir="auto">
            {auth.mode === "supabase" ? auth.email : "وضع تجريبي"}
          </p>
        </div>
      </Link>
    </aside>
  );
}

/* ------------------------------------------------------------------ */

function MonthSwitcher({ className }: { className?: string }) {
  const { month, setMonth } = useStore();
  const isNow = month === todayKey();
  const arrow = "tap flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink md:h-8 md:w-8";
  return (
    <div className={clsx("flex items-center rounded-xl border border-border bg-surface p-0.5", className)}>
      <button onClick={() => setMonth(addMonths(month, 1))} className={arrow} aria-label="الشهر التالي">
        <ChevronRight size={16} />
      </button>
      <button
        onClick={() => setMonth(todayKey())}
        disabled={isNow}
        title={isNow ? undefined : "العودة إلى الشهر الحالي"}
        className="min-w-[104px] flex-1 rounded-lg px-1 py-2 text-center md:py-1.5 text-[13px] font-semibold text-ink enabled:hover:bg-surface-2"
      >
        {fmtMonth(`${month}-01`)}
      </button>
      <button onClick={() => setMonth(addMonths(month, -1))} className={arrow} aria-label="الشهر السابق">
        <ChevronLeft size={16} />
      </button>
    </div>
  );
}

function Topbar({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname();
  const { db } = useStore();
  const { openAdd } = useUI();
  const unread = useUnread();
  const title = pageTitle(pathname);
  const showMonth = usesMonth(pathname);
  const iconBtn = "tap relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink md:h-9 md:w-9 md:border md:border-border md:bg-surface";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-4 md:px-6 lg:px-8">
        {/* phone: page name · tablet and up: breadcrumb */}
        <h1 className="truncate text-lg font-bold text-ink md:hidden">{title}</h1>
        <nav className="hidden min-w-0 items-center gap-1.5 text-[13px] md:flex" aria-label="مسار الصفحة">
          {pathname === "/" ? (
            <span className="truncate font-semibold text-ink">{title}</span>
          ) : (
            <>
              <Link href="/" className="truncate text-muted hover:text-ink">{db.household.name}</Link>
              <ChevronLeft size={14} className="shrink-0 text-faint" />
              <span className="truncate font-semibold text-ink">{title}</span>
            </>
          )}
        </nav>

        <div className="flex-1" />

        <button onClick={onSearch} aria-label="بحث" className={clsx(iconBtn, "md:w-auto md:justify-start md:gap-2 md:px-3 lg:w-64")}>
          <Search size={17} className="shrink-0" />
          <span className="hidden flex-1 text-right text-[13px] lg:inline">بحث في كل شيء…</span>
          <kbd className="hidden rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-faint lg:inline" dir="ltr">Ctrl K</kbd>
        </button>

        {showMonth && <MonthSwitcher className="hidden md:flex" />}

        <Link href="/notifications" className={iconBtn} aria-label={unread ? `التنبيهات، ${unread} غير مقروءة` : "التنبيهات"}>
          <Bell size={17} />
          {unread > 0 && (
            <span className="tnum absolute -left-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-neg px-1 text-[10px] font-bold text-on-brand ring-2 ring-bg max-md:left-0.5 max-md:top-0.5">
              {unread}
            </span>
          )}
        </Link>

        <button onClick={() => openAdd()} className="tap hidden h-9 items-center gap-1.5 rounded-xl bg-brand px-3.5 text-[13px] font-semibold text-on-brand hover:opacity-90 md:flex">
          <Plus size={16} />
          إضافة
        </button>
      </div>

      {showMonth && (
        <div className="px-4 pb-2 md:hidden">
          <MonthSwitcher />
        </div>
      )}
    </header>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const { openAdd } = useUI();
  return (
    <nav
      aria-label="التنقّل"
      className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(3.75rem+env(safe-area-inset-bottom))] items-stretch justify-around border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      {MOBILE_NAV.map((it) => {
        if (it.href === "__add__") {
          return (
            <div key="add" className="flex w-16 items-start justify-center">
              <button
                onClick={() => openAdd()}
                className="-mt-4 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-brand text-on-brand shadow-pop ring-4 ring-bg transition-transform active:scale-90"
                aria-label="إضافة عملية"
              >
                <Plus size={24} />
              </button>
            </div>
          );
        }
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={clsx("tap relative flex min-w-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px]", active ? "font-semibold text-brand" : "font-medium text-muted")}
          >
            {active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-brand" aria-hidden />}
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
  const [rail, setRail] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      setRail(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {}
  }, []);

  function toggleRail() {
    setRail((r) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, r ? "0" : "1");
      } catch {}
      return !r;
    });
  }

  // Ctrl/⌘ + K opens search from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-pop">
        تخطَّ إلى المحتوى
      </a>
      <Sidebar rail={rail} onToggle={toggleRail} />
      <div className={clsx("transition-[margin] duration-200 md:mr-[68px]", !rail && "lg:mr-60")}>
        <Topbar onSearch={() => setSearchOpen(true)} />
        <main
          id="main"
          key={pathname}
          className="animate-page mx-auto max-w-[1320px] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pb-10 md:pt-6 lg:px-8"
        >
          {children}
        </main>
      </div>
      <MobileNav />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
