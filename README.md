# مِيزان — Household Money OS

> شاهد أموالك بوضوح. اعرف أين تذهب. أدِرها معًا.
> *See your money clearly. Know where it goes. Manage it together.*

A calm, Arabic-first (RTL) household finance app for couples and families.
Built with **Next.js 15 · TypeScript · Tailwind CSS**, architected for **Supabase (PostgreSQL + Auth + Storage)**.

---

## Running the app

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

The app runs immediately in **Local Demo mode** — data is seeded and persists in
your browser (`localStorage`). No backend or keys required. Every screen is live and
clickable: add/edit/delete transactions, pay bills, contribute to goals, import/export
CSV, switch months, toggle dark mode, etc.

---

## Two runtime modes

| | Local Demo (default) | Supabase (production SaaS) |
|---|---|---|
| Data | browser `localStorage` | PostgreSQL, multi-device |
| Users | single (this browser) | multi-user auth + households |
| Sharing | simulated | real partner invitations |
| Security | n/a | Row Level Security, server-enforced |

### Switching to Supabase

1. Create a project at <https://supabase.com>.
2. In the SQL Editor, run **`supabase/schema.sql`** then **`supabase/policies.sql`**.
3. Copy `.env.example` → `.env.local` and fill:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Restart `npm run dev`. Settings → *الخادم (Supabase)* will show **متّصل**.

---

## Architecture

```
app/            App Router pages (dashboard, transactions, budgets, …)
components/     UI: shell, forms, quick-add, widgets, search
lib/
  types.ts      Domain model (single source of truth)
  calc.ts       All financial calculations (pure, tested by usage)
  format.ts     Arabic currency & date formatting
  store.tsx     Local data layer + CRUD + activity log (React context)
  csv.ts        CSV import/export
  data/         Seed data + default categories
  supabase/     Browser + server clients (production path)
  nav.ts        Navigation config
supabase/
  schema.sql    Tables, enums, indexes, foreign keys, triggers
  policies.sql  Row Level Security + storage rules
```

**Design principle:** business logic lives in `lib/`, never inside React components.
Account balances and monthly totals are always **derived** (never stored) so they can't drift.

### Financial correctness

- **Expense** → money leaves the household.
- **Income** → money enters.
- **Transfer** → moves between owned accounts and is **never counted as spending**.
- **Ownership** — every transaction is `personal` (one member), `shared` (household),
  or `split` (explicit per-member amounts). A member's spend = their personal expenses
  + equal share of shared + their split parts.

---

## What clarity looks like

The dashboard answers, in one glance: *how much do we have · what came in · what went
out · where it went · what's coming · are we okay this month.* Money In / Money Out /
Transfer — no debits, credits, or ledgers.

---

## Feature status

**V1 (built & working)**
Dashboard · Accounts · Transactions (+ Quick Add, filters, pagination, edit/soft-delete)
· Income · Expenses · Budgets (warnings) · Bills (mark paid → auto-transaction) ·
Subscriptions · Savings Goals · Shared & Personal dashboards · Reports (month compare +
CSV export) · Notifications · Settings · CSV import · Activity log · Global search ·
Arabic RTL · Dark mode · Full mobile layout with bottom nav.

**Schema-ready for production**
Auth, multi-user households, partner invitations, RLS isolation, receipts storage,
privacy controls, audit trail — all defined in `supabase/`.

**V2 (interfaces prepared, not built)**
AI assistant over authorized data · OCR receipts (fields already in `receipts`) ·
bank / Open Banking integrations · automatic categorization · forecasting.

---

## Notes on safety

The app never asks you to enter bank credentials or card numbers. Partner invitations
by email and any outbound messaging require the Supabase backend and are gated to the
household **owner** via RLS.
