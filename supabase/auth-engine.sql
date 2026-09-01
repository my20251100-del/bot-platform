-- Auth state persistence for @whiskeysockets/baileys (Supabase-backed)
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run

-- ---------- BOT AUTH CREDENTIALS ----------
create table if not exists public.bot_auth (
  bot_id uuid primary key references public.bots(id) on delete cascade,
  creds jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.bot_auth enable row level security;

create policy "bot_auth_owner" on public.bot_auth
  for all using (auth.uid() = (select user_id from public.bots where id = bot_auth.bot_id))
  with check (auth.uid() = (select user_id from public.bots where id = bot_auth.bot_id));

-- RLS is bypassed by the engine which uses SUPABASE_SERVICE_ROLE_KEY.

create or replace function public.touch_bot_auth()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bot_auth_touch on public.bot_auth;
create trigger trg_bot_auth_touch
  before insert or update on public.bot_auth
  for each row execute function public.touch_bot_auth();

-- ---------- BOT KEYS (signaling keys) ----------
create table if not exists public.bot_keys (
  bot_id uuid not null references public.bots(id) on delete cascade,
  category text not null,
  key_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (bot_id, category, key_id)
);

alter table public.bot_keys enable row level security;

create policy "bot_keys_owner" on public.bot_keys
  for all using (auth.uid() = (select user_id from public.bots where id = bot_keys.bot_id))
  with check (auth.uid() = (select user_id from public.bots where id = bot_keys.bot_id));

create or replace function public.touch_bot_keys()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bot_keys_touch on public.bot_keys;
create trigger trg_bot_keys_touch
  before insert or update on public.bot_keys
  for each row execute function public.touch_bot_keys();

-- ---------- LID MAP (singleton store) ----------
create table if not exists public.bot_metadata (
  id text primary key default 'global',
  lid_map jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.bot_metadata (id, lid_map) values ('global', '{}') on conflict (id) do nothing;

alter table public.bot_metadata enable row level security;

create policy "bot_metadata_owner" on public.bot_metadata
  for all using (auth.uid() IS NOT NULL)
  with check (auth.uid() IS NOT NULL);

create or replace function public.touch_bot_metadata()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bot_metadata_touch on public.bot_metadata;
create trigger trg_bot_metadata_touch
  before insert or update on public.bot_metadata
  for each row execute function public.touch_bot_metadata();

-- ---------- LID MAP COLUMN ON BOTS (convenience copy, deprecated) ----------
alter table public.bots add column if not exists metadata jsonb default '{}'::jsonb;
