import { createAdmin } from "@/lib/supabase/admin";

// تحديد البوتات المتصلة فعلياً من النشاط الحي في السجل
// (حقل status في الجدول قد يبقى pending رغم اتصال المحرك، لذا نعتمد على آخر النشاط)
export async function getLiveBotIds(minutes = 5): Promise<Set<string>> {
  const admin = createAdmin();
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data } = await admin
    .from("bot_logs")
    .select("bot_id, event")
    .gte("created_at", since)
    .in("event", ["connected", "smart_replied", "status_handled", "message_recovered", "viewonce_saved", "call_rejected", "auto_replied", "keyword_replied"])
    .limit(1000);

  const live = new Set<string>();
  for (const row of data || []) {
    if (row?.bot_id) live.add(row.bot_id);
  }
  return live;
}