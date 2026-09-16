-- ============================================================
-- Household Money OS — PostgreSQL schema (Supabase)
-- Run this in the Supabase SQL editor BEFORE policies.sql.
-- Money is stored in minor units (agorot/cents) as BIGINT to
-- avoid floating-point drift. The app converts on the edge.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- enums ----------
do $$ begin
  create type member_role as enum ('owner','partner','viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ownership as enum ('personal','shared','split');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tx_type as enum ('expense','income','transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_kind as enum ('bank','savings','cash','credit','investment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type recurrence as enum ('none','weekly','monthly','yearly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sub_status as enum ('active','paused','cancelled');
exception when duplicate_object then null; end $$;

-- ---------- profiles (mirrors auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ---------- households ----------
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'ILS',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null,
  role member_role not null default 'partner',
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);
create index if not exists idx_hm_household on household_members(household_id);
create index if not exists idx_hm_user on household_members(user_id);

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  email text not null,
  role member_role not null default 'partner',
  token uuid not null default gen_random_uuid(),
  accepted boolean not null default false,
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_inv_household on invitations(household_id);

-- ---------- accounts ----------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  kind account_kind not null default 'bank',
  opening_balance bigint not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_acc_household on accounts(household_id);

-- ---------- categories ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  grp text not null,
  icon text not null default 'Ellipsis',
  color text not null default '#64748b',
  kind text not null default 'expense',
  is_custom boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_cat_household on categories(household_id);

-- ---------- transactions ----------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  type tx_type not null,
  amount bigint not null check (amount >= 0),
  occurred_on date not null,
  merchant text not null default '',
  category_id uuid references categories(id) on delete set null,
  account_id uuid not null references accounts(id) on delete cascade,
  to_account_id uuid references accounts(id) on delete set null,
  own ownership not null default 'shared',
  member_id uuid references household_members(id) on delete set null,
  payment_method text,
  notes text,
  tags text[],
  receipt_id uuid,
  recur recurrence not null default 'none',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_tx_household on transactions(household_id);
create index if not exists idx_tx_date on transactions(household_id, occurred_on desc);
create index if not exists idx_tx_category on transactions(category_id);
create index if not exists idx_tx_account on transactions(account_id);
create index if not exists idx_tx_member on transactions(member_id);
create index if not exists idx_tx_not_deleted on transactions(household_id) where deleted_at is null;

create table if not exists transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  amount bigint not null
);
create index if not exists idx_split_tx on transaction_splits(transaction_id);

-- ---------- budgets ----------
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  scope text not null default 'category', -- category | total | personal
  category_id uuid references categories(id) on delete cascade,
  member_id uuid references household_members(id) on delete cascade,
  amount bigint not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_bud_household on budgets(household_id);

-- ---------- bills ----------
create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  amount bigint not null,
  due_day int not null check (due_day between 1 and 28),
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  member_id uuid references household_members(id) on delete set null,
  recur recurrence not null default 'monthly',
  notes text,
  paid_months text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_bill_household on bills(household_id);

-- ---------- subscriptions ----------
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  amount bigint not null,
  cycle text not null default 'monthly', -- monthly | yearly
  next_charge_date date not null,
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  status sub_status not null default 'active',
  created_at timestamptz not null default now()
);
create index if not exists idx_sub_household on subscriptions(household_id);

-- ---------- savings goals ----------
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  target bigint not null,
  target_date date,
  monthly_contribution bigint,
  created_at timestamptz not null default now()
);
create index if not exists idx_goal_household on savings_goals(household_id);

create table if not exists savings_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references savings_goals(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  amount bigint not null,
  contributed_on date not null default current_date,
  member_id uuid references household_members(id) on delete set null
);
create index if not exists idx_contrib_goal on savings_contributions(goal_id);

-- ---------- receipts / documents ----------
create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  transaction_id uuid references transactions(id) on delete set null,
  storage_path text not null,   -- path in the 'receipts' storage bucket
  mime_type text,
  -- fields an OCR/AI layer can fill later without a schema change:
  extracted_merchant text,
  extracted_amount bigint,
  extracted_date date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_receipt_household on receipts(household_id);

-- ---------- notifications ----------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_ntf_user on notifications(user_id, read);

-- ---------- activity events (audit) ----------
create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid references household_members(id) on delete set null,
  actor uuid references auth.users(id),
  kind text not null,
  message text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_act_household on activity_events(household_id, created_at desc);

-- ---------- preferences / settings ----------
create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system',
  share_totals boolean not null default true,
  share_categories boolean not null default true,
  share_transactions boolean not null default false,
  share_notes boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists household_settings (
  household_id uuid primary key references households(id) on delete cascade,
  notify_bills boolean not null default true,
  notify_budgets boolean not null default true,
  notify_savings boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------- helper: membership check (used by policies) ----------
create or replace function is_household_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from household_members hm
    where hm.household_id = hid and hm.user_id = auth.uid()
  );
$$;

create or replace function is_household_owner(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from household_members hm
    where hm.household_id = hid and hm.user_id = auth.uid() and hm.role = 'owner'
  );
$$;

-- auto-create a profile row when a user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
