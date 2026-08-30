import { createAdmin } from "@/lib/supabase/admin";

export function genOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// بوت النظام المرسل لرموز التحقق (MOH المتصل)
export async function getSenderBotId() {
  const admin = createAdmin();
  const { data, error } = await admin
    .from("bots")
    .select("id, linked_number, phone")
    .eq("status", "connected")
    .limit(20);
  if (error) throw new Error(error.message);
  const cands = data ?? [];
  const pick =
    cands.find(
      (b) =>
        String(b.linked_number).includes("967772847565") ||
        String(b.phone).includes("967772847565")
    ) || cands[0];
  return pick?.id ?? null;
}

// إدراج رسالة رمز التحقق في قائمة الانتظار ليرسلها المحرك من بوت MOH
export async function queueOtpSms(toNumber: string, message: string) {
  const admin = createAdmin();
  const botId = await getSenderBotId();
  if (!botId) throw new Error("لا يوجد بوت نظام متصل لإرسال الرمز");
  const digits = String(toNumber).replace(/\D/g, "").replace(/^0+/, "");
  const { error } = await admin
    .from("notify_queue")
    .insert({ to_number: digits, message, bot_id: botId, status: "pending" });
  if (error) throw new Error(error.message);
}
