"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { goalSaved, goalRatio, goalEtaMonths } from "@/lib/calc";
import { money, percent, fmtMonth } from "@/lib/format";
import { PageTitle, Card, Button, EmptyState, Skeleton, Progress } from "@/components/ui";
import { Modal, Field, Input } from "@/components/form";
import type { SavingsGoal } from "@/lib/types";

export default function GoalsPage() {
  const { db, ready, addGoal, addContribution } = useStore();
  const cur = db.household.currency;
  const [open, setOpen] = useState(false);
  const [contribFor, setContribFor] = useState<SavingsGoal | null>(null);

  if (!ready) return <Skeleton className="h-96 rounded-2xl" />;

  return (
    <div>
      <PageTitle title="أهداف الادخار" sub="لأجل ماذا تدّخرون" action={<Button onClick={() => setOpen(true)}>+ هدف</Button>} />

      {db.goals.length === 0 ? (
        <Card>
          <EmptyState title="لا أهداف بعد" desc="أنشئ هدفًا (إجازة، صندوق طوارئ، سيارة…) وتابع تقدّمكم نحوه." action={<Button onClick={() => setOpen(true)}>+ إنشاء هدف</Button>} />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {db.goals.map((g) => {
            const saved = goalSaved(g);
            const ratio = goalRatio(g);
            const eta = goalEtaMonths(g);
            const done = ratio >= 1;
            return (
              <Card key={g.id} className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-bold text-ink">{g.name}</p>
                    {g.targetDate && <p className="text-xs text-muted">الموعد المستهدف: {fmtMonth(g.targetDate)}</p>}
                  </div>
                  <span className="tnum text-lg font-extrabold text-brand">{percent(ratio * 100)}</span>
                </div>
                <Progress value={ratio} tone={done ? "pos" : "brand"} />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="tnum font-bold text-ink">{money(saved, cur)}</span>
                  <span className="tnum text-muted">من {money(g.target, cur)}</span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {done ? "🎉 تم تحقيق الهدف!" : eta ? `بمعدّلكم الحالي: ~${eta} أشهر للاكتمال` : "أضف مساهمة لتقدير موعد الاكتمال"}
                </p>
                <Button variant="soft" size="sm" className="mt-3 w-full" onClick={() => setContribFor(g)}>+ إضافة مساهمة</Button>
              </Card>
            );
          })}
        </div>
      )}

      <AddGoalModal open={open} onClose={() => setOpen(false)} onSave={(g) => { addGoal(g); setOpen(false); }} />
      <ContribModal goal={contribFor} onClose={() => setContribFor(null)} onSave={(amt, mid) => { if (contribFor) addContribution(contribFor.id, amt, mid); setContribFor(null); }} />
    </div>
  );
}

function AddGoalModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (g: Omit<SavingsGoal, "id" | "contributions">) => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [monthly, setMonthly] = useState("");
  const [targetDate, setTargetDate] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إنشاء هدف ادخار"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
          <Button className="flex-1" disabled={!name.trim() || !target} onClick={() => onSave({ name: name.trim(), target: parseFloat(target), monthlyContribution: monthly ? parseFloat(monthly) : undefined, targetDate: targetDate || undefined })}>حفظ</Button>
        </div>
      }
    >
      <Field label="اسم الهدف"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: إجازة الصيف" autoFocus /></Field>
      <Field label="المبلغ المستهدف"><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0" /></Field>
      <Field label="مساهمة شهرية (اختياري)"><Input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="0" /></Field>
      <Field label="الموعد المستهدف (اختياري)"><Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></Field>
    </Modal>
  );
}

function ContribModal({ goal, onClose, onSave }: { goal: SavingsGoal | null; onClose: () => void; onSave: (amt: number, memberId?: string) => void }) {
  const { db } = useStore();
  const [amount, setAmount] = useState("");
  const [memberId, setMemberId] = useState<string>("");
  return (
    <Modal
      open={!!goal}
      onClose={onClose}
      title={`مساهمة في «${goal?.name ?? ""}»`}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
          <Button className="flex-1" disabled={!amount} onClick={() => onSave(parseFloat(amount), memberId || undefined)}>إضافة</Button>
        </div>
      }
    >
      <Field label="المبلغ"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus /></Field>
      <Field label="من؟">
        <select className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">مشترك</option>
          {db.household.members.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
        </select>
      </Field>
    </Modal>
  );
}
