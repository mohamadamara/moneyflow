-- ============================================================
-- Household Money OS — Row Level Security
-- Run AFTER schema.sql. Enforces: a user can only ever touch
-- data belonging to a household they are a member of.
-- All access is validated server-side by Postgres — the client
-- is never trusted.
-- ============================================================

-- Enable RLS on every table.
alter table profiles              enable row level security;
alter table households            enable row level security;
alter table household_members     enable row level security;
alter table invitations           enable row level security;
alter table accounts              enable row level security;
alter table categories            enable row level security;
alter table transactions          enable row level security;
alter table transaction_splits    enable row level security;
alter table budgets               enable row level security;
alter table bills                 enable row level security;
alter table subscriptions         enable row level security;
alter table savings_goals         enable row level security;
alter table savings_contributions enable row level security;
alter table receipts              enable row level security;
alter table notifications         enable row level security;
alter table activity_events       enable row level security;
alter table user_preferences      enable row level security;
alter table household_settings    enable row level security;

-- ---------- profiles ----------
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- ---------- households ----------
drop policy if exists "read own households" on households;
create policy "read own households" on households
  for select using (is_household_member(id));

drop policy if exists "create household" on households;
create policy "create household" on households
  for insert with check (created_by = auth.uid());

drop policy if exists "owner updates household" on households;
create policy "owner updates household" on households
  for update using (is_household_owner(id)) with check (is_household_owner(id));

drop policy if exists "owner deletes household" on households;
create policy "owner deletes household" on households
  for delete using (is_household_owner(id));

-- ---------- household_members ----------
drop policy if exists "read members" on household_members;
create policy "read members" on household_members
  for select using (is_household_member(household_id));

drop policy if exists "owner manages members" on household_members;
create policy "owner manages members" on household_members
  for all using (is_household_owner(household_id))
  with check (is_household_owner(household_id));

-- allow a user to insert themselves as the first (owner) member
drop policy if exists "self join as owner" on household_members;
create policy "self join as owner" on household_members
  for insert with check (user_id = auth.uid());

-- ---------- invitations ----------
drop policy if exists "members read invitations" on invitations;
create policy "members read invitations" on invitations
  for select using (is_household_member(household_id));

drop policy if exists "owner manages invitations" on invitations;
create policy "owner manages invitations" on invitations
  for all using (is_household_owner(household_id))
  with check (is_household_owner(household_id));

-- ---------- generic household-scoped tables ----------
-- Reusable pattern: SELECT/INSERT/UPDATE/DELETE allowed only to members.
do $$
declare t text;
begin
  foreach t in array array[
    'accounts','categories','transactions','budgets','bills',
    'subscriptions','savings_goals','savings_contributions',
    'receipts','activity_events'
  ] loop
    execute format('drop policy if exists "members access %1$s" on %1$s;', t);
    execute format(
      'create policy "members access %1$s" on %1$s
         for all using (is_household_member(household_id))
         with check (is_household_member(household_id));', t);
  end loop;
end $$;

-- ---------- transaction_splits (scoped via parent transaction) ----------
drop policy if exists "members access splits" on transaction_splits;
create policy "members access splits" on transaction_splits
  for all using (
    exists (
      select 1 from transactions tx
      where tx.id = transaction_id and is_household_member(tx.household_id)
    )
  ) with check (
    exists (
      select 1 from transactions tx
      where tx.id = transaction_id and is_household_member(tx.household_id)
    )
  );

-- ---------- notifications (per-user within household) ----------
drop policy if exists "own notifications" on notifications;
create policy "own notifications" on notifications
  for all using (user_id = auth.uid() and is_household_member(household_id))
  with check (user_id = auth.uid() and is_household_member(household_id));

-- ---------- preferences / settings ----------
drop policy if exists "own preferences" on user_preferences;
create policy "own preferences" on user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "members read settings" on household_settings;
create policy "members read settings" on household_settings
  for select using (is_household_member(household_id));

drop policy if exists "owner writes settings" on household_settings;
create policy "owner writes settings" on household_settings
  for all using (is_household_owner(household_id))
  with check (is_household_owner(household_id));

-- ============================================================
-- Storage bucket for receipts (private). Access is granted only
-- to members of the owning household via the path convention
-- <household_id>/<filename>.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "household receipts read" on storage.objects;
create policy "household receipts read" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and is_household_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "household receipts write" on storage.objects;
create policy "household receipts write" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and is_household_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "household receipts delete" on storage.objects;
create policy "household receipts delete" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and is_household_member(((storage.foldername(name))[1])::uuid)
  );
