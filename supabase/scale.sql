-- Life dashboard: weigh-ins from your scale (Zepp Life → Apple Health → iPhone Shortcut).
-- Run this once in Supabase → SQL Editor → New query → Run. Safe to run again.

-- 1) One row per day with the weight from the scale
create table if not exists public.scale_weights (
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  kg         numeric(5,2) not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
alter table public.scale_weights enable row level security;
drop policy if exists "own scale read" on public.scale_weights;
create policy "own scale read" on public.scale_weights
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- 2) The Shortcut's key. Only a SHA-256 hash is stored; the app creates it under More → Setup.
create table if not exists public.scale_tokens (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table public.scale_tokens enable row level security;
drop policy if exists "own scale token" on public.scale_tokens;
create policy "own scale token" on public.scale_tokens
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 3) What the Shortcut calls: POST /rest/v1/rpc/add_weight  {"p_token": "...", "p_kg": 72.4, "p_when": "2026-11-09T07:12:00+01:00"}
--    Text parameters, so "72,4" and any date format the Shortcut sends are accepted.
create or replace function public.add_weight(p_token text, p_kg text, p_when text default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid;
  kg  numeric;
  d   date;
begin
  select user_id into uid from public.scale_tokens
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  if uid is null then
    raise exception 'Unknown token. Create a new one in the app (More → Setup → Scale).' using errcode = '28000';
  end if;

  -- take the first number in the text, so "72,4", "72.4 kg" or a whole Health sample all work
  kg := round(replace(substring(coalesce(p_kg, '') from '\d+(?:[.,]\d+)?'), ',', '.')::numeric, 2);
  if kg is null or kg < 25 or kg > 300 then
    raise exception 'Weight % kg looks wrong.', p_kg;
  end if;

  if p_when is null or trim(p_when) = '' then
    d := (now() at time zone 'Europe/Zurich')::date;
  elsif trim(p_when) ~ '^\d{4}-\d{2}-\d{2}$' then
    d := trim(p_when)::date;
  else
    d := (trim(p_when)::timestamptz at time zone 'Europe/Zurich')::date;
  end if;

  insert into public.scale_weights (user_id, date, kg) values (uid, d, kg)
  on conflict (user_id, date) do update set kg = excluded.kg, updated_at = now();

  return 'Saved ' || to_char(kg, 'FM990.0') || ' kg for ' || d;
end $$;

revoke all on function public.add_weight(text, text, text) from public;
grant execute on function public.add_weight(text, text, text) to anon, authenticated;
