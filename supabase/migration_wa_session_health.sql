-- ============================================================================
-- BotPro — Migration آمنة: صحة جلسات واتساب (قابلة للتكرار/idempotent)
-- شغّلها مرة واحدة (أو عدة مرات بأمان) في Supabase Dashboard -> SQL Editor
--
-- الغرض:
--  1) طبقة "حالة جلسة" صريحة لكل بوت (آخر خطأ / آخر اتصال) دون كسر الجداول الحالية.
--  2) Key indexing للحصول السريع على creds/keys لكل بوت.
--  3) إعادة PRAGMA غير مطلوبة هنا، نعتمد على JSONB metadata الموجود أصلاً.
-- ============================================================================

-- 1) أعمدة صحة الجلسة على bots (اختيارية — المحرك يكتب metadata بديلاً،
--    لكن الأعمدة تجعل الاستعلام أرخص وأوضح لمن يستعلم مباشرة).
alter table public.bots add column if not exists last_error text;
alter table public.bots add column if not exists last_connected_at timestamptz;

-- 2) فهارس فريدة/سرعة على جداول الجلسة (بدون فشل إن وُجدت).
create index if not exists bot_auth_bot_id_idx on public.bot_auth (bot_id);
create index if not exists bot_keys_lookup_idx on public.bot_keys (bot_id, category);

-- 3) عرض الجلسات الحية: كل بوت ارتباطه وجلسته وحالته.
create or replace view public.v_bot_sessions as
select
  b.id                          as bot_id,
  b.user_id                     as user_id,
  p.email                       as owner_email,
  b.name                        as bot_name,
  b.phone                       as phone,
  b.link_method                 as link_method,
  b.status                      as connection_status,
  b.command                     as command,
  b.linked_number               as linked_number,
  b.pair_code                   as pair_code,
  b.qr is not null              as has_qr,
  b.metadata->>'last_error'     as last_error,
  (b.metadata->>'last_connected_at')::timestamptz as last_connected_at,
  b.updated_at                  as updated_at
from public.bots b
left join public.profiles p on p.id = b.user_id;

--
-- ملاحظة الجدول المهم (لماذا الإنترنت عمل): الجداول bot_auth/bot_keys
-- (creds + المفاتيح) منشأة، والمحرك يعيد تعيين creds "نصف المسجّلة" تلقائياً
-- فلا يعلق في حلقة 401. الجدولان أساسيان للجلسة ولا يُمسحان أثناء الربط العادي.
-- ============================================================================