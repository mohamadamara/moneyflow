-- Mizan — update for partner invite codes.
-- Only needed if your database was set up with the older setup.sql.
-- Paste ALL of this into Supabase → SQL Editor and press Run.
-- If Supabase warns about a "destructive operation", press "Run this query":
-- it only replaces one old security rule.

create or replace function is_household_creator(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from households h where h.id = hid and h.created_by = auth.uid());
$$;

-- A user may add themselves only as the owner of a household they just
-- created. (Joining someone else's household goes through join_household,
-- which needs a valid invite code.)
drop policy if exists "self join as owner" on household_members;
create policy "self join as owner" on household_members
  for insert with check (
    user_id = auth.uid() and role = 'owner' and is_household_creator(household_id)
  );

-- ============================================================
-- Partner invite codes (two phones, one household)
-- The owner makes a 6-letter code; the partner types it after signing
-- up and is added to the same household. Codes work once, for 7 days.
-- The table is only reachable through the two functions below.
-- ============================================================
create table if not exists household_invites (
  code text primary key,
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid references household_members(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table household_invites enable row level security;

drop policy if exists "owner reads invites" on household_invites;
create policy "owner reads invites" on household_invites
  for select using (is_household_owner(household_id));

-- owner: make a new code (the old one stops working)
create or replace function create_invite(p_household uuid, p_member uuid default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c text;
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if not is_household_owner(p_household) then
    raise exception 'not allowed';
  end if;
  if p_member is not null and not exists (
    select 1 from household_members
    where id = p_member and household_id = p_household and user_id is null
  ) then
    raise exception 'bad member';
  end if;
  delete from household_invites where household_id = p_household;
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from household_invites where code = c);
  end loop;
  insert into household_invites (code, household_id, member_id, created_by)
  values (c, p_household, p_member, auth.uid());
  return c;
end;
$$;

-- partner: join with a code
create or replace function join_household(p_code text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv household_invites;
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select * into inv from household_invites where code = upper(trim(p_code));
  if not found or inv.created_at < now() - interval '7 days' then
    raise exception 'invalid code';
  end if;
  if not exists (select 1 from household_members where household_id = inv.household_id and user_id = me) then
    if inv.member_id is not null and exists (
      select 1 from household_members where id = inv.member_id and user_id is null
    ) then
      -- the owner had already added this person by name: link that name to this login
      update household_members set user_id = me where id = inv.member_id;
    else
      insert into household_members (household_id, user_id, display_name, role, color)
      values (inv.household_id, me, coalesce(nullif(trim(p_name), ''), 'شريك'), 'partner', '#ec4899');
    end if;
  end if;
  delete from household_invites where code = inv.code;
  return inv.household_id;
end;
$$;

revoke all on function create_invite(uuid, uuid) from public, anon;
revoke all on function join_household(text, text) from public, anon;
grant execute on function create_invite(uuid, uuid) to authenticated;
grant execute on function join_household(text, text) to authenticated;

-- tell the API about the new table and functions
notify pgrst, 'reload schema';
