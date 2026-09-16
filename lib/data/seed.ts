import type { Database, Transaction } from "../types";
import { DEFAULT_CATEGORIES } from "./categories";

const OWNER_EMAIL = "mohamadaamara545@gmail.com";

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

let n = 0;
const id = (p: string) => `${p}-${(++n).toString(36)}`;

// Build a realistic two-month dataset relative to Sept 2026.
export function buildSeed(): Database {
  n = 0;
  const Y = 2026;
  const THIS = 9;
  const PREV = 8;

  const tx: Transaction[] = [];
  const add = (t: Omit<Transaction, "id" | "createdAt" | "recurrence"> & Partial<Pick<Transaction, "recurrence">>) =>
    tx.push({
      id: id("tx"),
      createdAt: new Date().toISOString(),
      recurrence: "none",
      ...t,
    } as Transaction);

  // ---- Income ----
  add({ type: "income", amount: 8500, date: iso(Y, THIS, 25), merchant: "الراتب الشهري", categoryId: "salary", accountId: "acc-bank", ownership: "personal", memberId: "m-1", recurrence: "monthly" });
  add({ type: "income", amount: 6900, date: iso(Y, THIS, 10), merchant: "راتب الشريك", categoryId: "salary", accountId: "acc-bank", ownership: "personal", memberId: "m-2", recurrence: "monthly" });
  add({ type: "income", amount: 8500, date: iso(Y, PREV, 25), merchant: "الراتب الشهري", categoryId: "salary", accountId: "acc-bank", ownership: "personal", memberId: "m-1" });
  add({ type: "income", amount: 6900, date: iso(Y, PREV, 10), merchant: "راتب الشريك", categoryId: "salary", accountId: "acc-bank", ownership: "personal", memberId: "m-2" });

  // ---- This month expenses ----
  add({ type: "expense", amount: 3500, date: iso(Y, THIS, 1), merchant: "إيجار الشقة", categoryId: "rent", accountId: "acc-bank", ownership: "shared" });
  add({ type: "expense", amount: 280, date: iso(Y, THIS, 16), merchant: "سوبرماركت رامي ليفي", categoryId: "supermarket", accountId: "acc-credit", ownership: "shared" });
  add({ type: "expense", amount: 450, date: iso(Y, THIS, 12), merchant: "شوفرسال", categoryId: "supermarket", accountId: "acc-credit", ownership: "shared" });
  add({ type: "expense", amount: 320, date: iso(Y, THIS, 6), merchant: "أوسم", categoryId: "supermarket", accountId: "acc-credit", ownership: "shared" });
  add({ type: "expense", amount: 220, date: iso(Y, THIS, 16), merchant: "محطة وقود پاز", categoryId: "fuel", accountId: "acc-credit", ownership: "personal", memberId: "m-1" });
  add({ type: "expense", amount: 18, date: iso(Y, THIS, 16), merchant: "أرومة", categoryId: "coffee", accountId: "acc-cash", ownership: "personal", memberId: "m-1" });
  add({ type: "expense", amount: 300, date: iso(Y, THIS, 13), merchant: "مطعم", categoryId: "restaurants", accountId: "acc-credit", ownership: "split", memberId: "m-1", splits: [ { memberId: "m-1", amount: 150 }, { memberId: "m-2", amount: 150 } ] });
  add({ type: "expense", amount: 190, date: iso(Y, THIS, 9), merchant: "صيدلية سوبر-فارم", categoryId: "pharmacy", accountId: "acc-credit", ownership: "shared" });
  add({ type: "expense", amount: 240, date: iso(Y, THIS, 8), merchant: "ملابس أطفال", categoryId: "children", accountId: "acc-credit", ownership: "shared" });
  add({ type: "expense", amount: 130, date: iso(Y, THIS, 5), merchant: "زارا", categoryId: "clothes", accountId: "acc-credit", ownership: "personal", memberId: "m-2" });
  add({ type: "expense", amount: 49, date: iso(Y, THIS, 3), merchant: "Netflix", categoryId: "subscriptions", accountId: "acc-credit", ownership: "shared" });
  add({ type: "expense", amount: 20, date: iso(Y, THIS, 3), merchant: "Spotify", categoryId: "subscriptions", accountId: "acc-credit", ownership: "personal", memberId: "m-1" });
  add({ type: "expense", amount: 450, date: iso(Y, THIS, 14), merchant: "فاتورة الكهرباء", categoryId: "electricity", accountId: "acc-bank", ownership: "shared" });

  // ---- Previous month expenses (for comparisons) ----
  add({ type: "expense", amount: 3500, date: iso(Y, PREV, 1), merchant: "إيجار الشقة", categoryId: "rent", accountId: "acc-bank", ownership: "shared" });
  add({ type: "expense", amount: 1600, date: iso(Y, PREV, 12), merchant: "سوبرماركت", categoryId: "supermarket", accountId: "acc-credit", ownership: "shared" });
  add({ type: "expense", amount: 380, date: iso(Y, PREV, 18), merchant: "وقود", categoryId: "fuel", accountId: "acc-credit", ownership: "personal", memberId: "m-1" });
  add({ type: "expense", amount: 210, date: iso(Y, PREV, 20), merchant: "مطاعم", categoryId: "restaurants", accountId: "acc-credit", ownership: "shared" });
  add({ type: "expense", amount: 69, date: iso(Y, PREV, 3), merchant: "اشتراكات", categoryId: "subscriptions", accountId: "acc-credit", ownership: "shared" });
  add({ type: "expense", amount: 430, date: iso(Y, PREV, 14), merchant: "كهرباء", categoryId: "electricity", accountId: "acc-bank", ownership: "shared" });

  // ---- Transfer to savings (NOT counted as spending) ----
  add({ type: "transfer", amount: 1000, date: iso(Y, THIS, 2), merchant: "تحويل إلى التوفير", accountId: "acc-bank", toAccountId: "acc-savings", ownership: "shared" });

  return {
    household: {
      id: "hh-1",
      name: "عائلتنا",
      currency: "ILS",
      members: [
        { id: "m-1", name: "محمد", email: OWNER_EMAIL, role: "owner", color: "#6366f1" },
        { id: "m-2", name: "الشريك", role: "partner", color: "#ec4899" },
      ],
    },
    accounts: [
      { id: "acc-bank", name: "الحساب البنكي", kind: "bank", openingBalance: 12000 },
      { id: "acc-cash", name: "نقد", kind: "cash", openingBalance: 800 },
      { id: "acc-credit", name: "بطاقة ائتمان", kind: "credit", openingBalance: 0 },
      { id: "acc-savings", name: "حساب التوفير", kind: "savings", openingBalance: 9000 },
    ],
    categories: DEFAULT_CATEGORIES,
    transactions: tx,
    budgets: [
      { id: "b-food", name: "الطعام", scope: "category", categoryId: "supermarket", amount: 2500 },
      { id: "b-fuel", name: "الوقود", scope: "category", categoryId: "fuel", amount: 700 },
      { id: "b-fun", name: "الترفيه", scope: "category", categoryId: "restaurants", amount: 800 },
      { id: "b-total", name: "إجمالي الإنفاق", scope: "total", amount: 9500 },
    ],
    bills: [
      { id: "bill-elec", name: "الكهرباء", amount: 450, dueDay: 20, categoryId: "electricity", accountId: "acc-bank", recurrence: "monthly", paidMonths: [] },
      { id: "bill-water", name: "الماء", amount: 160, dueDay: 22, categoryId: "water", accountId: "acc-bank", recurrence: "monthly", paidMonths: [] },
      { id: "bill-net", name: "الإنترنت", amount: 120, dueDay: 25, categoryId: "internet", accountId: "acc-bank", recurrence: "monthly", paidMonths: [] },
      { id: "bill-ins", name: "تأمين السيارة", amount: 380, dueDay: 28, categoryId: "insurance", accountId: "acc-bank", recurrence: "monthly", paidMonths: [] },
    ],
    subscriptions: [
      { id: "sub-netflix", name: "Netflix", amount: 49, cycle: "monthly", nextChargeDate: iso(Y, 10, 3), categoryId: "subscriptions", accountId: "acc-credit", status: "active" },
      { id: "sub-spotify", name: "Spotify", amount: 20, cycle: "monthly", nextChargeDate: iso(Y, 10, 3), categoryId: "subscriptions", accountId: "acc-credit", status: "active" },
      { id: "sub-gym", name: "النادي الرياضي", amount: 180, cycle: "monthly", nextChargeDate: iso(Y, 10, 1), categoryId: "fitness", accountId: "acc-bank", status: "active" },
      { id: "sub-icloud", name: "iCloud", amount: 120, cycle: "yearly", nextChargeDate: iso(Y, 12, 1), categoryId: "subscriptions", accountId: "acc-credit", status: "active" },
    ],
    goals: [
      {
        id: "goal-vac",
        name: "إجازة الصيف",
        target: 10000,
        targetDate: iso(2027, 6, 1),
        monthlyContribution: 800,
        contributions: [
          { id: "c1", amount: 5700, date: iso(Y, PREV, 2) },
          { id: "c2", amount: 800, date: iso(Y, THIS, 2) },
        ],
      },
      {
        id: "goal-emergency",
        name: "صندوق الطوارئ",
        target: 20000,
        monthlyContribution: 1000,
        contributions: [{ id: "c3", amount: 8000, date: iso(Y, PREV, 5) }],
      },
    ],
    activity: [
      { id: "a1", at: new Date(iso(Y, THIS, 16) + "T09:12:00").toISOString(), memberId: "m-1", kind: "tx.create", message: "أضاف سوبرماركت رامي ليفي ₪280" },
      { id: "a2", at: new Date(iso(Y, THIS, 14) + "T18:40:00").toISOString(), memberId: "m-2", kind: "bill.paid", message: "دفع فاتورة الكهرباء ₪450" },
      { id: "a3", at: new Date(iso(Y, THIS, 2) + "T10:00:00").toISOString(), memberId: "m-1", kind: "goal.add", message: "أضاف ₪800 إلى هدف «إجازة الصيف»" },
    ],
    notifications: [
      { id: "n1", at: new Date(iso(Y, THIS, 16) + "T08:00:00").toISOString(), category: "bills", title: "فاتورة الكهرباء مستحقة خلال 4 أيام", read: false },
      { id: "n2", at: new Date(iso(Y, THIS, 15) + "T08:00:00").toISOString(), category: "budgets", title: "اقتربت من حد ميزانية الطعام (74%)", read: false },
      { id: "n3", at: new Date(iso(Y, THIS, 2) + "T10:00:00").toISOString(), category: "savings", title: "وصلت إلى 65% من هدف الإجازة", read: true },
    ],
    onboardingDone: true,
  };
}
