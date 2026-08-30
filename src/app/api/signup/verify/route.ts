import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function cleanNumber(v: string) {
  return String(v).replace(/\D/g, "").replace(/^0+/, "");
}

// التحقق من رمز التسجيل الذي وصله المستخدم عبر واتساب
export async function POST(req: NextRequest) {
  try {
    const { email, phone, code } = await req.json();
    if (!email || !phone || !code)
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

    const digits = cleanNumber(phone);
    const admin = createAdmin();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // جلب المستخدم لإيجاد رمزه المعلّق
    const r = await fetch(
      `${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const list = await r.json();
    const usr = Array.isArray(list?.users) ? list.users.find((u: any) => u.email === email) : null;
    if (!usr?.id)
      return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });

    const meta = usr.user_metadata || {};
    const pending = meta.pending_otp;
    // الرمز يجب أن يكون لغرض التسجيل وبالرقم المطلوب
    if (!pending || pending.purpose !== "signup") {
      return NextResponse.json({ error: "لا يوجد رمز معلّق، أعد المحاولة" }, { status: 400 });
    }
    if (meta.phone !== digits) {
      return NextResponse.json({ error: "رقم غير مطابق" }, { status: 400 });
    }
    if (new Date(pending.expires).getTime() < Date.now()) {
      return NextResponse.json({ error: "انتهت صلاحية الرمز، أعد إرساله" }, { status: 400 });
    }
    if (String(pending.code) !== String(code).trim()) {
      return NextResponse.json({ error: "الرمز غير صحيح" }, { status: 400 });
    }

    // مسح الرمز المعلّق + تفعيل الرقم في البروفايل
    const upd = await fetch(`${url}/auth/v1/admin/users/${usr.id}`, {
      method: "PUT",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_metadata: { ...meta, pending_otp: null },
      }),
    });
    if (!upd.ok) throw new Error("فشل تحديث الحساب");
    await admin.from("profiles").update({ phone_verified: true }).eq("id", usr.id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
