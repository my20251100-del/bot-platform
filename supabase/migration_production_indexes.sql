-- ============================================================================
-- Bot Platform — Production Indexes & Queue Claims Migration
-- Safe & Idempotent (can be executed repeatedly without errors)
-- ============================================================================

-- 1. Indexing on bots table for polling & reconciliation queries (every 3-5s)
CREATE INDEX IF NOT EXISTS idx_bots_command_status ON public.bots (command, status);
CREATE INDEX IF NOT EXISTS idx_bots_phone ON public.bots (phone);
CREATE INDEX IF NOT EXISTS idx_bots_linked_number ON public.bots (linked_number);
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON public.bots (user_id);
CREATE INDEX IF NOT EXISTS idx_bots_updated_at ON public.bots (updated_at DESC);

-- 2. Indexing on bot_auth and bot_keys
CREATE INDEX IF NOT EXISTS idx_bot_auth_bot_id ON public.bot_auth (bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_keys_lookup ON public.bot_keys (bot_id, category);

-- 3. Indexing on bot_logs for faster dashboard and logs viewer queries
CREATE INDEX IF NOT EXISTS idx_bot_logs_bot_created ON public.bot_logs (bot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_logs_event ON public.bot_logs (event, created_at DESC);

-- 4. Queue atomic claiming columns & indexes
ALTER TABLE public.notify_queue ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
ALTER TABLE public.notify_queue ADD COLUMN IF NOT EXISTS claim_id text;
CREATE INDEX IF NOT EXISTS idx_notify_queue_pending ON public.notify_queue (status, created_at) WHERE status = 'pending';

ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS claim_id text;
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_pending ON public.scheduled_posts (status, run_at) WHERE status = 'pending';

ALTER TABLE public.channel_follows ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
ALTER TABLE public.channel_follows ADD COLUMN IF NOT EXISTS claim_id text;
CREATE INDEX IF NOT EXISTS idx_channel_follows_pending ON public.channel_follows (status) WHERE status = 'pending';
