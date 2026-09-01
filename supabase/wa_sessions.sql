-- ============================================================================
-- wa_sessions — persistent store for whatsapp-web.js RemoteAuth sessions.
-- Each bot's session (a ZIP) is stored as a single BYTEA row, so WhatsApp
-- sessions survive Render free-tier restarts, redeploys, and new instances
-- (the durable copy lives in Supabase, not ephemeral container disk).
--
-- Run this in: Supabase Console -> SQL Editor -> New query -> Run
-- ============================================================================

create table if not exists public.wa_sessions (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null unique,          -- the RemoteAuth clientId (bot id)
  blob        bytea,                          -- zipped session bytes
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.wa_sessions is
  'whatsapp-web.js RemoteAuth session backups (SaaS-hosted persistent storage).';

-- Update updated_at automatically on upsert for bookkeeping.
create or replace function public.touch_wa_sessions()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_wa_sessions_touch on public.wa_sessions;
create trigger trg_wa_sessions_touch
  before insert or update on public.wa_sessions
  for each row execute function public.touch_wa_sessions();

-- RLS: the backend uses the service-role key which bypasses RLS. Keep the table
-- locked to service-role only (no row-level access from the anon/authenticated
-- roles) so session data is never exposed to the browser.
alter table public.wa_sessions enable row level security;

-- ----------------------------------------------------------------------------
-- Cleanup (optional once you retire an instance):
-- delete from public.wa_sessions where session_id = '<botId>';
-- ----------------------------------------------------------------------------
