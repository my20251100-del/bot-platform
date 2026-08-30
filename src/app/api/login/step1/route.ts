import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { genOtp, queueOtpSms } from "@/lib/otp";

export const runtime = "nodejs";

// الخطوة 1 من الدخول: التحقق من كلمة المرور وإرسال رمز 2FA عبر واتساب
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json({ error: "أدخل البريد وكلمة المرور" }, { status: 400 });

    const admin = createAdmin();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // التحقق من صحة الاعتماديات (بدون منح جلسة بعد — لانتظار الرمز)
    const { error } = await admin.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json(
        { error: error.message.includes("confirmation") ? error.message : "البريد أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    // جلب رقم واتساب المستخدم
    const r = await fetch(
      `${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const list = await r.json();
    const usr = Array.isArray(list?.users) ? list.users.find((u: any) => u.email === email) : null;
    const phone = (usr?.user_metadata?.phone || "").replace(/\D/g, "").replace(/^0+/, "");
    if (!usr?.id || !phone)
      return NextResponse.json({ error: "رقم واتساب غير مسجّل لهذا الحساب" }, { status: 400 });

    const code = genOtp();
    const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const meta = usr.user_metadata || {};

    // حفظ الرمز المعلّق
    const upd = await fetch(`${url}/auth/v1/admin/users/${usr.id}`, {
      method: "PUT",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_metadata: { ...meta, pending_otp: { code, expires, purpose: "login" } },
      }),
    });
    if (!upd.ok) throw new Error("فشل حفظ رمز التحقق");

    // إرسال الرمز عبر بوت MOH
    try {
      await queueOtpSms(
        phone,
        `🔐 *رمز التحقق لتسجيل الدخول*\n\nرمز التحقق لحسابك في M aknoon هو:\n\n*${code}*\n\nصلاحيته 5 دقائق. لا تشاركه مع أحد.`
      );
    } catch (e: any) {
      return NextResponse.json({ error: "تعذّر إرسال الرمز — جرب مجدداً" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, email });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
