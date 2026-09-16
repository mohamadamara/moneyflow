"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { subMonthlyTotal, subYearlyTotal } from "@/lib/calc";
import { money, fmtShort } from "@/lib/format";
import { PageTitle, Card, Button, Badge, EmptyState, Skeleton } from "@/components/ui";
import { StatTile } from "@/components/widgets";
import { Icon } from "@/components/icon";
import { Modal, Field, Input, Select, Segmented } from "@/components/form";
import type { Subscription, SubStatus } from "@/lib/types";

const STATUS: Record<SubStatus, { tone: "pos" | "neutral" | "warn"; label: string }> = {
  active: { tone: "pos", label: "نشط" },
  paused: { tone: "warn", label: "متوقّف مؤقتًا" },
  cancelled: { tone: "neutral", label: "ملغى" },
};

export default function SubscriptionsPage() {
  const { db, ready, addSubscription, updateSubscription } = useStore();
  const cur = db.household.currency;
  const [open, setOpen] = useState(false);

  if (!ready) return <Skeleton className="h-96 rounded-2xl" />;

  const monthly = subMonthlyTotal(db.subscriptions);
  const yearly = subYearlyTotal(db.subscriptions);
  const cat = (id?: string) => db.categories.find((c) => c.id === id);

  const cycle = (v: SubStatus) => {
    return v;
  };
  void cycle;

  return (
    <div>
      <PageTitle title="الاشتراكات" sub="تابع مدفوعاتك المتكرّرة" action={<Button onClick={() => setOpen(true)}>+ اشتراك</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatTile label="التكلفة الشهرية" value={money(monthly, cur)} icon="Repeat" tone="brand" />
        <StatTile label="التكلفة السنوية" value={money(yearly, cur)} icon="CalendarClock" />
      </div>

      {db.subscriptions.length === 0 ? (
        <Card>
          <EmptyState title="لا اشتراكات مسجّلة" desc="أضف اشتراكاتك (Netflix، النادي، الإنترنت…) لتعرف تكلفتها الحقيقية." action={<Button onClick={() => setOpen(true)}>+ إضافة اشتراك</Button>} />
        </Card>
      ) : (
        <div className="space-y-2">
          {db.subscriptions.map((s) => {
            const st = STATUS[s.status];
            return (
              <Card key={s.id} className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted">
                  <Icon name={cat(s.categoryId)?.icon ?? "Repeat"} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">{s.name}</p>
                  <p className="text-xs text-muted">{s.cycle === "monthly" ? "شهري" : "سنوي"} · التالي {fmtShort(s.nextChargeDate)}</p>
                </div>
                <div className="text-left">
                  <p className="tnum font-bold text-ink">{money(s.amount, cur)}</p>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                <Select
                  className="!h-8 !w-auto !py-1 text-xs"
                  value={s.status}
                  onChange={(e) => updateSubscription(s.id, { status: e.target.value as SubStatus })}
                >
                  <option value="active">نشط</option>
                  <option value="paused">إيقاف مؤقت</option>
                  <option value="cancelled">إلغاء</option>
                </Select>
              </Card>
            );
          })}
        </div>
      )}

      <AddSubModal open={open} onClose={() => setOpen(false)} onSave={(s) => { addSubscription(s); setOpen(false); }} />
    </div>
  );
}

function AddSubModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (s: Omit<Subscription, "id">) => void }) {
  const { db } = useStore();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [accountId, setAccountId] = useState(db.accounts[0]?.id ?? "");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة اشتراك"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
          <Button className="flex-1" disabled={!name.trim() || !amount} onClick={() => {
            const next = new Date();
            next.setMonth(next.getMonth() + (cycle === "monthly" ? 1 : 12));
            onSave({ name: name.trim(), amount: parseFloat(amount), cycle, nextChargeDate: next.toISOString().slice(0, 10), categoryId: "subscriptions", accountId, status: "active" });
          }}>حفظ</Button>
        </div>
      }
    >
      <Field label="اسم الاشتراك"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: Netflix" autoFocus /></Field>
      <Field label="المبلغ"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field>
      <Field label="الدورة">
        <Segmented value={cycle} onChange={setCycle} options={[{ value: "monthly", label: "شهري" }, { value: "yearly", label: "سنوي" }]} />
      </Field>
      <Field label="الحساب">
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {db.accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
        </Select>
      </Field>
    </Modal>
  );
}
