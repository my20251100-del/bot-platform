// إعدادات الاتصال بالـ Backend (Express whatsapp-web.js)
// المصدر الوحيد للرابط هو NEXT_PUBLIC_BACKEND_URL. في الإنتاج يُضبط على رابط
// منصة النشر (Back4App). القيمة أدناه مجرد fallback لو لم يُضبط المتغير في
// البناء، وتشير لرابط الإنتاج حتى لا يعتمد التطبيق المنشور على localhost.
const DEFAULT_BACKEND_URL = "https://whatsappbot-r4cunkth.b4a.run";

export const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL
).replace(/\/+$/, "");

// ---- أنواع الاستجابات الخاصة بالـ Backend ----

export type BotEntry = {
  id: string;
  name?: string;
  status?: string;
  phone?: string;
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
  stats?: { total_bots?: number; online_now?: number };
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

// ---- دوال اتصال أساسية بالـ Backend ----

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({}))) as T;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`);
  return (await res.json().catch(() => ({}))) as T;
}

/** POST /api/bot/pair — طلب توليد كود إقران (8 خانات) لرقم معيّن. */
export function requestPairing(botId: string, phoneNumber: string) {
  return postJson<PairResult>("/api/bot/pair", { botId, phoneNumber });
}

/** POST /api/bot/init — تشغيل بوت مرتبط مسبقاً في الخلفية. */
export function initBot(botId: string) {
  return postJson<{ status?: string; botId?: string }>("/api/bot/init", { botId });
}

/** POST /api/bot/stop — إيقاف/إزالة الجلسة الحالية في الذاكرة. */
export function stopBot(botId: string) {
  return postJson<{ status?: string; botId?: string }>("/api/bot/stop", { botId });
}

/** GET /api/bot/status/:botId — حالة الاتصال + إحصائيات الداشبورد. */
export function fetchBotStatus(botId: string) {
  return getJson<BotStatusResult>(`/api/bot/status/${encodeURIComponent(botId)}`);
}

/** GET /api/bot/qr/:botId — يعيد الـ QR الحالي / حالة انتظاره. */
export function fetchBotQr(botId: string) {
  return getJson<QrResult>(`/api/bot/qr/${encodeURIComponent(botId)}`);
}

/** POST /api/bot/send — إرسال رسالة واتساب من رقم البوت. */
export function sendMessage(botId: string, to: string, text: string) {
  return postJson<SendResult>("/api/bot/send", { botId, to, text });
}
