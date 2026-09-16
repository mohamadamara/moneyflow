"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { budgetStatus } from "@/lib/calc";
import { money, percent } from "@/lib/format";
import { PageTitle, Card, Button, Badge, EmptyState, Skeleton, Progress } from "@/components/ui";
import { Modal, Field, Input, Select, Segmented } from "@/components/form";
import type { Budget } from "@/lib/types";

export default function BudgetsPage() {
  const { db, ready, month, addBudget, deleteBudget } = useStore();
  const cur = db.household.currency;
  const [open, setOpen] = useState(false);

  if (!ready) return <Skeleton className="h-96 rounded-2xl" />;

  const statuses = db.budgets.map((b) => budgetStatus(db, b, month));

  return (
    <div>
      <PageTitle title="الميزانيات" sub="حدود إنفاق شهرية تساعدكم على البقاء ضمن الخطة" action={<Button onClick={() => setOpen(true)}>+ ميزانية</Button>} />

      {db.budgets.length === 0 ? (
        <Card>
          <EmptyState title="لا ميزانيات بعد" desc="أنشئ ميزانية لفئة أو للإنفاق الكلّي وسننبّهك قبل تجاوزها." action={<Button onClick={() => setOpen(true)}>+ إنشاء ميزانية</Button>} />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {statuses.map((s) => {
            const tone = s.level === "over" ? "neg" : s.level === "danger" ? "neg" : s.level === "warn" ? "warn" : "pos";
            const badge =
              s.level === "over" ? <Badge tone="neg">تجاوزت</Badge> :
              s.level === "danger" ? <Badge tone="neg">{percent(s.ratio * 100)}</Badge> :
              s.level === "warn" ? <Badge tone="warn">{percent(s.ratio * 100)}</Badge> :
              <Badge tone="pos">{percent(s.ratio * 100)}</Badge>;
            return (
              <Card key={s.budget.id} className="p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-bold text-ink">{s.budget.name}</p>
                    <p className="text-xs text-muted">
                      {s.budget.scope === "total" ? "إجمالي الإنفاق" : s.budget.scope === "personal" ? "إنفاق شخصي" : "فئة"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {badge}
                    <button onClick={() => deleteBudget(s.budget.id)} className="text-faint hover:text-neg" aria-label="حذف"><Trash2 size={15} /></button>
                  </div>
                </div>
                <Progress value={s.ratio} tone={tone as "pos" | "warn" | "neg"} />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="tnum text-muted">أنفقت {money(s.spent, cur)}</span>
                  <span className={`tnum font-semibold ${s.remaining < 0 ? "text-neg" : "text-ink"}`}>
                    {s.remaining < 0 ? "تجاوز " : "متبقّي "}{money(Math.abs(s.remaining), cur)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-faint">من أصل {money(s.budget.amount, cur)}</p>
              </Card>
            );
          })}
        </div>
      )}

      <AddBudgetModal open={open} onClose={() => setOpen(false)} onSave={(b) => { addBudget(b); setOpen(false); }} />
    </div>
  );
}

function AddBudgetModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (b: Omit<Budget, "id">) => void }) {
  const { db } = useStore();
  const [scope, setScope] = useState<Budget["scope"]>("category");
  const [categoryId, setCategoryId] = useState(db.categories.find((c) => c.kind === "expense")?.id ?? "");
  const [memberId, setMemberId] = useState(db.household.members[0]?.id ?? "");
  const [amount, setAmount] = useState("");

  const name =
    scope === "total" ? "إجمالي الإنفاق" :
    scope === "personal" ? `إنفاق ${db.household.members.find((m) => m.id === memberId)?.name ?? ""}` :
    db.categories.find((c) => c.id === categoryId)?.name ?? "ميزانية";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إنشاء ميزانية"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
          <Button className="flex-1" disabled={!amount || parseFloat(amount) <= 0} onClick={() => onSave({ name, scope, amount: parseFloat(amount), categoryId: scope === "category" ? categoryId : undefined, memberId: scope === "personal" ? memberId : undefined })}>حفظ</Button>
        </div>
      }
    >
      <Field label="نوع الميزانية">
        <Segmented<Budget["scope"]>
          value={scope}
          onChange={setScope}
          options={[
            { value: "category", label: "فئة" },
            { value: "total", label: "الكل" },
            { value: "personal", label: "شخصي" },
          ]}
        />
      </Field>
      {scope === "category" && (
        <Field label="الفئة">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {db.categories.filter((c) => c.kind === "expense").map((c) => (
              <option key={c.id} value={c.id}>{c.group} · {c.name}</option>
            ))}
          </Select>
        </Field>
      )}
      {scope === "personal" && (
        <Field label="الشخص">
          <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            {db.household.members.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </Select>
        </Field>
      )}
      <Field label="الحد الشهري">
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />
      </Field>
    </Modal>
  );
}
