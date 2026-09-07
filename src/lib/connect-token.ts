import { createHmac, timingSafeEqual } from "node:crypto";

// توقيع HMAC لأذونات ربط البوت — يمنع تسريب كود الاقتران أو إعادة ضبط بوتات الآخرين
// عبر GET/POST /api/connect بدون مصادقة.

function secret(): string {
  return (
    process.env.CONNECT_TOKEN_SECRET ||
    process.env.ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

export function signConnectToken(botId: string, digits: string, ttlMs = 40 * 60 * 1000): string {
  const exp = Date.now() + ttlMs;
  const payload = `${botId}.${digits}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyConnectToken(
  token: string | null | undefined,
  botId: string,
  digits?: string
): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [id, d, expStr, sig] = parts;
  if (id !== botId) return false;
  if (digits && d !== digits) return false;
  if (Number(expStr) < Date.now()) return false;
  const expect = createHmac("sha256", secret())
    .update(`${id}.${d}.${expStr}`)
    .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  return a.length === b.length && timingSafeEqual(a, b);
}