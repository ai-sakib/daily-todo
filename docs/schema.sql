-- Reference schema for the Supabase project behind this app.
--
-- This documents the tables the client expects; it is not a migration and the
-- live database already contains them. Use it to stand up a fresh environment,
-- or to check that policies still match what the app assumes.
--
-- To apply the access-control layer to a database that predates it, run
-- `docs/migrations/2026-08-04-access-control.sql` instead of this file.

-- ------------------------------------------------------------------ profiles
-- One row per account, created automatically at sign-up.
--
-- `status` is the gate: a brand new Google sign-up lands as 'pending' and can
-- read nothing but its own profile row until an admin approves it. The owner
-- account (see ADMIN_EMAIL below) is approved and promoted by the same trigger,
-- so the very first sign-in is not locked out of its own app.
create type public.access_status as enum ('pending', 'approved', 'rejected');

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

-- The account that owns the app. Sign-ups matching it are auto-approved and
-- made admin; everybody else waits. Change this to hand the app to someone new.
create or replace function public.admin_email()
returns text
language sql
immutable
as $$ select 'sakib2439@gmail.com'::text $$;

-- Mirrors a new auth.users row into public.profiles. Runs as the definer so it
-- can write to a table whose policies deny inserts to everyone.
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

-- ---------------------------------------------------------------- todo_items
-- The reusable routine: what should show up on a normal day.
create table if not exists public.todo_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  item_key      text not null,
  item_name     text not null,
  is_active     boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (user_id, item_key)
);

-- --------------------------------------------------------------- daily_todos
-- One row per item per calendar day. `item_key` links a row back to the
-- routine item it came from, and survives renames.
create table if not exists public.daily_todos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  todo_date    date not null,
  item_key     text not null,
  item_name    text not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, todo_date, item_key)
);

create index if not exists daily_todos_user_date_idx
  on public.daily_todos (user_id, todo_date desc);

-- ----------------------------------------------------- daily_schedule_status
-- Marks a day as already seeded from the routine, so items the user removed
-- are not silently restored the next time the day is opened.
create table if not exists public.daily_schedule_status (
  user_id        uuid not null references auth.users (id) on delete cascade,
  schedule_date  date not null,
  is_initialized boolean not null default false,
  primary key (user_id, schedule_date)
);

-- ------------------------------------------------------------ access helpers
-- Both read `profiles`, so both must be `security definer`: called from a
-- policy on `profiles` itself, a plain query would re-enter that policy and
-- recurse. `set search_path` is what stops a caller from shadowing the table.
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

-- --------------------------------------------------------------------- RLS
-- Every table is private to its owner, and only reachable once that owner has
-- been approved. The browser only ever holds the anon key, so these policies
-- are the actual access control — the client-side redirect to /pending is a
-- courtesy, not a gate.
alter table public.profiles enable row level security;
alter table public.todo_items enable row level security;
alter table public.daily_todos enable row level security;
alter table public.daily_schedule_status enable row level security;

-- A pending user must be able to read their own row: it is how the app knows
-- to show them the waiting screen rather than an error.
create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

create policy "admins read all profiles" on public.profiles
  for select using (public.is_admin());

-- Admins decide everyone else's access. The `id <> auth.uid()` guard is
-- deliberate: it stops an admin from revoking or demoting themselves and
-- leaving the app with nobody who can let anyone in. Rows are only ever
-- created by the sign-up trigger, so there is no insert or delete policy.
create policy "admins update other profiles" on public.profiles
  for update using (public.is_admin() and id <> auth.uid())
  with check (public.is_admin() and id <> auth.uid());

-- RLS decides which *rows* an admin may write; this decides which *columns*.
-- Without it the update policy would also let an admin hand out `is_admin` or
-- rewrite an email, neither of which the app ever does.
revoke update on public.profiles from authenticated;
grant update (status, decided_at, decided_by) on public.profiles to authenticated;

create policy "own rows" on public.todo_items
  for all using (auth.uid() = user_id and public.is_approved())
  with check (auth.uid() = user_id and public.is_approved());

create policy "own rows" on public.daily_todos
  for all using (auth.uid() = user_id and public.is_approved())
  with check (auth.uid() = user_id and public.is_approved());

create policy "own rows" on public.daily_schedule_status
  for all using (auth.uid() = user_id and public.is_approved())
  with check (auth.uid() = user_id and public.is_approved());
