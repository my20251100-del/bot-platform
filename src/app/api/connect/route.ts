import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { normalizePhoneNumber, isValidWhatsAppPhone } from "@/lib/phone";

export const runtime = "nodejs";

function toBotPayload(b: any, digits: string) {
  const isPending =
    b.status === "pending" || !!b.qr || (!!b.pair_code && !b.linked_number && b.command === "start");
  return {
    id: b.id,
    name: b.name,
    status: b.status,
    linked_number: b.linked_number ?? (b.phone ? b.phone : null),
    link_method: b.link_method,
    pair_code: b.pair_code ?? null,
    qr: b.qr ?? null,
    isPending,
    secret: b.settings?.secret ?? null,
  };
}

// استلام حالة الربط الحالية (QR / الكود / متصل). الاتصال الفعلي يقوم به المحرك.
export async function GET(req: NextRequest) {
  try {
    const number = (req.nextUrl.searchParams.get("number") || "").replace(/\D/g, "");
    if (!number) return NextResponse.json({ error: "رقم غير صالح" }, { status: 400 });

    const admin = createAdmin();
    const { data: bots, error } = await admin
      .from("bots")
      .select("id, name, status, command, link_method, pair_code, qr, linked_number, settings, phone")
      .or(`phone.eq.${number},linked_number.eq.${number}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const bot = bots?.[0];
    if (!bot) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({ ok: true, bot: toBotPayload(bot, number) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

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
      user_metadata: { full_name: "عميل واتساب", phone: digits },
    }),
  });
  const usr = await res.json();
  if (!usr?.id) {
    const { data: again } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (again) return { user_id: again.id, email, existing: true };
    throw new Error((usr?.msg || "failed to create user") + " (" + res.status + ")");
  }

  let profileId = null;
  for (let i = 0; i < 10; i++) {
    const { data: profRow } = await admin.from("profiles").select("id").eq("id", usr.id).maybeSingle();
    if (profRow) {
      profileId = profRow.id;
      break;
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  if (!profileId) throw new Error("تعذّر إنشاء الحساب (لم يظهر البروفايل)");
  await admin.from("profiles").update({ phone: digits }).eq("id", profileId);
  return { user_id: profileId, email, existing: false };
}

// إنشاء بوت جديد / إعادة بدء الربط
// — يمنع إنشاء أكثر من بوت لنفس الرقم، ويترك الكود الحقيقي يولّده المحرك (Baileys).
export async function POST(req: NextRequest) {
  try {
    const { number, action, name: botName } = await req.json();
    if (!number) return NextResponse.json({ error: "أدخل رقم الواتساب" }, { status: 400 });

    const digits = normalizePhoneNumber(number);
    if (!isValidWhatsAppPhone(digits))
      return NextResponse.json({ error: "رقم واتساب غير صالح" }, { status: 400 });

    const admin = createAdmin();

    const { data: bots, error } = await admin
      .from("bots")
      .select("id, name, status, command, link_method, pair_code, qr, linked_number, settings, phone, user_id")
      .or(`phone.eq.${digits},linked_number.eq.${digits}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let bot = bots?.[0];

    // لم يجد بوتاً لهذا الرقم — أنشئ حساباً وبوتاً واحداً فقط (بدون كود وهمي)
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
          pair_code: null,
          qr: null,
          command: "start",
        })
        .select("id, name, status, command, link_method, pair_code, qr, linked_number, settings, phone")
        .single();
      if (insErr || !created) {
        return NextResponse.json({ error: insErr?.message || "تعذّر إنشاء البوت" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, bot: toBotPayload(created, digits) });
    }

    // إعادة بدء الربط: يشغّل المحرك لتوليد كود اقتران / QR حقيقي
    if (action === "start") {
      const { error: upErr } = await admin
        .from("bots")
        .update({ command: "start", qr: null, pair_code: null, status: "pending" })
        .eq("id", bot.id);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      bot.command = "start";
      bot.status = "pending";
      bot.qr = null;
      bot.pair_code = null;
    }

    return NextResponse.json({ ok: true, bot: toBotPayload(bot, digits) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
