import type { Category } from "../types";

// Default category set. `group` mirrors the spec's top-level groups.
export const DEFAULT_CATEGORIES: Category[] = [
  // السكن — Housing
  { id: "rent", name: "إيجار", group: "السكن", icon: "Home", color: "#6366f1", kind: "expense" },
  { id: "mortgage", name: "قرض المنزل", group: "السكن", icon: "Home", color: "#6366f1", kind: "expense" },
  { id: "maintenance", name: "صيانة", group: "السكن", icon: "Wrench", color: "#6366f1", kind: "expense" },
  // الطعام — Food
  { id: "supermarket", name: "سوبرماركت", group: "الطعام", icon: "ShoppingCart", color: "#f59e0b", kind: "expense" },
  { id: "restaurants", name: "مطاعم", group: "الطعام", icon: "UtensilsCrossed", color: "#f59e0b", kind: "expense" },
  { id: "delivery", name: "توصيل طعام", group: "الطعام", icon: "Bike", color: "#f59e0b", kind: "expense" },
  { id: "coffee", name: "قهوة", group: "الطعام", icon: "Coffee", color: "#f59e0b", kind: "expense" },
  // المواصلات — Transportation
  { id: "fuel", name: "وقود", group: "المواصلات", icon: "Fuel", color: "#0ea5e9", kind: "expense" },
  { id: "transit", name: "مواصلات عامة", group: "المواصلات", icon: "Bus", color: "#0ea5e9", kind: "expense" },
  { id: "car", name: "السيارة", group: "المواصلات", icon: "Car", color: "#0ea5e9", kind: "expense" },
  { id: "parking", name: "مواقف", group: "المواصلات", icon: "SquareParking", color: "#0ea5e9", kind: "expense" },
  // الفواتير — Bills
  { id: "electricity", name: "كهرباء", group: "الفواتير", icon: "Zap", color: "#ef4444", kind: "expense" },
  { id: "water", name: "ماء", group: "الفواتير", icon: "Droplets", color: "#ef4444", kind: "expense" },
  { id: "internet", name: "إنترنت", group: "الفواتير", icon: "Wifi", color: "#ef4444", kind: "expense" },
  { id: "phone", name: "هاتف", group: "الفواتير", icon: "Smartphone", color: "#ef4444", kind: "expense" },
  { id: "insurance", name: "تأمين", group: "الفواتير", icon: "Shield", color: "#ef4444", kind: "expense" },
  // التسوق — Shopping
  { id: "clothes", name: "ملابس", group: "التسوق", icon: "Shirt", color: "#ec4899", kind: "expense" },
  { id: "electronics", name: "إلكترونيات", group: "التسوق", icon: "Laptop", color: "#ec4899", kind: "expense" },
  { id: "home-goods", name: "أدوات منزلية", group: "التسوق", icon: "Lamp", color: "#ec4899", kind: "expense" },
  // العائلة — Family
  { id: "children", name: "الأطفال", group: "العائلة", icon: "Baby", color: "#14b8a6", kind: "expense" },
  { id: "school", name: "مدرسة", group: "العائلة", icon: "GraduationCap", color: "#14b8a6", kind: "expense" },
  { id: "gifts", name: "هدايا", group: "العائلة", icon: "Gift", color: "#14b8a6", kind: "expense" },
  // الصحة — Health
  { id: "doctor", name: "طبيب", group: "الصحة", icon: "Stethoscope", color: "#22c55e", kind: "expense" },
  { id: "pharmacy", name: "صيدلية", group: "الصحة", icon: "Pill", color: "#22c55e", kind: "expense" },
  { id: "fitness", name: "لياقة", group: "الصحة", icon: "Dumbbell", color: "#22c55e", kind: "expense" },
  // الترفيه — Entertainment
  { id: "movies", name: "أفلام", group: "الترفيه", icon: "Clapperboard", color: "#a855f7", kind: "expense" },
  { id: "games", name: "ألعاب", group: "الترفيه", icon: "Gamepad2", color: "#a855f7", kind: "expense" },
  { id: "travel", name: "سفر", group: "الترفيه", icon: "Plane", color: "#a855f7", kind: "expense" },
  { id: "subscriptions", name: "اشتراكات", group: "الترفيه", icon: "Repeat", color: "#a855f7", kind: "expense" },
  { id: "other-exp", name: "أخرى", group: "أخرى", icon: "Ellipsis", color: "#64748b", kind: "expense" },
  // الدخل — Income
  { id: "salary", name: "راتب", group: "الدخل", icon: "Banknote", color: "#16a34a", kind: "income" },
  { id: "freelance", name: "عمل حر", group: "الدخل", icon: "Laptop", color: "#16a34a", kind: "income" },
  { id: "business", name: "أعمال", group: "الدخل", icon: "Store", color: "#16a34a", kind: "income" },
  { id: "investments-in", name: "استثمارات", group: "الدخل", icon: "TrendingUp", color: "#16a34a", kind: "income" },
  { id: "other-inc", name: "دخل آخر", group: "الدخل", icon: "Plus", color: "#16a34a", kind: "income" },
];
