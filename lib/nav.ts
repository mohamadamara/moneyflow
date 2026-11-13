export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name
}

// The pages used every day — always visible.
export const NAV_MAIN: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: "LayoutDashboard" },
  { href: "/transactions", label: "المعاملات", icon: "ArrowLeftRight" },
  { href: "/accounts", label: "الحسابات", icon: "Wallet" },
  { href: "/budgets", label: "الميزانيات", icon: "PieChart" },
  { href: "/bills", label: "الفواتير", icon: "Receipt" },
  { href: "/reports", label: "التقارير", icon: "BarChart3" },
];

// Used less often — folded under "المزيد".
export const NAV_MORE: NavItem[] = [
  { href: "/goals", label: "أهداف الادخار", icon: "Target" },
  { href: "/subscriptions", label: "الاشتراكات", icon: "Repeat" },
  { href: "/household", label: "الميزانية المشتركة", icon: "Users" },
  { href: "/personal", label: "إنفاقي الشخصي", icon: "User" },
  { href: "/income", label: "الدخل", icon: "TrendingUp" },
  { href: "/expenses", label: "المصروفات", icon: "TrendingDown" },
];

// bottom of the sidebar (notifications live in the top bar bell)
export const NAV_FOOTER: NavItem[] = [{ href: "/settings", label: "الإعدادات", icon: "Settings" }];

// mobile bottom bar (5 slots; middle is Add)
export const MOBILE_NAV: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: "Home" },
  { href: "/transactions", label: "المعاملات", icon: "ArrowLeftRight" },
  { href: "__add__", label: "إضافة", icon: "Plus" },
  { href: "/budgets", label: "الميزانيات", icon: "PieChart" },
  { href: "/more", label: "المزيد", icon: "Menu" },
];

const EXTRA_TITLES: Record<string, string> = {
  "/notifications": "التنبيهات",
  "/more": "المزيد",
};

// The name shown in the top bar for a route.
export function pageTitle(pathname: string): string {
  const item = [...NAV_MAIN, ...NAV_MORE, ...NAV_FOOTER].find((it) => it.href === pathname);
  return item?.label ?? EXTRA_TITLES[pathname] ?? "مِيزان";
}

// Pages whose numbers follow the selected month — only these show the month switcher.
const MONTH_PAGES = new Set(["/", "/income", "/expenses", "/budgets", "/household", "/personal", "/reports"]);
export function usesMonth(pathname: string): boolean {
  return MONTH_PAGES.has(pathname);
}
