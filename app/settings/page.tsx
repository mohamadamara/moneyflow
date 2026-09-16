"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Download, Upload, RotateCcw, UserPlus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageTitle, Card, CardHeader, Button, Badge } from "@/components/ui";
import { Field, Input, Select, Modal } from "@/components/form";
import { transactionsToCSV, downloadText, parseCSV } from "@/lib/csv";
import type { CurrencyCode, MemberRole, Transaction } from "@/lib/types";

const ROLE_LABEL: Record<MemberRole, string> = { owner: "المالك", partner: "شريك", viewer: "مشاهد" };

export default function SettingsPage() {
  const { db, ready, updateHousehold, resetDemo, addTransaction } = useStore();
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [importOpen, setImportOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [newMember, setNewMember] = useState("");

  useEffect(() => { if (ready) setName(db.household.name); }, [ready, db.household.name]);
  useEffect(() => {
    const saved = (localStorage.getItem("hmos:theme") as typeof theme) || "system";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function applyTheme(t: typeof theme) {
    const root = document.documentElement;
    if (t === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
    localStorage.setItem("hmos:theme", t);
  }

  if (!ready) return null;

  const supaConnected = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <div className="max-w-3xl">
      <PageTitle title="الإعدادات" />

      <div className="space-y-5">
        {/* Household */}
        <Card>
          <CardHeader title="الأسرة" />
          <div className="p-5 pt-4">
            <Field label="اسم الأسرة">
              <div className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
                <Button onClick={() => updateHousehold({ name: name.trim() || db.household.name })}>حفظ</Button>
              </div>
            </Field>

            <p className="mb-2 mt-4 text-sm font-semibold text-ink">الأعضاء</p>
            <div className="space-y-2">
              {db.household.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: m.color }}>{m.name.slice(0, 1)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{m.name}</p>
                    {m.email && <p className="text-xs text-muted">{m.email}</p>}
                  </div>
                  <Badge tone={m.role === "owner" ? "brand" : "neutral"}>{ROLE_LABEL[m.role]}</Badge>
                  {m.role !== "owner" && (
                    <button
                      onClick={() => updateHousehold({ members: db.household.members.filter((x) => x.id !== m.id) })}
                      className="text-faint hover:text-neg" aria-label="إزالة"
                    ><Trash2 size={15} /></button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="اسم عضو جديد" />
              <Button variant="outline" disabled={!newMember.trim()} onClick={() => {
                const colors = ["#ec4899", "#0ea5e9", "#14b8a6", "#a855f7", "#f59e0b"];
                updateHousehold({ members: [...db.household.members, { id: `m-${Date.now().toString(36)}`, name: newMember.trim(), role: "partner", color: colors[db.household.members.length % colors.length] }] });
                setNewMember("");
              }}>
                <UserPlus size={16} /> إضافة
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">دعوة شريك بالبريد الإلكتروني تتطلّب ربط خدمة Supabase (انظر أدناه).</p>
          </div>
        </Card>

        {/* Currency & theme */}
        <Card>
          <CardHeader title="التفضيلات" />
          <div className="grid gap-4 p-5 pt-4 sm:grid-cols-2">
            <Field label="العملة">
              <Select value={db.household.currency} onChange={(e) => updateHousehold({ currency: e.target.value as CurrencyCode })}>
                <option value="ILS">₪ شيكل (ILS)</option>
                <option value="USD">$ دولار (USD)</option>
                <option value="EUR">€ يورو (EUR)</option>
                <option value="GBP">£ جنيه (GBP)</option>
              </Select>
            </Field>
            <Field label="المظهر">
              <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
                {([["light", "فاتح", Sun], ["dark", "داكن", Moon], ["system", "تلقائي", Sun]] as const).map(([val, label, IconC]) => (
                  <button key={val} onClick={() => { setTheme(val); applyTheme(val); }} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold ${theme === val ? "bg-surface text-ink shadow-card" : "text-muted"}`}>
                    <IconC size={15} /> {label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader title="البيانات" sub="بياناتك ملكك — استوردها أو صدّرها في أي وقت" />
          <div className="flex flex-wrap gap-2 p-5 pt-4">
            <Button variant="outline" onClick={() => downloadText(`ميزان-تصدير.csv`, transactionsToCSV(db))}><Download size={16} /> تصدير المعاملات</Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}><Upload size={16} /> استيراد CSV</Button>
            <div className="flex-1" />
            {confirmReset ? (
              <div className="flex gap-2">
                <Button variant="danger" onClick={() => { resetDemo(); setConfirmReset(false); }}>تأكيد إعادة التعيين</Button>
                <Button variant="ghost" onClick={() => setConfirmReset(false)}>تراجع</Button>
              </div>
            ) : (
              <Button variant="ghost" className="!text-neg" onClick={() => setConfirmReset(true)}><RotateCcw size={16} /> إعادة تعيين البيانات التجريبية</Button>
            )}
          </div>
        </Card>

        {/* Backend status */}
        <Card>
          <CardHeader title="الخادم (Supabase)" />
          <div className="p-5 pt-4 text-sm">
            <div className="mb-3 flex items-center gap-2">
              <Badge tone={supaConnected ? "pos" : "warn"}>{supaConnected ? "متّصل" : "الوضع المحلي (تجريبي)"}</Badge>
            </div>
            <p className="text-muted">
              يعمل التطبيق حاليًا في الوضع المحلي وتُحفظ البيانات في متصفّحك. لتفعيل حساب المستخدمين المتعدّدين والمزامنة والدعوات:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pr-5 text-muted">
              <li>أنشئ مشروعًا على supabase.com</li>
              <li>نفّذ ملفّي <code className="rounded bg-surface-2 px-1">supabase/schema.sql</code> ثم <code className="rounded bg-surface-2 px-1">supabase/policies.sql</code></li>
              <li>ضع المفاتيح في <code className="rounded bg-surface-2 px-1">.env.local</code> ثم أعد التشغيل</li>
            </ol>
          </div>
        </Card>
      </div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={(txs) => { txs.forEach((t) => addTransaction(t)); setImportOpen(false); }} />
    </div>
  );
}

function ImportModal({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (t: Omit<Transaction, "id" | "createdAt">[]) => void }) {
  const { db } = useStore();
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState({ date: 0, desc: 1, amount: 2 });

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRows(parseCSV(String(reader.result)));
    reader.readAsText(file);
  }

  const body = rows.slice(1, 6);
  const acc = db.accounts[0]?.id ?? "";

  function doImport() {
    const data = rows.slice(1);
    const txs: Omit<Transaction, "id" | "createdAt">[] = [];
    for (const r of data) {
      const amt = parseFloat((r[map.amount] ?? "").replace(/[^\d.-]/g, ""));
      if (isNaN(amt) || amt === 0) continue;
      txs.push({
        type: amt >= 0 ? "income" : "expense",
        amount: Math.abs(amt),
        date: (r[map.date] ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
        merchant: r[map.desc] ?? "مستورد",
        accountId: acc,
        ownership: "shared",
        recurrence: "none",
        tags: ["مستورد"],
      });
    }
    onImport(txs);
    setRows([]);
  }

  return (
    <Modal open={open} onClose={onClose} title="استيراد من CSV" wide
      footer={rows.length > 0 ? (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
          <Button className="flex-1" onClick={doImport}>استيراد {rows.length - 1} عملية</Button>
        </div>
      ) : undefined}
    >
      {rows.length === 0 ? (
        <div>
          <p className="mb-4 text-sm text-muted">اختر ملف CSV يحتوي على أعمدة: التاريخ، الوصف، المبلغ. القيم الموجبة دخل والسالبة مصروف.</p>
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="block w-full text-sm text-muted file:ml-3 file:rounded-xl file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
        </div>
      ) : (
        <div>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {(["date", "desc", "amount"] as const).map((k) => (
              <Field key={k} label={{ date: "عمود التاريخ", desc: "عمود الوصف", amount: "عمود المبلغ" }[k]}>
                <Select value={map[k]} onChange={(e) => setMap((m) => ({ ...m, [k]: parseInt(e.target.value) }))}>
                  {(rows[0] ?? []).map((h, i) => (<option key={i} value={i}>{h || `عمود ${i + 1}`}</option>))}
                </Select>
              </Field>
            ))}
          </div>
          <p className="mb-2 text-xs font-semibold text-muted">معاينة</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-right text-sm">
              <thead className="bg-surface-2 text-xs text-muted"><tr><th className="p-2">التاريخ</th><th className="p-2">الوصف</th><th className="p-2">المبلغ</th></tr></thead>
              <tbody>
                {body.map((r, i) => (
                  <tr key={i} className="border-t border-border"><td className="p-2">{r[map.date]}</td><td className="p-2">{r[map.desc]}</td><td className="tnum p-2">{r[map.amount]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
