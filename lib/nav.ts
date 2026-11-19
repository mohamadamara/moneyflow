// Every page of the app, in one place. The app is made for the phone:
// four tabs at the bottom, and everything else under "المزيد".

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name
  hint?: string; // one line under the name in the "more" list
}

// The bottom bar. "__add__" is the big + button in the middle.
export const TABS: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: "House" },
  { href: "/transactions", label: "العمليات", icon: "ReceiptText" },
  { href: "__add__", label: "إضافة", icon: "Plus" },
  { href: "/shared", label: "بيننا", icon: "Users" },
  { href: "/more", label: "المزيد", icon: "LayoutGrid" },
];

// The list on the "more" page.
export const MORE: NavItem[] = [
  { href: "/budgets", label: "الميزانية", icon: "PieChart", hint: "حدّ للصرف كل شهر" },
  { href: "/bills", label: "الفواتير", icon: "CalendarClock", hint: "كهرباء، ماء، إنترنت…" },
  { href: "/goals", label: "التوفير", icon: "PiggyBank", hint: "اجمع لهدف" },
  { href: "/subscriptions", label: "الاشتراكات", icon: "Repeat", hint: "Netflix، نادي…" },
  { href: "/accounts", label: "الحسابات", icon: "Wallet", hint: "البنك والنقد" },
  { href: "/settings", label: "الإعدادات", icon: "Settings", hint: "الأسماء، العملة، المظهر" },
];

const ALL = [...TABS, ...MORE];

export function pageTitle(pathname: string): string {
  return ALL.find((it) => it.href === pathname)?.label ?? "ميزان";
}

/** Pages with a back arrow instead of a tab (opened from "المزيد"). */
export function isSubPage(pathname: string): boolean {
  return MORE.some((it) => it.href === pathname);
}
