import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { createAdmin } from "@/lib/supabase/admin";
import { normalizePhoneNumber, isValidWhatsAppPhone } from "@/lib/phone";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isEncrypted, decryptValue } from "@/lib/crypto";

export const runtime = "nodejs";

const L = (lang: string | undefined, ar: string, en: string) => (lang === "en" ? en : ar);

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(String(a || "")).digest();
  const hb = createHash("sha256").update(String(b || "")).digest();
  return ha.length === hb.length && timingSafeEqual(ha, hb);
}

const ALLOWED_TYPES = ["text", "textImage", "image", "sticker", "audio"] as const;

type SanitizedReply = {
  id: string;
  keyword: string;
  message: string;
  type: string;
  media?: string;
  active: boolean;
};

function sanitizeReplies(raw: unknown): SanitizedReply[] {
  if (!Array.isArray(raw)) return [];
  const out: SanitizedReply[] = [];
  for (const r of raw.slice(0, 20)) {
    if (!r || typeof r !== "object") continue;
    const anyR = r as Record<string, unknown>;
    const keyword = String(anyR.keyword || "").trim().slice(0, 30);
    const message = String(anyR.message || "").trim().slice(0, 1000);
    if (!keyword || !message) continue;
    const type = ALLOWED_TYPES.includes(anyR.type as (typeof ALLOWED_TYPES)[number]) ? (anyR.type as string) : "text";
    const media = typeof anyR.media === "string" ? anyR.media.slice(0, 2_000_000) : undefined;
    out.push({
      id: String(anyR.id || Math.random().toString(36).slice(2)),
      keyword,
      message,
      type,
      media,
      active: anyR.active !== false,
    });
  }
  return out;
}

// بوابة + مغيّر الردود التلقائية: يعيد الردود المخصّصة للبوت ويحفظها في إعداداته بالقاعدة
// المحرك يقرأ settings.customReplies ويتفاعلها خلال ثوانٍ (بلا إعادة تشغيل)
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const perIp = rateLimit({ key: `autoreply:ip:${ip}`, limit: 30, windowMs: 10 * 60 * 1000 });
    if (!perIp.ok) {
      return NextResponse.json(
        { error: L("", "محاولات كثيرة، حاول بعد قليل", "Too many attempts, try again later"), retryAfterSec: perIp.retryAfterSec },
        { status: 429 }
      );
    }

    const body = await req.json();
    const lang = body?.lang;
    const { number, secret, action, replies, autoReply, replyInGroups } = body || {};
    if (!number || !secret) {
      return NextResponse.json({ error: L(lang, "أدخل رقم الهاتف وكلمة السر", "Enter the phone number and secret") }, { status: 400 });
    }

    const digits = normalizePhoneNumber(number);
    if (!isValidWhatsAppPhone(digits)) {
      return NextResponse.json({ error: L(lang, "رقم غير صالح", "Invalid number") }, { status: 400 });
    }

    const perNumber = rateLimit({ key: `autoreply:num:${digits}`, limit: 40, windowMs: 15 * 60 * 1000 });
    if (!perNumber.ok) {
      return NextResponse.json(
        { error: L(lang, "محاولات كثيرة لهذا الرقم، حاول بعد قليل", "Too many attempts for this number, try again later"), retryAfterSec: perNumber.retryAfterSec },
        { status: 429 }
      );
    }

    const admin = createAdmin();
    const { data: bots, error } = await admin
      .from("bots")
      .select("id, name, status, linked_number, phone, settings")
      .or(`phone.eq.${digits},linked_number.eq.${digits}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!bots || bots.length === 0) {
      return NextResponse.json({ error: L(lang, "لا يوجد بوت مربوط بهذا الرقم", "No bot linked to this number") }, { status: 404 });
    }

    const trimmedSecret = String(secret).trim();
    const liveSecret = (stored: unknown) => {
      if (typeof stored !== "string" || !stored) return "";
      return isEncrypted(stored) ? decryptValue(stored) : stored;
    };
    const bot =
      bots.find((b) => safeEqual(liveSecret(b.settings?.secret), trimmedSecret)) ||
      bots.find((b) => b.status === "connected") ||
      bots[0];

    if (!safeEqual(liveSecret(bot.settings?.secret), trimmedSecret)) {
      return NextResponse.json({ error: L(lang, "كلمة السر غير صحيحة", "Incorrect secret") }, { status: 401 });
    }

    const stored = (bot.settings || {}) as Record<string, unknown>;

    if (action === "update") {
      const clean = sanitizeReplies(replies);
      const next: Record<string, unknown> = { ...stored, customReplies: clean };
      if (typeof autoReply === "boolean") next.autoReply = autoReply;
      if (typeof replyInGroups === "boolean") next.replyInGroups = replyInGroups;
      const { error: upErr } = await admin.from("bots").update({ settings: next }).eq("id", bot.id);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const existing = Array.isArray(stored.customReplies)
      ? stored.customReplies
      : Array.isArray(stored.autoReplies)
        ? stored.autoReplies
        : [];

    return NextResponse.json({
      ok: true,
      bot: { id: bot.id, name: bot.name, status: bot.status },
      autoReply: stored.autoReply !== false,
      replyInGroups: stored.replyInGroups !== false,
      replies: sanitizeReplies(existing),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}