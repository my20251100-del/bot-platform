import { randomInt } from "node:crypto";
import { createAdmin } from "@/lib/supabase/admin";
import { normalizePhoneNumber } from "@/lib/phone";

export function genOtp() {
  return randomInt(100000, 1000000).toString();
}

export function getOtpTargetNumber(toNumber: string) {
  return normalizePhoneNumber(toNumber);
}

export function buildOtpMessage(code: string) {
  return `🔐 *بوت برو — رمز التحقق*\n\nرمز التحقق الخاص بك هو:\n\n*${code}*\n\nينتهي صلاحيته خلال 5 دقائق.\nلا تشاركه مع أي شخص.\n\n— بوت برو`;
}

export function pickConnectedBotId(
  bots?: Array<{
    id?: string | null;
    status?: string | null;
    command?: string | null;
    linked_number?: string | null;
    phone?: string | null;
  }> | null
) {
  if (!Array.isArray(bots)) return null;

  const normal = bots.filter((bot): bot is NonNullable<typeof bot> & { id: string } => Boolean(bot && bot.id));
  const connected = normal.filter((bot) => {
    const status = String(bot.status ?? "").toLowerCase();
    const command = String(bot.command ?? "").toLowerCase();
    return status === "connected" || command === "start";
  });

  const candidates = connected.length > 0 ? connected : normal.filter((bot) => String(bot.status ?? "").toLowerCase() !== "disconnected");
  const preferred = candidates.find((bot) => {
    const digits = normalizePhoneNumber(String(bot.linked_number ?? bot.phone ?? ""));
    return digits.length >= 8;
  });

  return preferred?.id ?? null;
}

// أرقام بوتات الإدارة والنظام المعتمدة حصرياً لإرسال رموز التحقق (الأدمن حاتم 772847565 وبوت النظام 712343137)
export const ADMIN_SENDER_NUMBERS = ["967772847565", "967712343137"];

export async function getSenderBotId() {
  const admin = createAdmin();

  // البحث حصرياً عن بوت الأدمن حاتم (772847565) أو بوت النظام (712343137)
  const orFilter = ADMIN_SENDER_NUMBERS.flatMap((n) => [`linked_number.eq.${n}`, `phone.eq.${n}`]).join(",");
  const { data: adminBots, error } = await admin
    .from("bots")
    .select("id, linked_number, phone, status, command")
    .or(orFilter);

  if (error) throw new Error(error.message);

  // تفضيل البوت المتصل من حسابات الإدارة
  const connectedAdminBot = (adminBots || []).find((b) => b.status === "connected");
  if (connectedAdminBot) return connectedAdminBot.id;

  // إذا لم يكن متصلاً، نعيّن بوت الإدارة الرئيسي لحين اتصاله
  const primaryAdmin = (adminBots || []).find((b) => (b.phone || b.linked_number)?.includes("772847565")) || (adminBots || [])[0];
  if (primaryAdmin) return primaryAdmin.id;

  // ممنوع منعاً باتاً الرجوع لأي بوت عميل لحماية الخصوصية والأمان
  return null;
}

// إدراج رسالة رمز التحقق في قائمة الانتظار ليرسلها المحرك من بوت MOH
export async function queueOtpSms(toNumber: string, message: string) {
  const admin = createAdmin();
  const digits = normalizePhoneNumber(toNumber);
  const targetDigits = getOtpTargetNumber(digits || toNumber);

  if (!digits || digits.length < 10) {
    throw new Error("رقم واتساب غير صالح");
  }

  const botId = await getSenderBotId();
  console.info("[OTP] queueing verification message", { to: digits, target: targetDigits, botId: botId ?? null });

  const payload: Record<string, string> = {
    to_number: targetDigits,
    message,
    status: "pending",
  };

  if (botId) {
    payload.bot_id = botId;
  }

  const { error } = await admin.from("notify_queue").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}
