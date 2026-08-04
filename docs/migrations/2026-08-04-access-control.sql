-- Adds the approval gate to a database that already has todo_items,
-- daily_todos and daily_schedule_status.
--
-- Safe to run more than once. Run it in the Supabase SQL editor (or via
-- `supabase db execute`) as the postgres role — creating a trigger on
-- auth.users needs more than the anon key.
--
-- After this runs:
--   * every account that already exists is grandfathered in as 'approved';
--   * sakib2439@gmail.com is admin;
--   * new Google sign-ups land as 'pending' and can read nothing but their own
--     profile row until an admin approves them.

begin;

-- --------------------------------------------------------------- enum + table
do $$
begin
  if not exists (select 1 from pg_type where typname = 'access_status') then
    create type public.access_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  avatar_url text,
  status     public.access_status not null default 'pending',
  is_admin   boolean not null default false,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null
);

create index if not exists profiles_status_idx on public.profiles (status);

-- ------------------------------------------------------------------ functions
create or replace function public.admin_email()
returns text
language sql
immutable
as $$ select 'sakib2439@gmail.com'::text $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean := lower(new.email) = lower(public.admin_email());
begin
  insert into public.profiles (id, email, full_name, avatar_url, status, is_admin, decided_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    case when is_owner then 'approved' else 'pending' end::public.access_status,
    is_owner,
    case when is_owner then now() end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'approved'
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin and status = 'approved'
  )
$$;

-- ------------------------------------------------------------------- backfill
-- Everyone who signed up before the gate existed keeps their access; locking
-- them out retroactively would be a nasty surprise.
insert into public.profiles (id, email, full_name, avatar_url, status, is_admin, created_at, decided_at)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  u.raw_user_meta_data ->> 'avatar_url',
  'approved'::public.access_status,
  lower(u.email) = lower(public.admin_email()),
  u.created_at,
  now()
from auth.users u
where u.email is not null
on conflict (id) do nothing;

-- Re-running after the owner account was created by the plain sign-up path.
update public.profiles
set status = 'approved', is_admin = true, decided_at = coalesce(decided_at, now())
where lower(email) = lower(public.admin_email());

-- ------------------------------------------------------------------------ RLS
alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "admins read all profiles" on public.profiles;
create policy "admins read all profiles" on public.profiles
  for select using (public.is_admin());

drop policy if exists "admins update other profiles" on public.profiles;
create policy "admins update other profiles" on public.profiles
  for update using (public.is_admin() and id <> auth.uid())
  with check (public.is_admin() and id <> auth.uid());

-- RLS decides which *rows* an admin may write; this decides which *columns*.
-- Without it the update policy would also let an admin hand out `is_admin` or
-- rewrite an email, neither of which the app ever does.
revoke update on public.profiles from authenticated;
grant update (status, decided_at, decided_by) on public.profiles to authenticated;

-- The existing "own rows" policies only checked ownership; they now also
-- require approval, so a pending account cannot read or write any app data
-- even if it talks to PostgREST directly.
drop policy if exists "own rows" on public.todo_items;
create policy "own rows" on public.todo_items
  for all using (auth.uid() = user_id and public.is_approved())
  with check (auth.uid() = user_id and public.is_approved());

drop policy if exists "own rows" on public.daily_todos;
create policy "own rows" on public.daily_todos
  for all using (auth.uid() = user_id and public.is_approved())
  with check (auth.uid() = user_id and public.is_approved());

drop policy if exists "own rows" on public.daily_schedule_status;
create policy "own rows" on public.daily_schedule_status
  for all using (auth.uid() = user_id and public.is_approved())
  with check (auth.uid() = user_id and public.is_approved());

commit;
