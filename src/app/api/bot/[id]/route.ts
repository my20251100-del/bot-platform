import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { normalizePhoneNumber } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function loadBotWithAuth(botId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) {
    return { error: NextResponse.json({ error: "غير مصرح — يرجى تسجيل الدخول" }, { status: 401 }) };
  }

  const admin = createAdmin();
  const { data: bot, error } = await admin
    .from("bots")
    .select("id, user_id")
    .eq("id", botId)
    .maybeSingle();

  if (error || !bot) {
    return { error: NextResponse.json({ error: "البوت غير موجود" }, { status: 404 }) };
  }

  if (bot.user_id !== user.id && !isAdminUser(user)) {
    return { error: NextResponse.json({ error: "لا تملك صلاحية على هذا البوت" }, { status: 403 }) };
  }

  return { user, admin, bot };
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const access = await loadBotWithAuth(id);
  if (access.error) return access.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name || name.length > 120) {
      return NextResponse.json({ error: "الاسم غير صالح (حتى 120 حرفاً)" }, { status: 400 });
    }
    patch.name = name;
  }

  if (body.phone !== undefined) {
    const digits = normalizePhoneNumber(String(body.phone || ""));
    if (!digits || digits.length < 8) {
      return NextResponse.json({ error: "رقم واتساب غير صالح" }, { status: 400 });
    }
    patch.phone = digits;
  }

  if (body.linked_number !== undefined) {
    const linked = String(body.linked_number || "").replace(/\D/g, "");
    patch.linked_number = linked || null;
  }

  if (body.link_method !== undefined) {
    if (!["qr", "pair_code"].includes(body.link_method)) {
      return NextResponse.json({ error: "طريقة الربط غير صالحة" }, { status: 400 });
    }
    patch.link_method = body.link_method;
  }

  if (body.status !== undefined) {
    if (!["disconnected", "pending", "connected"].includes(body.status)) {
      return NextResponse.json({ error: "الحالة غير صالحة" }, { status: 400 });
    }
    patch.status = body.status;
    if (body.status !== "connected") {
      patch.qr = null;
      patch.pair_code = null;
    }
  }

  if (body.command !== undefined) {
    if (!["start", "stop", "unlink"].includes(body.command)) {
      return NextResponse.json({ error: "الأمر غير صالح" }, { status: 400 });
    }
    patch.command = body.command;
    if (body.command === "start") {
      patch.status = "pending";
      patch.qr = null;
      patch.pair_code = null;
      patch.metadata = {
        last_error: null,
        error_at: null,
        attempt: 0,
        request_restart: Date.now(),
      };
    }
    if (body.command === "stop" || body.command === "unlink") {
      patch.status = "disconnected";
      patch.qr = null;
      patch.pair_code = null;
    }
  }

  if (body.pair_code !== undefined) {
    const code = String(body.pair_code || "").trim();
    patch.pair_code = code ? code.slice(0, 10) : null;
  }

  if (body.settings !== undefined && body.settings && typeof body.settings === "object") {
    patch.settings = body.settings;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول للتعديل" }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const admin = access.admin;
  const { data: updated, error: updErr } = await admin
    .from("bots")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (updErr || !updated) {
    return NextResponse.json({ error: updErr?.message || "تعذّر تحديث البوت" }, { status: 500 });
  }

  if (patch.command === "unlink") {
    await access.admin.from("bot_auth").delete().eq("bot_id", id);
    await access.admin.from("bot_keys").delete().eq("bot_id", id);
    await access.admin
      .from("bots")
      .update({ linked_number: null, pair_code: null, qr: null })
      .eq("id", id);
    updated.linked_number = null;
  }

  return NextResponse.json({ ok: true, bot: updated });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const access = await loadBotWithAuth(id);
  if (access.error) return access.error;

  const admin = access.admin;

  await Promise.all([
    admin.from("bot_auth").delete().eq("bot_id", id),
    admin.from("bot_keys").delete().eq("bot_id", id),
    admin.from("bot_logs").delete().eq("bot_id", id),
    admin.from("scheduled_posts").delete().eq("bot_id", id),
  ]);

  const { error } = await admin.from("bots").delete().eq("id", id).select("id").single();
  if (error) {
    return NextResponse.json({ error: error.message || "تعذّر حذف البوت" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deletedId: id });
}