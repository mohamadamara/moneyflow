// ============================================================
// Household Money OS — Domain Types
// Shared by the local (demo) data layer and the Supabase layer.
// ============================================================

export type CurrencyCode = "ILS" | "USD" | "EUR" | "GBP";

export type MemberRole = "owner" | "partner" | "viewer";

// Who a piece of money belongs to.
export type Ownership = "personal" | "shared" | "split";

export type TxType = "expense" | "income" | "transfer";

export type AccountKind =
  | "bank"
  | "savings"
  | "cash"
  | "credit"
  | "investment";

export type BillStatus = "upcoming" | "due_soon" | "paid" | "overdue";

export type SubStatus = "active" | "paused" | "cancelled";

export type Recurrence = "none" | "weekly" | "monthly" | "yearly";

// ---------- People & household ----------

export interface Member {
  id: string;
  name: string;
  email?: string;
  role: MemberRole;
  color: string; // used for avatars / attribution chips
}

export interface Household {
  id: string;
  name: string;
  currency: CurrencyCode;
  members: Member[];
}

// ---------- Accounts ----------

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  // Opening balance. The live balance is opening + net of transactions,
  // computed in lib/calc.ts (never stored, to avoid drift).
  openingBalance: number;
  archived?: boolean;
}

// ---------- Categories ----------

export interface Category {
  id: string;
  name: string;
  group: string; // e.g. "طعام" / Food
  icon: string; // lucide icon name
  color: string;
  kind: "expense" | "income";
  isCustom?: boolean;
}

// ---------- Transactions ----------

export interface SplitPart {
  memberId: string;
  amount: number;
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number; // always positive; sign is derived from `type`
  date: string; // ISO date (yyyy-mm-dd)
  merchant: string;
  categoryId?: string;
  accountId: string;
  // For transfers only:
  toAccountId?: string;
  // Ownership
  ownership: Ownership;
  memberId?: string; // for personal; the payer for shared/split
  splits?: SplitPart[]; // for split
  paymentMethod?: string;
  notes?: string;
  tags?: string[];
  receiptId?: string;
  recurrence: Recurrence;
  createdAt: string;
  deletedAt?: string; // soft delete
}

// ---------- Budgets ----------

export interface Budget {
  id: string;
  name: string;
  scope: "category" | "total" | "personal";
  categoryId?: string; // when scope=category
  memberId?: string; // when scope=personal
  amount: number; // monthly limit
}

// ---------- Bills ----------

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDay: number; // day of month
  categoryId?: string;
  accountId?: string;
  memberId?: string;
  recurrence: Recurrence;
  notes?: string;
  // paid months as "yyyy-mm"
  paidMonths: string[];
}

// ---------- Subscriptions ----------

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  cycle: "monthly" | "yearly";
  nextChargeDate: string;
  categoryId?: string;
  accountId?: string;
  status: SubStatus;
}

// ---------- Savings goals ----------

export interface SavingsContribution {
  id: string;
  amount: number;
  date: string;
  memberId?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  targetDate?: string;
  monthlyContribution?: number;
  contributions: SavingsContribution[];
}

// ---------- Activity ----------

export interface ActivityEvent {
  id: string;
  at: string; // ISO datetime
  memberId?: string;
  kind: string; // e.g. "tx.create", "bill.paid"
  message: string; // human-readable, Arabic
}

// ---------- Notifications ----------

export interface AppNotification {
  id: string;
  at: string;
  category: "bills" | "budgets" | "transactions" | "savings" | "household" | "system";
  title: string;
  read: boolean;
}

// ---------- Full DB shape (local demo store) ----------

export interface Database {
  household: Household;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  subscriptions: Subscription[];
  goals: SavingsGoal[];
  activity: ActivityEvent[];
  notifications: AppNotification[];
  onboardingDone: boolean;
}
