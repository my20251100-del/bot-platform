-- =============================================================
-- BotPro — إصلاحات الأمان (Security Fixes Migration)
-- نَفِّذ هذا الملف في: Supabase Dashboard → SQL Editor → New query
-- أمر واحد: انسخ الكل والصق ثم Run
-- =============================================================

-- ---------- channel_follows: تفعيل RLS (كان الجدول مفتوحاً بلا حماية) ----------
alter table public.channel_follows enable row level security;

-- كل مستخدم يرى طلباته فقط (السطر user_id يُضاف تلقائياً من العميل)
create policy "channel_follows_select_own" on public.channel_follows
  for select using (auth.uid() = user_id);

-- لا يُدرج إلا لمستخدمه الخاص
create policy "channel_follows_insert_own" on public.channel_follows
  for insert with check (auth.uid() = user_id);

-- لا يُعدَّل إلا ما يملكه المستخدم
create policy "channel_follows_update_own" on public.channel_follows
  for update using (auth.uid() = user_id);

-- لا يُحذف إلا ما يملكه المستخدم
create policy "channel_follows_delete_own" on public.channel_follows
  for delete using (auth.uid() = user_id);