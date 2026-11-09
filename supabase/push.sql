-- Push reminders: run this once in Supabase → SQL Editor (after schema.sql).
-- Before running: replace YOUR-PROJECT-REF and YOUR-ANON-KEY at the bottom.

-- Devices that turned reminders on
create table if not exists public.push_subs (
  endpoint   text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  sub        jsonb not null,
  device     text,
  created_at timestamptz not null default now()
);

-- The reminder plan the app keeps up to date (what is due when)
create table if not exists public.push_plan (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  items      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- What was already sent, so nothing goes out twice (only the server function touches this)
create table if not exists public.push_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  key     text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);

drop trigger if exists push_plan_touch on public.push_plan;
create trigger push_plan_touch before insert or update on public.push_plan
  for each row execute function public.touch_updated_at();

alter table public.push_subs enable row level security;
alter table public.push_plan enable row level security;
alter table public.push_sent enable row level security;   -- no policy: apps can't read or write it

drop policy if exists "own subs" on public.push_subs;
create policy "own subs" on public.push_subs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own plan" on public.push_plan;
create policy "own plan" on public.push_plan
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Every 5 minutes: call the Edge Function that sends what is due
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('push-reminders') where exists (select 1 from cron.job where jobname = 'push-reminders');
select cron.schedule(
  'push-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/push-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR-ANON-KEY"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
