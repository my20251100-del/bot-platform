import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";

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
    const { botId, groupId, targetPhone } = body;

    if (!botId || !groupId) {
      return NextResponse.json({ error: "معرف البوت ومعرف المجموعة مطلوبان" }, { status: 400 });
    }

    const admin = createAdmin();
    const { data: bot, error: botErr } = await admin
      .from("bots")
      .select("*")
      .eq("id", botId)
      .eq("user_id", user.id)
      .single();

    if (botErr || !bot) {
      return NextResponse.json({ error: "البوت غير موجود أو ليس لديك صلاحية عليه" }, { status: 404 });
    }

    // الرقم المستهدف هو إما المدخل أو رقم هاتف المستخدم المسجل
    const phoneToPromote = targetPhone || bot.linked_number || bot.phone || "";
    if (!phoneToPromote) {
      return NextResponse.json({ error: "يرجى تحديد رقم الهاتف المراد ترقيته لمشرف" }, { status: 400 });
    }

    const currentMeta = bot.metadata || {};
    const pending = Array.isArray(currentMeta.pending_group_actions) ? [...currentMeta.pending_group_actions] : [];

    pending.push({
      id: "act_" + Date.now(),
      type: "promote",
      group_id: groupId,
      target_phone: phoneToPromote,
      created_at: new Date().toISOString(),
    });

    const { error: upErr } = await admin
      .from("bots")
      .update({
        metadata: {
          ...currentMeta,
          pending_group_actions: pending,
        },
      })
      .eq("id", bot.id);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "تم إرسال أمر الترقية بنجاح! سيتم تنفيذ الترقية عبر البوت فوراً.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
