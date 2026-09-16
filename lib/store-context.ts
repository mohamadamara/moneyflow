"use client";

import { createContext, useContext } from "react";
import type {
  Account,
  Bill,
  Budget,
  Category,
  Database,
  SavingsGoal,
  Subscription,
  Transaction,
} from "./types";

// The single interface both the Local (demo) and Supabase (real) stores
// implement, so every page/component is backend-agnostic.
export interface StoreValue {
  db: Database;
  ready: boolean;
  mode: "local" | "supabase";

  month: string;
  setMonth: (m: string) => void;

  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  addAccount: (a: Omit<Account, "id">) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;

  addBudget: (b: Omit<Budget, "id">) => void;
  updateBudget: (id: string, patch: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;

  addBill: (b: Omit<Bill, "id" | "paidMonths">) => void;
  updateBill: (id: string, patch: Partial<Bill>) => void;
  payBill: (id: string, createTx?: boolean) => void;
  unpayBill: (id: string) => void;

  addSubscription: (s: Omit<Subscription, "id">) => void;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;

  addGoal: (g: Omit<SavingsGoal, "id" | "contributions">) => void;
  addContribution: (goalId: string, amount: number, memberId?: string) => void;

  addCategory: (c: Omit<Category, "id">) => void;

  markNotificationRead: (id: string) => void;
  markAllRead: () => void;

  updateHousehold: (patch: Partial<Database["household"]>) => void;

  resetDemo: () => void;
}

export const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a store provider");
  return ctx;
}
