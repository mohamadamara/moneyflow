import type { Database, Transaction } from "./types";
import { activeTx } from "./calc";

// Build a CSV string of transactions (the user's own data, exported locally).
export function transactionsToCSV(db: Database): string {
  const header = ["التاريخ", "النوع", "الوصف", "الفئة", "الحساب", "المالك", "المبلغ", "ملاحظات"];
  const typeLabel: Record<Transaction["type"], string> = { expense: "مصروف", income: "دخل", transfer: "تحويل" };
  const rows = activeTx(db)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((t) => {
      const c = db.categories.find((x) => x.id === t.categoryId);
      const acc = db.accounts.find((x) => x.id === t.accountId);
      const owner =
        t.ownership === "shared" ? "مشترك" : t.ownership === "split" ? "مقسّم" : db.household.members.find((m) => m.id === t.memberId)?.name ?? "";
      const signed = t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : t.amount;
      return [t.date, typeLabel[t.type], t.merchant, c?.name ?? "", acc?.name ?? "", owner, String(signed), t.notes ?? ""];
    });
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

function csvCell(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  // BOM so Excel reads Arabic + UTF-8 correctly
  const blob = new Blob(["﻿" + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- Simple CSV parse for import ----
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += ch;
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}
