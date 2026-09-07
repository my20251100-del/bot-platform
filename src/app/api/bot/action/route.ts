import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { normalizePhoneNumber } from "@/lib/phone";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "غير مصرح — يرجى تسجيل الدخول" }, { status: 401 });
    }

    const body = await req.json();
    const { botId, action, phone, linkMethod } = body;

    if (!botId) {
      return NextResponse.json({ error: "معرّف البوت مطلوب" }, { status: 400 });
    }

    const admin = createAdmin();

    // التحقق من ملكية البوت أو صلاحية الأدمن (ملكية + إدارة بوتات الآخرين)
    const { data: bot, error: botErr } = await admin
      .from("bots")
      .select("*")
      .eq("id", botId)
      .single();

    if (botErr || !bot) {
      return NextResponse.json({ error: "البوت غير موجود أو ليس لديك صلاحية" }, { status: 404 });
    }

    if (bot.user_id !== user.id && !isAdminUser(user)) {
      return NextResponse.json({ error: "البوت غير موجود أو ليس لديك صلاحية" }, { status: 404 });
    }

    if (action === "start") {
      const rawPhone = phone || bot.phone || bot.linked_number;
      const digits = rawPhone ? normalizePhoneNumber(rawPhone) : null;
      const method = linkMethod || bot.link_method || "pair_code";

      // إذا كان الربط بكود اقتران، يجب توفر رقم
      if (method === "pair_code" && (!digits || digits.length < 10)) {
        return NextResponse.json(
          { error: "يرجى إدخال رقم واتساب صالح مع رمز الدولة (مثال: +96777xxxxxxx)" },
          { status: 400 }
        );
      }

      // إيقاف أي بوتات قديمة لنفس الرقم لتجنب تضارب محرك الواتساب
      if (digits) {
        await admin
          .from("bots")
          .update({ command: "stop", status: "disconnected", pair_code: null, qr: null })
          .or(`phone.eq.${digits},linked_number.eq.${digits}`)
          .neq("id", bot.id);
      }

      // مسح جلسات المصادقة فقط إذا لم يكن البوت مربوطاً مسبقاً برقم
      if (!bot.linked_number && bot.status !== "connected") {
        await admin.from("bot_auth").delete().eq("bot_id", bot.id);
        await admin.from("bot_keys").delete().eq("bot_id", bot.id);
      }

      // تحديث حالة البوت للبدء
      const { data: updated, error: upErr } = await admin
        .from("bots")
        .update({
          command: "start",
          status: "pending",
          phone: digits,
          link_method: method,
          pair_code: null,
          qr: null,
          metadata: {
            last_error: null,
            error_at: null,
            attempt: 0,
            request_restart: Date.now(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", bot.id)
        .select("*")
        .single();

      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, bot: updated });
    }

    if (action === "stop") {
      const { data: updated, error: upErr } = await admin
        .from("bots")
        .update({
          command: "stop",
          status: "disconnected",
          pair_code: null,
          qr: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bot.id)
        .select("*")
        .single();

      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, bot: updated });
    }

    if (action === "unlink") {
      // مسح الجلسة والمفاتيح بالكامل
      await admin.from("bot_auth").delete().eq("bot_id", bot.id);
      await admin.from("bot_keys").delete().eq("bot_id", bot.id);

      const { data: updated, error: upErr } = await admin
        .from("bots")
        .update({
          command: "stop",
          status: "disconnected",
          linked_number: null,
          pair_code: null,
          qr: null,
          metadata: { unlinked_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        .eq("id", bot.id)
        .select("*")
        .single();

      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, bot: updated });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
