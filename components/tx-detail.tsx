"use client";

import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal, Field, Input, Select, Textarea, Segmented } from "./form";
import { Button } from "./ui";
import { useStore } from "@/lib/store";
import type { Transaction } from "@/lib/types";

export function TxDetail({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) {
  const { db, updateTransaction, deleteTransaction } = useStore();
  const members = db.household.members;
  const many = members.length > 1;
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [forUs, setForUs] = useState<"us" | "me">("us");
  const [payer, setPayer] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (tx) {
      setMerchant(tx.merchant);
      setAmount(String(tx.amount));
      setCategoryId(tx.categoryId ?? "");
      setAccountId(tx.accountId);
      setDate(tx.date);
      setNotes(tx.notes ?? "");
      setForUs(tx.ownership === "personal" ? "me" : "us");
      setPayer(tx.memberId ?? "");
      setConfirmDel(false);
    }
  }, [tx]);

  if (!tx) return null;
  const cats = db.categories.filter((c) => (tx.type === "income" ? c.kind === "income" : c.kind === "expense"));

  function save() {
    if (!tx) return;
    const patch: Partial<Transaction> = {
      merchant: merchant.trim() || tx.merchant,
      amount: parseFloat(amount) || tx.amount,
      categoryId: categoryId || undefined,
      accountId,
      date,
      notes: notes.trim() || undefined,
    };
    if (many && tx.type !== "transfer") {
      if (tx.type === "expense") {
        const ownership = forUs === "us" ? (tx.ownership === "split" ? "split" : "shared") : "personal";
        if (ownership !== tx.ownership) patch.ownership = ownership;
      }
      if ((payer || undefined) !== tx.memberId) patch.memberId = payer || undefined;
    }
    updateTransaction(tx.id, patch);
    onClose();
  }

  function del() {
    if (!tx) return;
    deleteTransaction(tx.id);
    onClose();
  }

  const typeLabel = tx.type === "income" ? "دخل" : tx.type === "transfer" ? "تحويل" : "مصروف";

  return (
    <Modal
      open={!!tx}
      onClose={onClose}
      title={typeLabel}
      footer={
        <div className="flex items-center gap-2">
          {confirmDel ? (
            <>
              <Button variant="danger" size="lg" className="flex-1" onClick={del}>
                نعم، احذف
              </Button>
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setConfirmDel(false)}>
                تراجع
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="lg" onClick={() => setConfirmDel(true)} className="!text-neg" aria-label="حذف">
                <Trash2 size={18} /> حذف
              </Button>
              <Button size="lg" className="flex-1" onClick={save}>
                حفظ
              </Button>
            </>
          )}
        </div>
      }
    >
      <Field label="المبلغ">
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="tnum text-lg font-bold" />
      </Field>
      {tx.type !== "transfer" && (
        <Field label="الوصف">
          <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
        </Field>
      )}

      {many && tx.type === "expense" && (
        <div className="mb-4">
          <span className="mb-1.5 block text-sm font-semibold text-ink">لمن هذا المصروف؟</span>
          <Segmented
            value={forUs}
            onChange={setForUs}
            options={[
              { value: "us", label: "لنا الاثنين" },
              { value: "me", label: "لشخص واحد" },
            ]}
          />
        </div>
      )}
      {many && tx.type !== "transfer" && (
        <Field label={tx.type === "income" ? "لمن الدخل؟" : forUs === "us" ? "من دفع؟" : "لمن؟"}>
          <Select value={payer} onChange={(e) => setPayer(e.target.value)}>
            {!payer && <option value="">— اختر —</option>}
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {tx.type !== "transfer" && (
        <Field label="الفئة">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— بدون فئة —</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="التاريخ">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="الحساب">
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {db.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="ملاحظات">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  );
}
