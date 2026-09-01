// إعدادات الاتصال بقاعدة Supabase
import { createAdmin } from "@/lib/supabase/admin";
import { normalizePhoneNumber } from "@/lib/phone";

const supabase = createAdmin();

// ---- أنواع الاستجابات ----

export type BotEntry = {
  id: string;
  name?: string;
  status?: string;
  phone?: string;
  link_method?: string;
  pair_code?: string;
  qr?: string | null;
  created_at?: string;
};

export type PairResult = {
  success?: boolean;
  botId?: string;
  phoneNumber?: string;
  pairingCode?: string;
  error?: string;
};

export type BotStatusResult = {
  bot?: BotEntry | null;
  isReady?: boolean;
  error?: string;
};

export type SendResult = {
  success?: boolean;
  botId?: string;
  to?: string;
  error?: string;
};

export type QrResult = {
  available?: boolean;
  status?: string;
  isReady?: boolean;
  qr?: string | null;
  error?: string;
};

// ---- دوال مساعدة ----

async function withError<T>(promise: Promise<T>): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

// ---- وظائف الاتصال الأساسية ----

/** POST /api/bot/pair — يطلب كود إقران حقيقي للرقم المعين.
 * لا يولّد أي كود محلياً أبداً.
 * فقط يضبط bot على command=start ليبدأ المحرك (Engine) جلسة Baileys
 * ويطلب كود الاقتران الحقيقي من خوادم واتساب عبر sock.requestPairingCode().
 */
export async function requestPairing(botId: string, phoneNumber: string): Promise<PairResult> {
  const digits = normalizePhoneNumber(phoneNumber);
  if (digits.length < 10)
    return { success: false, error: "رقم واتساب غير صالح" };
  const { error } = await supabase.from("bots").update({
    command: "start",
    phone: digits,
    link_method: "pair_code",
    pair_code: null,
    qr: null,
    status: "pending",
  }).eq("id", botId);
  if (error) return { success: false, error: error.message };
  return { success: true, botId, phoneNumber: digits };
}

/** POST /api/bot/init — يبدأ تشغيل بوت مربوط مسبقاً في الخلفية. يكتب command=start يُقرأه المحرك. */
export async function initBot(botId: string): Promise<{ status: string; botId: string }> {
  const { error } = await supabase.from("bots").update({ command: "start", qr: null, status: "pending" }).eq("id", botId);
  if (error) throw error;
  return { status: "ok", botId };
}

/** POST /api/bot/stop — يوقف/يزيل الجلسة الحالية. يكتب command=stop. */
export async function stopBot(botId: string): Promise<{ status: string }> {
  const { error } = await supabase.from("bots").update({ command: "stop", qr: null }).eq("id", botId);
  if (error) throw error;
  return { status: "ok" };
}

/** GET /api/bot/status/:botId — حالة الاتصال + إحصائيات الداشبورد. */
export async function fetchBotStatus(botId: string): Promise<BotStatusResult> {
  const { data, error } = await supabase.from("bots").select("*").eq("id", botId).single();
  if (error || !data) return { bot: null, isReady: false, error: error?.message ?? "not_found" };
  return {
    bot: {
      id: data.id,
      name: data.name,
      status: data.status,
      phone: data.phone,
      link_method: data.link_method,
      pair_code: data.pair_code,
      qr: data.qr,
    },
    isReady: data.status === "connected",
  };
}

/** GET /api/bot/qr/:botId — يعيد الـ QR الحالي / حالة انتظاره. */
export async function fetchBotQr(botId: string): Promise<QrResult> {
  const { data, error } = await supabase.from("bots").select("qr, status").eq("id", botId).single();
  if (error || !data) return { available: false, status: "unknown", isReady: false, qr: null, error: error?.message };
  return {
    available: !!data.qr,
    status: data.status,
    isReady: data.status === "connected",
    qr: data.qr ?? null,
  };
}

/** POST /api/bot/send — إرسال رسالة واتساب من رقم البوت.
  يخزّن الرسالة في جدول notify_queue ليقرأها المحرك ويرسلها.
 */
export async function sendMessage(botId: string, to: string, text: string): Promise<SendResult> {
  const digits = String(to).replace(/\D/g, "").replace(/^0+/, "");
  const { error } = await supabase.from("notify_queue").insert({
    to_number: digits,
    message: text,
    bot_id: botId,
    status: "pending",
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}