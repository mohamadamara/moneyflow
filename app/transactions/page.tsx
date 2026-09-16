"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { useStore } from "@/lib/store";
import { useUI } from "@/components/quick-add";
import { activeTx } from "@/lib/calc";
import { relativeDay } from "@/lib/format";
import { PageTitle, Card, Button, EmptyState, Skeleton } from "@/components/ui";
import { TxRow } from "@/components/widgets";
import { Select, Input } from "@/components/form";
import { TxDetail } from "@/components/tx-detail";
import type { Transaction, TxType } from "@/lib/types";

const PAGE = 20;

export default function TransactionsPage() {
  const { db, ready } = useStore();
  const { openAdd } = useUI();
  const cur = db.household.currency;

  const [q, setQ] = useState("");
  const [type, setType] = useState<TxType | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [who, setWho] = useState("");
  const [accountId, setAccountId] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return activeTx(db)
      .filter((t) => (type ? t.type === type : true))
      .filter((t) => (categoryId ? t.categoryId === categoryId : true))
      .filter((t) => (accountId ? t.accountId === accountId || t.toAccountId === accountId : true))
      .filter((t) => {
        if (!who) return true;
        if (who === "shared") return t.ownership === "shared" || t.ownership === "split";
        return t.memberId === who;
      })
      .filter((t) => (term ? t.merchant.toLowerCase().includes(term) || (t.notes ?? "").toLowerCase().includes(term) : true))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [db, q, type, categoryId, who, accountId]);

  const shown = filtered.slice(0, limit);

  // group by day
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of shown) {
      const key = t.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()];
  }, [shown]);

  const cat = (id?: string) => db.categories.find((c) => c.id === id);
  const mem = (id?: string) => db.household.members.find((m) => m.id === id);

  if (!ready) return <Skeleton className="h-96 rounded-2xl" />;

  return (
    <div>
      <PageTitle
        title="المعاملات"
        sub={`${filtered.length} عملية`}
        action={<Button onClick={() => openAdd()}>+ إضافة</Button>}
      />

      {/* Filters */}
      <Card className="mb-5 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
          <Filter size={15} /> تصفية
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Input placeholder="بحث…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={type} onChange={(e) => setType(e.target.value as TxType | "")}>
            <option value="">كل الأنواع</option>
            <option value="expense">مصروف</option>
            <option value="income">دخل</option>
            <option value="transfer">تحويل</option>
          </Select>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">كل الفئات</option>
            {db.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.group} · {c.name}</option>
            ))}
          </Select>
          <Select value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">الجميع</option>
            {db.household.members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
            <option value="shared">مشترك</option>
          </Select>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">كل الحسابات</option>
            {db.accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="لا توجد معاملات"
            desc="أضف أول عملية دخل أو مصروف لتبدأ برؤية تدفّق أموالك."
            action={<Button onClick={() => openAdd()}>+ إضافة عملية</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map(([day, items]) => (
            <div key={day}>
              <p className="mb-1 px-1 text-xs font-bold text-muted">{relativeDay(day)}</p>
              <Card className="p-2">
                {items.map((t) => (
                  <TxRow key={t.id} tx={t} category={cat(t.categoryId)} member={mem(t.memberId)} currency={cur} onClick={() => setSelected(t)} />
                ))}
              </Card>
            </div>
          ))}
          {limit < filtered.length && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
                عرض المزيد ({filtered.length - limit})
              </Button>
            </div>
          )}
        </div>
      )}

      <TxDetail tx={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
