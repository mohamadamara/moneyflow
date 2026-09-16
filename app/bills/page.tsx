"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { billStatus, upcomingBillsTotal } from "@/lib/calc";
import { money } from "@/lib/format";
import { PageTitle, Card, Button, Badge, EmptyState, Skeleton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Modal, Field, Input, Select } from "@/components/form";
import type { Bill, BillStatus } from "@/lib/types";

const STATUS_BADGE: Record<BillStatus, { tone: "pos" | "neg" | "warn" | "neutral"; label: string }> = {
  paid: { tone: "pos", label: "مدفوعة" },
  overdue: { tone: "neg", label: "متأخّرة" },
  due_soon: { tone: "warn", label: "مستحقّة قريبًا" },
  upcoming: { tone: "neutral", label: "قادمة" },
};

export default function BillsPage() {
  const { db, ready, addBill, payBill, unpayBill } = useStore();
  const cur = db.household.currency;
  const [open, setOpen] = useState(false);

  if (!ready) return <Skeleton className="h-96 rounded-2xl" />;

  const ref = new Date();
  const withStatus = db.bills
    .map((b) => ({ bill: b, ...billStatus(b, ref) }))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const upcomingTotal = upcomingBillsTotal(db, 31);
  const cat = (id?: string) => db.categories.find((c) => c.id === id);

  return (
    <div>
      <PageTitle title="الفواتير" sub={`قادم خلال هذا الشهر: ${money(upcomingTotal, cur)}`} action={<Button onClick={() => setOpen(true)}>+ فاتورة</Button>} />

      {db.bills.length === 0 ? (
        <Card>
          <EmptyState title="لا فواتير مسجّلة" desc="أضف فواتيرك المتكرّرة (كهرباء، ماء، إنترنت…) لتذكّرك بمواعيدها." action={<Button onClick={() => setOpen(true)}>+ إضافة فاتورة</Button>} />
        </Card>
      ) : (
        <div className="space-y-2">
          {withStatus.map(({ bill, status }) => {
            const b = STATUS_BADGE[status];
            const paid = status === "paid";
            return (
              <Card key={bill.id} className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted">
                  <Icon name={cat(bill.categoryId)?.icon ?? "Receipt"} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">{bill.name}</p>
                  <p className="text-xs text-muted">تُستحق يوم {bill.dueDay} من الشهر</p>
                </div>
                <div className="text-left">
                  <p className="tnum font-bold text-ink">{money(bill.amount, cur)}</p>
                  <Badge tone={b.tone}>{b.label}</Badge>
                </div>
                {paid ? (
                  <Button size="sm" variant="ghost" onClick={() => unpayBill(bill.id)}>تراجع</Button>
                ) : (
                  <Button size="sm" onClick={() => payBill(bill.id, true)}>دفعتُها</Button>
                )}
              </Card>
            );
          })}
          <p className="pt-2 text-center text-xs text-muted">عند وضع علامة «دفعتُها» ننشئ لك عملية مصروف تلقائيًا.</p>
        </div>
      )}

      <AddBillModal open={open} onClose={() => setOpen(false)} onSave={(b) => { addBill(b); setOpen(false); }} />
    </div>
  );
}

function AddBillModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (b: Omit<Bill, "id" | "paidMonths">) => void }) {
  const { db } = useStore();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [categoryId, setCategoryId] = useState("electricity");
  const [accountId, setAccountId] = useState(db.accounts[0]?.id ?? "");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة فاتورة"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
          <Button className="flex-1" disabled={!name.trim() || !amount} onClick={() => onSave({ name: name.trim(), amount: parseFloat(amount), dueDay: Math.min(28, Math.max(1, parseInt(dueDay) || 1)), categoryId, accountId, recurrence: "monthly" })}>حفظ</Button>
        </div>
      }
    >
      <Field label="اسم الفاتورة"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: الكهرباء" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="المبلغ"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field>
        <Field label="يوم الاستحقاق" hint="1 - 28"><Input type="number" value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></Field>
      </div>
      <Field label="الفئة">
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {db.categories.filter((c) => c.kind === "expense").map((c) => (<option key={c.id} value={c.id}>{c.group} · {c.name}</option>))}
        </Select>
      </Field>
      <Field label="الحساب">
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {db.accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
        </Select>
      </Field>
    </Modal>
  );
}
