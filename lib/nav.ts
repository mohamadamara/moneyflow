export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    title: "نظرة عامة",
    items: [{ href: "/", label: "لوحة القيادة", icon: "LayoutDashboard" }],
  },
  {
    title: "الأموال",
    items: [
      { href: "/accounts", label: "الحسابات", icon: "Wallet" },
      { href: "/transactions", label: "المعاملات", icon: "ArrowLeftRight" },
      { href: "/income", label: "الدخل", icon: "TrendingUp" },
      { href: "/expenses", label: "المصروفات", icon: "TrendingDown" },
    ],
  },
  {
    title: "التخطيط",
    items: [
      { href: "/budgets", label: "الميزانيات", icon: "PieChart" },
      { href: "/bills", label: "الفواتير", icon: "Receipt" },
      { href: "/subscriptions", label: "الاشتراكات", icon: "Repeat" },
      { href: "/goals", label: "أهداف الادخار", icon: "Target" },
    ],
  },
  {
    title: "الأسرة",
    items: [
      { href: "/household", label: "الميزانية المشتركة", icon: "Users" },
      { href: "/personal", label: "إنفاقي الشخصي", icon: "User" },
    ],
  },
  {
    title: "التحليلات",
    items: [{ href: "/reports", label: "التقارير", icon: "BarChart3" }],
  },
];

// bottom-of-sidebar items
export const NAV_FOOTER: NavItem[] = [
  { href: "/notifications", label: "التنبيهات", icon: "Bell" },
  { href: "/settings", label: "الإعدادات", icon: "Settings" },
];

// mobile bottom bar (5 slots; middle is Add)
export const MOBILE_NAV: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: "Home" },
  { href: "/transactions", label: "المعاملات", icon: "ArrowLeftRight" },
  { href: "__add__", label: "إضافة", icon: "Plus" },
  { href: "/budgets", label: "التخطيط", icon: "PieChart" },
  { href: "/more", label: "المزيد", icon: "Menu" },
];
