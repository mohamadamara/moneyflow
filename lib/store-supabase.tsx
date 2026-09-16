"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityEvent, Database, Transaction } from "./types";
import { StoreContext, type StoreValue } from "./store-context";
import { monthKey } from "./calc";
import * as repo from "./supabase/repo";

function uid(p: string) {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Empty DB shell shown until the first load resolves.
function emptyDB(householdId: string): Database {
  return {
    household: { id: householdId, name: "…", currency: "ILS", members: [] },
    accounts: [],
    categories: [],
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

export function SupabaseStoreProvider({
  sb,
  householdId,
  children,
}: {
  sb: SupabaseClient;
  householdId: string;
  children: React.ReactNode;
}) {
  const [db, setDb] = useState<Database>(() => emptyDB(householdId));
  const [ready, setReady] = useState(false);
  const [month, setMonth] = useState<string>(() => monthKey(new Date()));

  const reload = useCallback(async () => {
    try {
      const fresh = await repo.loadDatabase(sb, householdId);
      setDb(fresh);
    } catch (e) {
      console.error("[store] reload failed", e);
    }
  }, [sb, householdId]);

  useEffect(() => {
    (async () => {
      await reload();
      setReady(true);
    })();
  }, [reload]);

  const patchLocal = useCallback((fn: (d: Database) => void) => {
    setDb((prev) => {
      const draft = structuredClone(prev);
      fn(draft);
      return draft;
    });
  }, []);

  // optimistic local change + async DB write + reconcile
  const run = useCallback(
    (optimistic: (d: Database) => void, write: () => Promise<void>) => {
      patchLocal(optimistic);
      write()
        .then(() => reload())
        .catch((e) => {
          console.error("[store] write failed", e);
          reload();
        });
    },
    [patchLocal, reload]
  );

  const localActivity = (d: Database, kind: string, message: string, memberId?: string) => {
    const ev: ActivityEvent = { id: uid("act"), at: new Date().toISOString(), kind, message, memberId };
    d.activity = [ev, ...d.activity].slice(0, 100);
  };

  const value: StoreValue = useMemo(() => {
    return {
      db,
      ready,
      mode: "supabase",
      month,
      setMonth,

      addTransaction: (t) =>
        run(
          (d) => {
            d.transactions.unshift({ ...t, id: uid("tx"), createdAt: new Date().toISOString() });
            const label = t.type === "income" ? "دخل" : t.type === "transfer" ? "تحويل" : "مصروف";
            localActivity(d, "tx.create", `أضاف ${label}: ${t.merchant} ₪${t.amount}`, t.memberId);
          },
          async () => {
            await repo.insertTransaction(sb, householdId, t);
            const label = t.type === "income" ? "دخل" : t.type === "transfer" ? "تحويل" : "مصروف";
            await repo.logActivity(sb, householdId, "tx.create", `أضاف ${label}: ${t.merchant} ₪${t.amount}`);
          }
        ),

      updateTransaction: (id, patch) =>
        run(
          (d) => {
            const i = d.transactions.findIndex((x) => x.id === id);
            if (i >= 0) d.transactions[i] = { ...d.transactions[i], ...patch };
          },
          () => repo.updateTransactionRow(sb, id, patch)
        ),

      deleteTransaction: (id) =>
        run(
          (d) => {
            const t = d.transactions.find((x) => x.id === id);
            if (t) t.deletedAt = new Date().toISOString();
          },
          () => repo.updateTransactionRow(sb, id, { deletedAt: new Date().toISOString() })
        ),

      addAccount: (a) =>
        run(
          (d) => d.accounts.push({ ...a, id: uid("acc") }),
          () => repo.insertAccount(sb, householdId, a)
        ),

      updateAccount: (id, patch) =>
        run(
          (d) => {
            const i = d.accounts.findIndex((x) => x.id === id);
            if (i >= 0) d.accounts[i] = { ...d.accounts[i], ...patch };
          },
          async () => {
            const row: Record<string, unknown> = {};
            if (patch.name !== undefined) row.name = patch.name;
            if (patch.kind !== undefined) row.kind = patch.kind;
            if (patch.openingBalance !== undefined) row.opening_balance = Math.round(patch.openingBalance * 100);
            if (patch.archived !== undefined) row.archived = patch.archived;
            await sb.from("accounts").update(row).eq("id", id);
          }
        ),

      addBudget: (b) =>
        run(
          (d) => d.budgets.push({ ...b, id: uid("bud") }),
          () => repo.insertBudget(sb, householdId, b)
        ),

      updateBudget: (id, patch) =>
        run(
          (d) => {
            const i = d.budgets.findIndex((x) => x.id === id);
            if (i >= 0) d.budgets[i] = { ...d.budgets[i], ...patch };
          },
          async () => {
            const row: Record<string, unknown> = {};
            if (patch.name !== undefined) row.name = patch.name;
            if (patch.amount !== undefined) row.amount = Math.round(patch.amount * 100);
            await sb.from("budgets").update(row).eq("id", id);
          }
        ),

      deleteBudget: (id) =>
        run(
          (d) => (d.budgets = d.budgets.filter((x) => x.id !== id)),
          () => repo.deleteBudgetRow(sb, id)
        ),

      addBill: (b) =>
        run(
          (d) => d.bills.push({ ...b, id: uid("bill"), paidMonths: [] }),
          () => repo.insertBill(sb, householdId, b)
        ),

      updateBill: (id, patch) =>
        run(
          (d) => {
            const i = d.bills.findIndex((x) => x.id === id);
            if (i >= 0) d.bills[i] = { ...d.bills[i], ...patch };
          },
          async () => {
            const row: Record<string, unknown> = {};
            if (patch.name !== undefined) row.name = patch.name;
            if (patch.amount !== undefined) row.amount = Math.round(patch.amount * 100);
            if (patch.dueDay !== undefined) row.due_day = patch.dueDay;
            await sb.from("bills").update(row).eq("id", id);
          }
        ),

      payBill: (id, createTx = true) => {
        const bill = db.bills.find((x) => x.id === id);
        if (!bill) return;
        const months = bill.paidMonths.includes(month) ? bill.paidMonths : [...bill.paidMonths, month];
        run(
          (d) => {
            const b = d.bills.find((x) => x.id === id);
            if (b) b.paidMonths = months;
            if (createTx) {
              d.transactions.unshift({
                id: uid("tx"),
                type: "expense",
                amount: bill.amount,
                date: new Date().toISOString().slice(0, 10),
                merchant: bill.name,
                categoryId: bill.categoryId,
                accountId: bill.accountId ?? d.accounts[0]?.id ?? "",
                ownership: "shared",
                memberId: bill.memberId,
                recurrence: "none",
                tags: ["فاتورة"],
                createdAt: new Date().toISOString(),
              });
            }
            localActivity(d, "bill.paid", `دفع فاتورة: ${bill.name} ₪${bill.amount}`);
          },
          async () => {
            await repo.setBillPaidMonths(sb, id, months);
            if (createTx) {
              await repo.insertTransaction(sb, householdId, {
                type: "expense",
                amount: bill.amount,
                date: new Date().toISOString().slice(0, 10),
                merchant: bill.name,
                categoryId: bill.categoryId,
                accountId: bill.accountId ?? db.accounts[0]?.id ?? "",
                ownership: "shared",
                memberId: bill.memberId,
                recurrence: "none",
                tags: ["فاتورة"],
              });
            }
            await repo.logActivity(sb, householdId, "bill.paid", `دفع فاتورة: ${bill.name} ₪${bill.amount}`);
          }
        );
      },

      unpayBill: (id) => {
        const bill = db.bills.find((x) => x.id === id);
        if (!bill) return;
        const months = bill.paidMonths.filter((m) => m !== month);
        run(
          (d) => {
            const b = d.bills.find((x) => x.id === id);
            if (b) b.paidMonths = months;
          },
          () => repo.setBillPaidMonths(sb, id, months)
        );
      },

      addSubscription: (s) =>
        run(
          (d) => d.subscriptions.push({ ...s, id: uid("sub") }),
          () => repo.insertSubscription(sb, householdId, s)
        ),

      updateSubscription: (id, patch) =>
        run(
          (d) => {
            const i = d.subscriptions.findIndex((x) => x.id === id);
            if (i >= 0) d.subscriptions[i] = { ...d.subscriptions[i], ...patch };
          },
          () => repo.updateSubscriptionRow(sb, id, patch)
        ),

      addGoal: (g) =>
        run(
          (d) => d.goals.push({ ...g, id: uid("goal"), contributions: [] }),
          () => repo.insertGoal(sb, householdId, g)
        ),

      addContribution: (goalId, amount, memberId) =>
        run(
          (d) => {
            const g = d.goals.find((x) => x.id === goalId);
            if (g) {
              g.contributions.push({ id: uid("con"), amount, date: new Date().toISOString().slice(0, 10), memberId });
              localActivity(d, "goal.add", `أضاف ₪${amount} إلى هدف «${g.name}»`, memberId);
            }
          },
          async () => {
            await repo.insertContribution(sb, householdId, goalId, amount, memberId);
            const g = db.goals.find((x) => x.id === goalId);
            await repo.logActivity(sb, householdId, "goal.add", `أضاف ₪${amount} إلى هدف «${g?.name ?? ""}»`);
          }
        ),

      addCategory: (c) =>
        run(
          (d) => d.categories.push({ ...c, id: uid("cat"), isCustom: true }),
          () => repo.insertCategory(sb, householdId, c)
        ),

      markNotificationRead: (id) =>
        run(
          (d) => {
            const n = d.notifications.find((x) => x.id === id);
            if (n) n.read = true;
          },
          () => repo.markNotifRead(sb, id)
        ),

      markAllRead: () =>
        run(
          (d) => d.notifications.forEach((x) => (x.read = true)),
          () => repo.markAllNotifRead(sb, householdId)
        ),

      updateHousehold: (patch) => {
        const current = db.household.members;
        run(
          (d) => {
            d.household = { ...d.household, ...patch };
          },
          async () => {
            const hp: { name?: string; currency?: string } = {};
            if (patch.name !== undefined) hp.name = patch.name;
            if (patch.currency !== undefined) hp.currency = patch.currency;
            if (Object.keys(hp).length) await repo.updateHouseholdRow(sb, householdId, hp);
            if (patch.members) {
              const next = patch.members;
              for (const r of current.filter((c) => !next.find((n) => n.id === c.id)))
                await repo.removeMemberRow(sb, r.id);
              for (const a of next.filter((n) => !current.find((c) => c.id === n.id)))
                await repo.addMemberRow(sb, householdId, a.name, a.color);
            }
          }
        );
      },

      resetDemo: () => {
        // No-op in real mode; data lives in Supabase.
      },
    };
  }, [db, ready, month, run, sb, householdId]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
