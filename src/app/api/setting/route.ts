import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { createAdmin } from "@/lib/supabase/admin";
import { normalizePhoneNumber, isValidWhatsAppPhone } from "@/lib/phone";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { decryptValue, isEncrypted } from "@/lib/crypto";

export const runtime = "nodejs";

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(String(a || "")).digest();
  const hb = createHash("sha256").update(String(b || "")).digest();
  return ha.length === hb.length && timingSafeEqual(ha, hb);
}

const L = (lang: string | undefined, ar: string, en: string) => (lang === "en" ? en : ar);

// إخفاء الرقم: لا يُعرض أبداً بهيئته الكاملة لأي عميل
function maskPhone(phone: string | null | undefined): string {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length < 5) return "";
  return `•••• •••• ${d.slice(-4)}`;
}

// بوابة العميل: تسجيل دخول برقم الهاتف + كلمة السر → إرجاع بيانات البوت والميزات والإحصائيات
export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const perIp = rateLimit({ key: `setting:ip:${ip}`, limit: 20, windowMs: 10 * 60 * 1000 });
    if (!perIp.ok) {
      return NextResponse.json(
        { error: "محاولات كثيرة، حاول بعد قليل", retryAfterSec: perIp.retryAfterSec },
        { status: 429 }
      );
    }

    const { number, secret, action, settings, lang } = await req.json();
    if (!number || !secret) {
      return NextResponse.json({ error: L(lang, "أدخل رقم الهاتف وكلمة السر", "Enter the phone number and secret") }, { status: 400 });
    }

    const digits = normalizePhoneNumber(number);
    if (!isValidWhatsAppPhone(digits)) {
      return NextResponse.json({ error: L(lang, "رقم غير صالح", "Invalid number") }, { status: 400 });
    }

    const perNumber = rateLimit({ key: `setting:num:${digits}`, limit: 8, windowMs: 15 * 60 * 1000 });
    if (!perNumber.ok) {
      return NextResponse.json(
        { error: L(lang, "محاولات كثيرة لهذا الرقم، حاول بعد قليل", "Too many attempts for this number, try again later"), retryAfterSec: perNumber.retryAfterSec },
        { status: 429 }
      );
    }

    const admin = createAdmin();

    const { data: bots, error } = await admin
      .from("bots")
      .select("id, name, status, command, link_method, linked_number, settings, phone, created_at")
      .or(`phone.eq.${digits},linked_number.eq.${digits}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!bots || bots.length === 0) {
      return NextResponse.json({ error: L(lang, "لا يوجد بوت مربوط بهذا الرقم", "No bot linked to this number") }, { status: 404 });
    }

    const trimmedSecret = String(secret).trim();

    // البحث عن البوت الذي يتطابق مع كلمة السر المفكوكة تشفيراً (دعم السجلات القديمة)
    const liveSecret = (stored: unknown) => {
      if (typeof stored !== "string" || !stored) return "";
      return isEncrypted(stored) ? decryptValue(stored) : stored;
    };
    const bot =
      bots.find((b) => safeEqual(liveSecret(b.settings?.secret), trimmedSecret)) ||
      bots.find((b) => b.status === "connected") ||
      bots[0];

    // التحقق من كلمة السر بمقارنة ثابتة الزمن (constant-time)
    if (!safeEqual(liveSecret(bot.settings?.secret), trimmedSecret)) {
      return NextResponse.json({ error: L(lang, "كلمة السر غير صحيحة", "Incorrect secret") }, { status: 401 });
    }

    // ملاحظة: السر والمفاتيح تُخزَّن نصاً صريحاً — لأنه لا يمكن ضمان تطابق مفتاح
    // التشفير بين منصتي النشر (Vercel للمسارات والمحرك على Railway)، والتشفير يُعطّل
    // فك التشفير عبر الجهتين ويعطّل رسالة الترحيب والدخول. التشفير عند الراحة يُترك
    // اختيارياً ويُفك عند القراءة (decryptValue يعالج القديم إن وجد).

    // حفظ الإعدادات من بوابة العميل (نص صريح يعمل على الطرفين)
    if (action === "update" && settings && typeof settings === "object") {
      const incoming = { ...settings } as Record<string, unknown>;
      const next = { ...(bot.settings || {}), ...incoming, secret: bot.settings?.secret };
      // تطبيع قائمة الكلمات المحظورة إلى مصفوفة دائماً، وتفعيل القاموس افتراضياً
      const banned = Array.isArray(next.bannedWords)
        ? next.bannedWords
        : String(next.bannedWords || "").split(/[\n,،]/).map((w: string) => w.trim()).filter(Boolean);
      next.bannedWords = banned;
      next.dictionaryOn = next.dictionaryOn !== false;
      const { error: upErr } = await admin
        .from("bots")
        .update({ settings: next })
        .eq("id", bot.id);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const settingsSan = bot.settings ?? {};

    // رد مُهذّب: لا يحتوي أي سر مشفّر أو رقم كامل
    const settingsForClient = {
      ...settingsSan,
      autoViewStatus: settingsSan.saveStatus ?? settingsSan.autoViewStatus ?? true,
      autoReactStatus: settingsSan.interactStatus ?? settingsSan.autoReactStatus ?? true,
      antiDelete: settingsSan.antiDelete !== false,
      antiViewOnce: settingsSan.antiViewOnce !== false,
      rejectCalls: settingsSan.rejectCalls !== false,
      showOnline: !!settingsSan.showOnline,
      smartReply: !!settingsSan.smartReply,
      autoReply: !!settingsSan.autoReply,
      autoReplyMessage: settingsSan.autoReplyMessage || "",
      autoReact: !!settingsSan.autoReact,
      reactEmoji: settingsSan.reactEmoji || "❤️",
      privacyMode: !!settingsSan.privacyMode,
      contactAutoSave: !!settingsSan.contactAutoSave,
      welcomeGroups: !!settingsSan.welcomeGroups,
      welcomeMessage: settingsSan.welcomeMessage || "",
      farewellGroups: !!settingsSan.farewellGroups,
      farewellMessage: settingsSan.farewellMessage || "",
      antiEdit: !!settingsSan.antiEdit,
      antiMention: !!settingsSan.antiMention,
      firewallDomains: settingsSan.firewallDomains || "",
      bannedWords: settingsSan.bannedWords || "",
      autoForward: !!settingsSan.autoForward,
      businessInfo: settingsSan.businessInfo || "",
      workMode: settingsSan.workMode || "public",
    } as Record<string, unknown>;
    delete settingsForClient.secret;
    if (typeof settingsForClient.GEMINI_API_KYES === "string") {
      settingsForClient.GEMINI_API_KYES = decryptValue(settingsForClient.GEMINI_API_KYES);
    }

    // الإحصائيات: عدد التفاعلات من سجل الأحداث
    const { count: handledCount } = await admin
      .from("bot_logs")
      .select("id", { count: "exact", head: true })
      .eq("bot_id", bot.id)
      .in("event", [
        "status_handled",
        "message_recovered",
        "view_once_saved",
        "smart_replied",
        "auto_replied",
        "security_blocked",
      ]);

    const { count: statusCount } = await admin
      .from("bot_logs")
      .select("id", { count: "exact", head: true })
      .eq("bot_id", bot.id)
      .eq("event", "status_handled");

    return NextResponse.json({
      ok: true,
      bot: {
        id: bot.id,
        name: bot.name,
        status: bot.status,
        linked_number: maskPhone(bot.linked_number ?? bot.phone ?? digits),
        link_method: bot.link_method,
        created_at: bot.created_at,
      },
      settings: settingsForClient,
      stats: {
        totalInteractions: handledCount ?? 0,
        statusHandled: statusCount ?? 0,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}