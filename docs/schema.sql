-- Reference schema for the Supabase project behind this app.
--
-- This documents the tables the client expects; it is not a migration and the
-- live database already contains them. Use it to stand up a fresh environment,
-- or to check that policies still match what the app assumes.

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

-- --------------------------------------------------------------------- RLS
-- Every table is private to its owner. The browser only ever holds the anon
-- key, so these policies are the actual access control.
alter table public.todo_items enable row level security;
alter table public.daily_todos enable row level security;
alter table public.daily_schedule_status enable row level security;

create policy "own rows" on public.todo_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows" on public.daily_todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own rows" on public.daily_schedule_status
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
