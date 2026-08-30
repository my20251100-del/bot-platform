-- =============================================================
-- WhatsApp Bot Management System — Express + whatsapp-web.js backend
-- Supabase SQL Schema (v2)
--
-- IMPORTANT:
-- This is the schema for the NEW parallel Express backend.
-- It intentionally uses a SEPARATE Supabase project (or at least
-- separate table names) so it does NOT collide with the existing
-- BotPro `bots` / `profiles` tables in the production project.
--
-- Run this in Supabase Dashboard -> SQL Editor -> New query
-- =============================================================

-- ---------- USERS ----------
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);
create policy "users_insert" on public.users
  for insert with check (auth.uid() = id);

-- ---------- BOTS ----------
create table public.bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  bot_name text not null,
  phone_number text,
  session_status text not null default 'disconnected'
    check (session_status in ('connected','disconnected')),
  activity_percentage int not null default 0 check (activity_percentage between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bots enable row level security;

create policy "bots_all_own" on public.bots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- BOT SETTINGS (1:1 with bots) ----------
create table public.bot_settings (
  bot_id uuid primary key references public.bots(id) on delete cascade,
  show_online boolean not null default true,
  reject_calls boolean not null default false,
  anti_delete_mode text not null default 'off',
  blocked_links jsonb not null default '[]'::jsonb,
  blocked_words jsonb not null default '[]'::jsonb,
  auto_react_emoji text,
  gemini_api_keys text,
  ai_system_prompt text default 'You are a helpful WhatsApp assistant. Reply concisely in Arabic.',
  updated_at timestamptz not null default now()
);

alter table public.bot_settings enable row level security;

create policy "bot_settings_all_own" on public.bot_settings
  for all using (
    exists (
      select 1 from public.bots b
      where b.id = bot_settings.bot_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.bots b
      where b.id = bot_settings.bot_id and b.user_id = auth.uid()
    )
  );

-- ---------- CONVERSATION LOGS (optional, useful for debugging) ----------
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

-- ---------- TRIGGER: keep updated_at fresh ----------
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

create trigger bot_settings_touch_updated_at
  before update on public.bot_settings
  for each row execute procedure public.touch_updated_at();
