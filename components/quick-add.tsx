"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Modal, Field, Input, Select, Segmented, Textarea } from "./form";
import { Button } from "./ui";
import type { Ownership, TxType } from "@/lib/types";
import { accountKindLabel } from "@/lib/calc";

interface UIContextValue {
  openAdd: (type?: TxType) => void;
}
const UIContext = createContext<UIContextValue | null>(null);
export const useUI = () => {
  const c = useContext(UIContext);
  if (!c) throw new Error("useUI outside provider");
  return c;
};

const TODAY = () => new Date().toISOString().slice(0, 10);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TxType>("expense");

  const value = useMemo<UIContextValue>(
    () => ({
      openAdd: (t) => {
        if (t) setType(t);
        setOpen(true);
      },
    }),
    []
  );

  return (
    <UIContext.Provider value={value}>
      {children}
      <AddTransactionModal open={open} onClose={() => setOpen(false)} type={type} setType={setType} />
    </UIContext.Provider>
  );
}

function AddTransactionModal({
  open,
  onClose,
  type,
  setType,
}: {
  open: boolean;
  onClose: () => void;
  type: TxType;
  setType: (t: TxType) => void;
}) {
  const { db, addTransaction } = useStore();
  const members = db.household.members;

  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState(db.accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(db.accounts[1]?.id ?? "");
  const [who, setWho] = useState<string>("shared"); // memberId | "shared"
  const [split, setSplit] = useState(false);
  const [date, setDate] = useState(TODAY());
  const [notes, setNotes] = useState("");

  // reset when opened
  useEffect(() => {
    if (open) {
      setAmount("");
      setMerchant("");
      setCategoryId("");
      setNotes("");
      setSplit(false);
      setDate(TODAY());
      setAccountId(db.accounts[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cats = db.categories.filter((c) =>
    type === "income" ? c.kind === "income" : c.kind === "expense"
  );

  const amt = parseFloat(amount);
  const valid =
    !!amount &&
    amt > 0 &&
    (type === "transfer" ? accountId !== toAccountId : merchant.trim().length > 0);

  function save() {
    if (!valid) return;
    let ownership: Ownership = who === "shared" ? "shared" : "personal";
    let splits;
    let memberId: string | undefined = who === "shared" ? undefined : who;

    if (type !== "transfer" && who === "shared" && split && members.length > 1) {
      ownership = "split";
      const each = Math.round((amt / members.length) * 100) / 100;
      splits = members.map((m, i) => ({
        memberId: m.id,
        amount: i === members.length - 1 ? amt - each * (members.length - 1) : each,
      }));
      memberId = members[0].id;
    }

    addTransaction({
      type,
      amount: amt,
      date,
      merchant: type === "transfer" ? merchant || "تحويل بين الحسابات" : merchant.trim(),
      categoryId: type === "transfer" ? undefined : categoryId || undefined,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : undefined,
      ownership,
      memberId,
      splits,
      notes: notes.trim() || undefined,
      recurrence: "none",
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة جديدة"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            إلغاء
          </Button>
          <Button className="flex-1" onClick={save} disabled={!valid}>
            حفظ
          </Button>
        </div>
      }
    >
      <div className="mb-4">
        <Segmented<TxType>
          value={type}
          onChange={setType}
          options={[
            { value: "expense", label: "مصروف" },
            { value: "income", label: "دخل" },
            { value: "transfer", label: "تحويل" },
          ]}
        />
      </div>

      <Field label="المبلغ">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-muted">₪</span>
          <Input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="pr-8 text-lg font-bold"
            autoFocus
          />
        </div>
      </Field>

      {type !== "transfer" && (
        <Field label="ما هذا؟">
          <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="مثال: سوبرماركت" />
        </Field>
      )}

      {type !== "transfer" && (
        <Field label="الفئة">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— بدون فئة —</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.group} · {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {type === "transfer" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="من حساب">
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {db.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="إلى حساب">
            <Select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
              {db.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </Field>
        </div>
      ) : (
        <>
          <Field label="من؟">
            <Segmented<string>
              value={who}
              onChange={setWho}
              options={[
                ...members.map((m) => ({ value: m.id, label: m.name })),
                { value: "shared", label: "مشترك" },
              ]}
            />
          </Field>

          {who === "shared" && type === "expense" && members.length > 1 && (
            <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} className="h-4 w-4 accent-[color:var(--brand)]" />
              قسّم بالتساوي بيننا
            </label>
          )}

          <Field label="الحساب">
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {db.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {accountKindLabel(a.kind)}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}

      <Field label="التاريخ">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <Field label="ملاحظات (اختياري)">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي تفاصيل إضافية…" />
      </Field>
    </Modal>
  );
}
