-- ============================================================
-- MIGRATION 2: قيود التفرّد (بوت واحد لكل مستخدم / لكل رقم)
-- تنفيذ DIRECTORY قبل التشغيل الفعلي — تأكد من عدم وجود تكرار
-- ============================================================

-- إزالة أي تكرار محتمل أولاً (يحفظ أقدم سجل لكل user)
delete from public.bots a using public.bots b
where a.id > b.id
  and a.user_id = b.user_id;

-- بوت واحد فقط لكل مستخدم
alter table public.bots add constraint bots_user_id_unique unique (user_id);

-- رقم هاتف واحد لكل بوت (وحدة الأرقام مطبقة بالتطبيع: أرقام فقط بدون +)
alter table public.bots add constraint bots_phone_unique unique (phone);
