-- Life dashboard: run this once in Supabase → SQL Editor → New query → Run.

-- 1) Your whole app state, one row per user
create table if not exists public.app_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2) Daily Garmin values, written by the GitHub Action
create table if not exists public.garmin_daily (
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- updated_at is always set by the server, so devices with wrong clocks can't confuse the sync
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists app_state_touch on public.app_state;
create trigger app_state_touch before insert or update on public.app_state
  for each row execute function public.touch_updated_at();

drop trigger if exists garmin_daily_touch on public.garmin_daily;
create trigger garmin_daily_touch before insert or update on public.garmin_daily
  for each row execute function public.touch_updated_at();

-- Row Level Security: every user only ever sees their own rows
alter table public.app_state    enable row level security;
alter table public.garmin_daily enable row level security;

drop policy if exists "own state" on public.app_state;
create policy "own state" on public.app_state
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The app only reads Garmin rows; the GitHub Action writes them with the service key (bypasses RLS)
drop policy if exists "own garmin read" on public.garmin_daily;
create policy "own garmin read" on public.garmin_daily
  for select to authenticated
  using ((select auth.uid()) = user_id);
