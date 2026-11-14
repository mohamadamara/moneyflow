import type { Database } from "../types";
import { DEFAULT_CATEGORIES } from "./categories";

// The starting point for a new user: no money data at all.
// Only what the app needs to work is here — one person, two empty
// accounts to record into, and the list of categories.
export function buildSeed(): Database {
  return {
    household: {
      id: "hh-1",
      name: "عائلتنا",
      currency: "ILS",
      members: [{ id: "m-1", name: "محمد", role: "owner", color: "#6366f1" }],
    },
    accounts: [
      { id: "acc-bank", name: "الحساب البنكي", kind: "bank", openingBalance: 0 },
      { id: "acc-cash", name: "نقد", kind: "cash", openingBalance: 0 },
    ],
    categories: DEFAULT_CATEGORIES,
    transactions: [],
    budgets: [],
    bills: [],
    subscriptions: [],
    goals: [],
    activity: [],
    notifications: [],
    onboardingDone: true,
  };
}
