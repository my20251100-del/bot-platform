import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// يبحث عن بوت مرتبط برقم ما؛ إن لم يوجد، يُنشئ حساباً وبوتاً تلقائياً
// حتى يتمكّن العميل من الاشتراك بنفسه دون نموذج تسجيل أو انتظار الأدمن.
function genCode() {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");
}

// استطلاع الحالة الحالية للربط (QR/كود/متصل) بعد أن يولّدها المحرك
export async function GET(req: NextRequest) {
  try {
    const number = req.nextUrl.searchParams.get("number") || "";
    const digits = String(number).replace(/\D/g, "").replace(/^0+/, "");
    if (!digits) return NextResponse.json({ error: "رقم غير صالح" }, { status: 400 });

    const admin = createAdmin();
    const { data: bots, error } = await admin
      .from("bots")
      .select("id, name, status, command, link_method, pair_code, qr, linked_number, settings, phone")
      .or(`phone.eq.${digits},linked_number.eq.${digits}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const bot = bots?.[0];
    if (!bot) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const isPending = bot.status === "pending" || !!bot.qr || (!!bot.pair_code && !bot.linked_number && bot.command === "start");

    return NextResponse.json({
      ok: true,
      bot: {
        id: bot.id,
        name: bot.name,
        status: bot.status,
        linked_number: bot.linked_number ?? bot.phone ?? digits,
        link_method: bot.link_method,
        pair_code: bot.pair_code,
        qr: bot.qr,
        isPending,
        secret: bot.settings?.secret ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// إنشاء حساب مؤقت خلف الكواليس للعميل (بلا نموذج تسجيل ظاهر) حتى يحصل على user_id
// الذي يُطلب في مخطط جدول bots. يُفيد تدفق «ادخل رقمك واربط فوراً».
function makeEmail(digits: string) {
  return `wa_${digits}@m-aknoon.local`;
}
function genPassword() {
  return "WPX" + Array.from({ length: 12 }, () => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 57)]).join("");
}
async function ensureSystemUser(admin: any, digits: string) {
  const email = makeEmail(digits);
  const { data: existing } = await admin.from("profiles").select("id,email").eq("email", email).maybeSingle();
  if (existing) return { user_id: existing.id, email, existing: true };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const password = genPassword();
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "عميل واتساب" },
    }),
  });
  const usr = await res.json();
  if (!usr?.id) {
    // قد يكون الحساب موجوداً مسبقاً (سبب آخر غير الاستعلام أعلاه)
    const { data: again } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (again) return { user_id: again.id, email, existing: true };
    throw new Error((usr?.msg || "failed to create user") + " (" + res.status + ")");
  }

  // البروفايل يُنشأ تلقائياً عبر trigger (on_auth_user_created).
  // لا نُدرج يدوياً لتجنّب تكرار الصف (قيد profiles_pkey).
  // نعيد جلب البروفايل المُنشأ تلقائياً؛ وإن تعذّر (غياب الـ trigger)
  // نُنشئه بإدراج آمن يتجاهل التكرار.
  const { data: prof } = await admin
    .from("profiles")
    .select("id")
    .eq("id", usr.id)
    .maybeSingle();

  if (prof) return { user_id: prof.id, email, existing: false };

  const { data: inserted } = await admin
    .from("profiles")
    .insert({
      id: usr.id,
      email,
      full_name: "عميل واتساب",
      referral_code: `wa${Math.random().toString(36).slice(2, 8)}`,
    })
    .select("id")
    .single();

  if (inserted) return { user_id: inserted.id, email, existing: false };

  const { data: retry } = await admin.from("profiles").select("id").eq("id", usr.id).maybeSingle();
  if (retry) return { user_id: retry.id, email, existing: false };

  throw new Error("تعذّر إنشاء الحساب");
}

export async function POST(req: NextRequest) {
  try {
    const { number, action, name: botName } = await req.json();
    if (!number) return NextResponse.json({ error: "أدخل رقم الواتساب" }, { status: 400 });

    const digits = String(number).replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length < 7) return NextResponse.json({ error: "رقم غير صالح" }, { status: 400 });

    const admin = createAdmin();

    // البحث عن بوت مربوط بهذا الرقم (مرتبط أو بأنه الرقم المطلوب ربطه)
    const { data: bots, error } = await admin
      .from("bots")
      .select("id, name, status, command, link_method, pair_code, qr, linked_number, settings, phone")
      .or(`phone.eq.${digits},linked_number.eq.${digits}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let bot = bots?.[0];

    // لم يجد بوتاً لهذا الرقم — نُنشئ حساباً وحساب بوت تلقائياً (بلا نموذج تسجيل)
    if (!bot) {
      const { user_id } = await ensureSystemUser(admin, digits);
      const name = (botName && String(botName).trim()) || "بوتي";
      const { data: created, error: insErr } = await admin
        .from("bots")
        .insert({
          user_id,
          name,
          phone: digits,
          link_method: "pair_code",
          status: "pending",
          pair_code: genCode(),
          command: "start",
        })
        .select("id, name, status, command, link_method, pair_code, qr, linked_number, settings, phone")
        .single();
      if (insErr || !created) {
        return NextResponse.json({ error: insErr?.message || "تعذّر إنشاء البوت" }, { status: 500 });
      }
      created.command = "start";
      return NextResponse.json({
        ok: true,
        bot: {
          id: created.id,
          name: created.name,
          status: "pending",
          linked_number: digits,
          link_method: created.link_method,
          pair_code: created.pair_code,
          qr: null,
          isPending: true,
          secret: created.settings?.secret ?? null,
        },
      });
    }

    // إجراء بدء الربط: تشغيل المحرك لتوليد QR/كود الاقتران
    if (action === "start") {
      const { error: upErr } = await admin
        .from("bots")
        .update({ command: "start", qr: null, status: "pending" })
        .eq("id", bot.id);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      bot.command = "start";
      bot.status = "pending";
      bot.qr = null;
    }

    const isPending = bot.status === "pending" || !!bot.qr || (!!bot.pair_code && !bot.linked_number && bot.command === "start");

    return NextResponse.json({
      ok: true,
      bot: {
        id: bot.id,
        name: bot.name,
        status: bot.status,
        linked_number: bot.linked_number ?? bot.phone ?? digits,
        link_method: bot.link_method,
        pair_code: bot.pair_code,
        qr: bot.qr,
        isPending,
        secret: bot.settings?.secret ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
