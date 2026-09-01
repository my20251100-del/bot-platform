-- ============================================================
-- MIGRATION 1: جداول جلسات Baileys (ضرورية لاستمرار الجلسة والربط)
-- شغّل هذا أولاً في Supabase > SQL Editor
-- ============================================================

create table if not exists public.bot_auth (
  bot_id uuid primary key references public.bots(id) on delete cascade,
  creds jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.bot_auth enable row level security;

create table if not exists public.bot_keys (
  bot_id uuid not null references public.bots(id) on delete cascade,
  category text not null,
  key_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (bot_id, category, key_id)
);

alter table public.bot_keys enable row level security;

create table if not exists public.bot_metadata (
  id text primary key default 'global',
  lid_map jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.bot_metadata (id, lid_map)
values ('global', '{}') on conflict (id) do nothing;

alter table public.bot_metadata enable row level security;
