import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { genOtp, queueOtpSms } from "@/lib/otp";

export const runtime = "nodejs";

function cleanNumber(v: string) {
  return String(v).replace(/\D/g, "").replace(/^0+/, "");
}

// الخطوة الأولى من التسجيل: إنشاء الحساب + إرسال رمز التحقق عبر واتساب (MOH)
export async function POST(req: NextRequest) {
  try {
    const { full_name, email, password, phone } = await req.json();
    if (!full_name || !email || !password || !phone)
      return NextResponse.json({ error: "أكمل جميع الحقول" }, { status: 400 });
    if (String(password).length < 6)
      return NextResponse.json({ error: "كلمة المرور 6 أحرف على الأقل" }, { status: 400 });

    const digits = cleanNumber(phone);
    if (digits.length < 7)
      return NextResponse.json({ error: "رقم واتساب غير صالح" }, { status: 400 });

    const admin = createAdmin();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const code = genOtp();
    const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // إنشاء حساب (verified-email) — البروفايل يُنشأ تلقائياً عبر trigger
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
        user_metadata: {
          full_name,
          phone: digits,
          pending_otp: { code, expires, purpose: "signup" },
        },
      }),
    });
    const usr = await res.json();
    if (!usr?.id) {
      if (res.status === 422)
        return NextResponse.json({ error: "هذا البريد مسجّل مسبقاً" }, { status: 409 });
      return NextResponse.json(
        { error: usr?.msg || "تعذّر إنشاء الحساب (" + res.status + ")" },
        { status: 500 }
      );
    }

    // حفظ رقم الواتساب في البروفايل
    await admin.from("profiles").update({ phone: digits }).eq("id", usr.id);

    // إرسال الرمز عبر بوت MOH
    try {
      await queueOtpSms(
        digits,
        `🔐 *رمز التحقق الخاص بك*\n\nرمز التحقق لحسابك في M aknoon هو:\n\n*${code}*\n\nصلاحيته 5 دقائق. لا تشاركه مع أحد.`
      );
    } catch (e: any) {
      console.error("[otp] send failed:", e.message);
      return NextResponse.json(
        { error: "أُسست الحساب لكن تعذّر إرسال الرمز — جرب مجدداً" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, email });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
