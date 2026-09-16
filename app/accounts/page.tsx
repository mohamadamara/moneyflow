"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUI } from "@/components/quick-add";
import { accountBalance, totalMoney, accountKindLabel } from "@/lib/calc";
import { money } from "@/lib/format";
import { PageTitle, Card, Button, Skeleton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Modal, Field, Input, Select } from "@/components/form";
import type { AccountKind } from "@/lib/types";

const KIND_ICON: Record<AccountKind, string> = {
  bank: "Landmark",
  savings: "PiggyBank",
  cash: "Banknote",
  credit: "CreditCard",
  investment: "TrendingUp",
};

export default function AccountsPage() {
  const { db, ready, addAccount } = useStore();
  const { openAdd } = useUI();
  const cur = db.household.currency;
  const [addOpen, setAddOpen] = useState(false);

  if (!ready) return <Skeleton className="h-96 rounded-2xl" />;

  const total = totalMoney(db);

  return (
    <div>
      <PageTitle
        title="الحسابات"
        sub={`إجمالي الأموال ${money(total, cur)}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openAdd("transfer")}>تحويل</Button>
            <Button onClick={() => setAddOpen(true)}>+ حساب</Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {db.accounts.map((a) => {
          const bal = accountBalance(db, a.id);
          return (
            <Card key={a.id} className="p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon name={KIND_ICON[a.kind]} size={19} />
                </span>
                <div>
                  <p className="font-bold text-ink">{a.name}</p>
                  <p className="text-xs text-muted">{accountKindLabel(a.kind)}</p>
                </div>
              </div>
              <p className="text-xs text-muted">الرصيد الحالي</p>
              <p className={`tnum text-2xl font-extrabold ${bal < 0 ? "text-neg" : "text-ink"}`}>{money(bal, cur)}</p>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted">
        التحويل بين حساباتك لا يُحتسب كإنفاق — فهو مجرد نقل للأموال.
      </div>

      <AddAccountModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(name, kind, opening) => {
          addAccount({ name, kind, openingBalance: opening });
          setAddOpen(false);
        }}
      />
    </div>
  );
}

function AddAccountModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, kind: AccountKind, opening: number) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("bank");
  const [opening, setOpening] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة حساب"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
          <Button className="flex-1" disabled={!name.trim()} onClick={() => onSave(name.trim(), kind, parseFloat(opening) || 0)}>
            حفظ
          </Button>
        </div>
      }
    >
      <Field label="اسم الحساب">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: الحساب البنكي" autoFocus />
      </Field>
      <Field label="النوع">
        <Select value={kind} onChange={(e) => setKind(e.target.value as AccountKind)}>
          <option value="bank">حساب بنكي</option>
          <option value="savings">حساب توفير</option>
          <option value="cash">نقد</option>
          <option value="credit">بطاقة ائتمان</option>
          <option value="investment">استثمار</option>
        </Select>
      </Field>
      <Field label="الرصيد الافتتاحي" hint="الرصيد الحالي في هذا الحساب الآن">
        <Input type="number" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0" />
      </Field>
    </Modal>
  );
}
