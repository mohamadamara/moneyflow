"use client";

import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal, Field, Input, Select, Textarea } from "./form";
import { Button } from "./ui";
import { useStore } from "@/lib/store";
import type { Transaction } from "@/lib/types";

export function TxDetail({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) {
  const { db, updateTransaction, deleteTransaction } = useStore();
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (tx) {
      setMerchant(tx.merchant);
      setAmount(String(tx.amount));
      setCategoryId(tx.categoryId ?? "");
      setAccountId(tx.accountId);
      setDate(tx.date);
      setNotes(tx.notes ?? "");
      setConfirmDel(false);
    }
  }, [tx]);

  if (!tx) return null;
  const cats = db.categories.filter((c) => (tx.type === "income" ? c.kind === "income" : c.kind === "expense"));

  function save() {
    if (!tx) return;
    updateTransaction(tx.id, {
      merchant: merchant.trim(),
      amount: parseFloat(amount) || tx.amount,
      categoryId: categoryId || undefined,
      accountId,
      date,
      notes: notes.trim() || undefined,
    });
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
      title={`تفاصيل ${typeLabel}`}
      footer={
        <div className="flex items-center gap-2">
          {confirmDel ? (
            <>
              <Button variant="danger" className="flex-1" onClick={del}>
                تأكيد الحذف
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDel(false)}>
                تراجع
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setConfirmDel(true)} className="!text-neg">
                <Trash2 size={16} /> حذف
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={onClose}>
                إغلاق
              </Button>
              <Button onClick={save}>حفظ التعديلات</Button>
            </>
          )}
        </div>
      }
    >
      {tx.type !== "transfer" && (
        <Field label="الوصف">
          <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
        </Field>
      )}
      <Field label="المبلغ">
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      {tx.type !== "transfer" && (
        <Field label="الفئة">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— بدون فئة —</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.group} · {c.name}</option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="الحساب">
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {db.accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="التاريخ">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="ملاحظات">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  );
}
