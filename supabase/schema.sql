-- =============================================================
-- BotPro — Supabase Schema
-- Run this in Supabase Dashboard -> SQL Editor -> New query
-- =============================================================

-- ---------- PROFILES ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  referral_code text unique not null,
  referred_by uuid references public.profiles(id),
  wallet_balance numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ---------- BOTS ----------
create table public.bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  phone text,
  status text not null default 'disconnected'
    check (status in ('disconnected','pending','connected')),
  link_method text not null default 'qr' check (link_method in ('qr','pair_code')),
  pair_code text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bots enable row level security;

create policy "bots_all_own" on public.bots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- BOT LOGS ----------
create table public.bot_logs (
  id bigint generated always as identity primary key,
  bot_id uuid not null references public.bots(id) on delete cascade,
  event text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.bot_logs enable row level security;

create policy "logs_select_own" on public.bot_logs
  for select using (
    exists (
      select 1 from public.bots b
      where b.id = bot_logs.bot_id and b.user_id = auth.uid()
    )
  );

-- ---------- WALLET TRANSACTIONS ----------
create table public.transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  type text not null check (type in ('deposit','bonus','referral','usage')),
  description text,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);

-- =============================================================
-- TRIGGERS
-- =============================================================

-- Auto-create profile on signup (+ handle referral code)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  referrer uuid;
begin
  -- find referrer by referral code sent during signup metadata
  if new.raw_user_meta_data->>'referral_code' is not null then
    select id into referrer
    from public.profiles
    where referral_code = new.raw_user_meta_data->>'referral_code';
  end if;

  insert into public.profiles (id, email, full_name, referral_code, referred_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    referrer
  );

  -- credit referrer wallet +10 and log transaction
  if referrer is not null then
    update public.profiles
      set wallet_balance = wallet_balance + 10
      where id = referrer;

    insert into public.transactions (user_id, amount, type, description)
    values (referrer, 10, 'referral', 'مكافأة إحالة مستخدم جديد');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep bots.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bots_touch_updated_at
  before update on public.bots
  for each row execute procedure public.touch_updated_at();
