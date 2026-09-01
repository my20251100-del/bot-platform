-- =============================================================
-- BotPro — إصلاح + مسح كامل (نسخة نهائية محصّنة ضد الجداول الغائبة)
-- شغّلها في: Supabase Dashboard -> SQL Editor -> New query -> Run
-- =============================================================

-- 1) إنشاء جداول الجلسات (لن يفشل: if not exists)
create table if not exists public.bot_auth (
  bot_id uuid primary key references public.bots(id) on delete cascade,
  creds jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create table if not exists public.bot_keys (
  bot_id uuid not null references public.bots(id) on delete cascade,
  category text not null,
  key_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (bot_id, category, key_id)
);
create table if not exists public.bot_metadata (
  id text primary key default 'global',
  lid_map jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.bot_metadata (id, lid_map) values ('global', '{}') on conflict (id) do nothing;
create table if not exists public.wa_sessions (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null unique,
  blob        bytea,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2) مسح كل البيانات (كل حذف يستثني خطأ الجدول الغائب)
do $$ begin delete from public.scheduled_posts; exception when undefined_table then null; end $$;
do $$ begin delete from public.channel_follows;  exception when undefined_table then null; end $$;
do $$ begin delete from public.bot_logs;         exception when undefined_table then null; end $$;
do $$ begin delete from public.notify_queue;     exception when undefined_table then null; end $$;
do $$ begin delete from public.bot_settings;     exception when undefined_table then null; end $$;
do $$ begin delete from public.transactions;     exception when undefined_table then null; end $$;
do $$ begin delete from public.wa_sessions;      exception when undefined_table then null; end $$;
do $$ begin delete from public.bot_keys;         exception when undefined_table then null; end $$;
do $$ begin delete from public.bot_auth;         exception when undefined_table then null; end $$;
do $$ begin delete from public.bots;             exception when undefined_table then null; end $$;

-- 3) سياسات RLS
alter table public.bot_auth enable row level security;
drop policy if exists "bot_auth_owner" on public.bot_auth;
create policy "bot_auth_owner" on public.bot_auth
  for all using (auth.uid() = (select user_id from public.bots where id = bot_auth.bot_id))
  with check (auth.uid() = (select user_id from public.bots where id = bot_auth.bot_id));

alter table public.bot_keys enable row level security;
drop policy if exists "bot_keys_owner" on public.bot_keys;
create policy "bot_keys_owner" on public.bot_keys
  for all using (auth.uid() = (select user_id from public.bots where id = bot_keys.bot_id))
  with check (auth.uid() = (select user_id from public.bots where id = bot_keys.bot_id));

alter table public.bot_metadata enable row level security;
drop policy if exists "bot_metadata_owner" on public.bot_metadata;
create policy "bot_metadata_owner" on public.bot_metadata
  for all using (auth.uid() IS NOT NULL)
  with check (auth.uid() IS NOT NULL);

-- 4) ترقية الأعمدة
alter table public.bots add column if not exists qr text;
alter table public.bots add column if not exists command text not null default 'stop';
alter table public.bots add column if not exists linked_number text;
alter table public.bots add column if not exists metadata jsonb default '{}'::jsonb;

-- 5) تحقيق
select 'bots' as t, count(*) from public.bots
union all select 'bot_auth', count(*) from public.bot_auth
union all select 'bot_keys', count(*) from public.bot_keys
union all select 'notify_queue', count(*) from public.notify_queue
union all select 'wa_sessions', count(*) from public.wa_sessions;