import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { normalizePhoneNumber, isValidWhatsAppPhone } from "@/lib/phone";

export const runtime = "nodejs";

// بوابة العميل: تسجيل دخول برقم الهاتف + كلمة السر → إرجاع بيانات البوت والميزات والإحصائيات
export async function POST(req: NextRequest) {
  try {
    const { number, secret, action, settings } = await req.json();
    if (!number || !secret) {
      return NextResponse.json({ error: "أدخل رقم الهاتف وكلمة السر" }, { status: 400 });
    }

    const digits = normalizePhoneNumber(number);
    if (!isValidWhatsAppPhone(digits)) {
      return NextResponse.json({ error: "رقم غير صالح" }, { status: 400 });
    }

    const admin = createAdmin();

    const { data: bots, error } = await admin
      .from("bots")
      .select("id, name, status, command, link_method, linked_number, settings, phone, created_at")
      .or(`phone.eq.${digits},linked_number.eq.${digits}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const bot = bots?.[0];

    if (!bot) {
      return NextResponse.json({ error: "لا يوجد بوت مربوط بهذا الرقم" }, { status: 404 });
    }

    // التحقق من كلمة السر المخزّنة في settings.secret
    if (bot.settings?.secret !== String(secret).trim()) {
      return NextResponse.json({ error: "كلمة السر غير صحيحة" }, { status: 401 });
    }

    // حفظ الإعدادات من بوابة العميل
    if (action === "update" && settings && typeof settings === "object") {
      const next = { ...(bot.settings || {}), ...settings, secret: bot.settings.secret };
      const { error: upErr } = await admin
        .from("bots")
        .update({ settings: next })
        .eq("id", bot.id);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const settingsSan = bot.settings ?? {};

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
        linked_number: bot.linked_number ?? bot.phone ?? digits,
        link_method: bot.link_method,
        created_at: bot.created_at,
      },
      settings: {
        autoViewStatus: !!settingsSan.autoViewStatus,
        autoReactStatus: !!settingsSan.autoReactStatus,
        reactEmoji: settingsSan.reactEmoji || "❤️",
        autoReply: !!settingsSan.autoReply,
        autoReplyMessage: settingsSan.autoReplyMessage || "",
        antiDelete: !!settingsSan.antiDelete,
        antiViewOnce: !!settingsSan.antiViewOnce,
        autoReact: !!settingsSan.autoReact,
        privacyMode: !!settingsSan.privacyMode,
        rejectCalls: !!settingsSan.rejectCalls,
        smartReply: !!settingsSan.smartReply,
        autoForward: !!settingsSan.autoForward,
        contactAutoSave: !!settingsSan.contactAutoSave,
        welcomeGroups: !!settingsSan.welcomeGroups,
        welcomeMessage: settingsSan.welcomeMessage || "",
      },
      stats: {
        totalInteractions: handledCount ?? 0,
        statusHandled: statusCount ?? 0,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
