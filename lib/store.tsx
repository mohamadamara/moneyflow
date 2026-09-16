"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ActivityEvent,
  AppNotification,
  Database,
  Transaction,
} from "./types";
import { buildSeed } from "./data/seed";
import { monthKey } from "./calc";
import { StoreContext, type StoreValue } from "./store-context";

export { useStore } from "./store-context";

const STORAGE_KEY = "hmos:v1";

function loadDB(): Database {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Database;
  } catch {
    /* ignore corrupted storage */
  }
  return buildSeed();
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database>(() => buildSeed());
  const [ready, setReady] = useState(false);
  const [month, setMonth] = useState<string>(() => monthKey(new Date()));

  // hydrate from localStorage on client
  useEffect(() => {
    setDb(loadDB());
    setReady(true);
  }, []);

  // persist
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }, [db, ready]);

  const logActivity = useCallback(
    (draft: Database, kind: string, message: string, memberId?: string) => {
      const ev: ActivityEvent = {
        id: uid("act"),
        at: new Date().toISOString(),
        kind,
        message,
        memberId,
      };
      draft.activity = [ev, ...draft.activity].slice(0, 200);
    },
    []
  );

  const notify = useCallback(
    (draft: Database, category: AppNotification["category"], title: string) => {
      draft.notifications = [
        { id: uid("ntf"), at: new Date().toISOString(), category, title, read: false },
        ...draft.notifications,
      ].slice(0, 100);
    },
    []
  );

  // generic immutable mutate helper
  const mutate = useCallback((fn: (draft: Database) => void) => {
    setDb((prev) => {
      const draft: Database = structuredClone(prev);
      fn(draft);
      return draft;
    });
  }, []);

  const value: StoreValue = useMemo(() => {
    return {
      db,
      ready,
      mode: "local",
      month,
      setMonth,

      addTransaction: (t) =>
        mutate((d) => {
          const tx: Transaction = { ...t, id: uid("tx"), createdAt: new Date().toISOString() };
          d.transactions.unshift(tx);
          const label =
            tx.type === "income" ? "دخل" : tx.type === "transfer" ? "تحويل" : "مصروف";
          logActivity(d, "tx.create", `أضاف ${label}: ${tx.merchant} ₪${tx.amount}`, tx.memberId);
        }),

      updateTransaction: (id, patch) =>
        mutate((d) => {
          const i = d.transactions.findIndex((x) => x.id === id);
          if (i >= 0) {
            d.transactions[i] = { ...d.transactions[i], ...patch };
            logActivity(d, "tx.edit", `عدّل معاملة: ${d.transactions[i].merchant}`);
          }
        }),

      deleteTransaction: (id) =>
        mutate((d) => {
          const t = d.transactions.find((x) => x.id === id);
          if (t) {
            t.deletedAt = new Date().toISOString();
            logActivity(d, "tx.delete", `حذف معاملة: ${t.merchant}`);
          }
        }),

      addAccount: (a) =>
        mutate((d) => {
          d.accounts.push({ ...a, id: uid("acc") });
          logActivity(d, "account.create", `أضاف حساب: ${a.name}`);
        }),

      updateAccount: (id, patch) =>
        mutate((d) => {
          const i = d.accounts.findIndex((x) => x.id === id);
          if (i >= 0) d.accounts[i] = { ...d.accounts[i], ...patch };
        }),

      addBudget: (b) =>
        mutate((d) => {
          d.budgets.push({ ...b, id: uid("bud") });
          logActivity(d, "budget.create", `أنشأ ميزانية: ${b.name}`);
        }),
      updateBudget: (id, patch) =>
        mutate((d) => {
          const i = d.budgets.findIndex((x) => x.id === id);
          if (i >= 0) d.budgets[i] = { ...d.budgets[i], ...patch };
        }),
      deleteBudget: (id) =>
        mutate((d) => {
          d.budgets = d.budgets.filter((x) => x.id !== id);
        }),

      addBill: (b) =>
        mutate((d) => {
          d.bills.push({ ...b, id: uid("bill"), paidMonths: [] });
          logActivity(d, "bill.create", `أضاف فاتورة: ${b.name}`);
        }),
      updateBill: (id, patch) =>
        mutate((d) => {
          const i = d.bills.findIndex((x) => x.id === id);
          if (i >= 0) d.bills[i] = { ...d.bills[i], ...patch };
        }),
      payBill: (id, createTx = true) =>
        mutate((d) => {
          const bill = d.bills.find((x) => x.id === id);
          if (!bill) return;
          const mk = month;
          if (!bill.paidMonths.includes(mk)) bill.paidMonths.push(mk);
          if (createTx) {
            const tx: Transaction = {
              id: uid("tx"),
              type: "expense",
              amount: bill.amount,
              date: new Date().toISOString().slice(0, 10),
              merchant: bill.name,
              categoryId: bill.categoryId,
              accountId: bill.accountId ?? d.accounts[0]?.id,
              ownership: "shared",
              memberId: bill.memberId,
              recurrence: "none",
              tags: ["فاتورة"],
              createdAt: new Date().toISOString(),
            };
            d.transactions.unshift(tx);
          }
          logActivity(d, "bill.paid", `دفع فاتورة: ${bill.name} ₪${bill.amount}`);
        }),
      unpayBill: (id) =>
        mutate((d) => {
          const bill = d.bills.find((x) => x.id === id);
          if (bill) bill.paidMonths = bill.paidMonths.filter((m) => m !== month);
        }),

      addSubscription: (s) =>
        mutate((d) => {
          d.subscriptions.push({ ...s, id: uid("sub") });
          logActivity(d, "sub.create", `أضاف اشتراك: ${s.name}`);
        }),
      updateSubscription: (id, patch) =>
        mutate((d) => {
          const i = d.subscriptions.findIndex((x) => x.id === id);
          if (i >= 0) d.subscriptions[i] = { ...d.subscriptions[i], ...patch };
        }),

      addGoal: (g) =>
        mutate((d) => {
          d.goals.push({ ...g, id: uid("goal"), contributions: [] });
          logActivity(d, "goal.create", `أنشأ هدف ادخار: ${g.name}`);
        }),
      addContribution: (goalId, amount, memberId) =>
        mutate((d) => {
          const g = d.goals.find((x) => x.id === goalId);
          if (!g) return;
          g.contributions.push({ id: uid("con"), amount, date: new Date().toISOString().slice(0, 10), memberId });
          logActivity(d, "goal.add", `أضاف ₪${amount} إلى هدف «${g.name}»`, memberId);
        }),

      addCategory: (c) =>
        mutate((d) => {
          d.categories.push({ ...c, id: uid("cat"), isCustom: true });
        }),

      markNotificationRead: (id) =>
        mutate((d) => {
          const nn = d.notifications.find((x) => x.id === id);
          if (nn) nn.read = true;
        }),
      markAllRead: () =>
        mutate((d) => {
          d.notifications.forEach((x) => (x.read = true));
        }),

      updateHousehold: (patch) =>
        mutate((d) => {
          d.household = { ...d.household, ...patch };
        }),

      resetDemo: () => {
        const fresh = buildSeed();
        setDb(fresh);
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, ready, month, mutate, logActivity, notify]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
