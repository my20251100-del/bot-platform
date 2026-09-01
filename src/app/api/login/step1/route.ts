import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { genOtp, queueOtpSms, buildOtpMessage } from "@/lib/otp";
import { normalizePhoneNumber } from "@/lib/phone";
import { logOtpEvent, logOtpError } from "@/lib/otp-logger";

export const runtime = "nodejs";

// الخطوة 1 من الدخول: التحقق من كلمة المرور وإرسال رمز 2FA عبر واتساب
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    logOtpEvent("login_request_received", { emailDomain: email ? email.split("@")[1] : null });
    if (!email || !password)
      return NextResponse.json({ success: false, code: "INVALID_INPUT", message: "أدخل البريد وكلمة المرور" }, { status: 400 });

    const admin = createAdmin();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const { error } = await admin.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_CREDENTIALS",
          message: error.message.includes("confirmation") ? error.message : "البريد أو كلمة المرور غير صحيحة",
        },
        { status: 401 }
      );
    }

    const r = await fetch(
      `${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const list = await r.json();
    const usr = Array.isArray(list?.users) ? list.users.find((u: any) => u.email === email) : null;
    const phone = normalizePhoneNumber(usr?.user_metadata?.phone || "");
    if (!usr?.id || !phone)
      return NextResponse.json({ success: false, code: "NO_WHATSAPP_PHONE", message: "رقم واتساب غير مسجّل لهذا الحساب" }, { status: 400 });

    const code = genOtp();
    const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    logOtpEvent("login_otp_generated", { expiry: expires, purpose: "login", phoneLength: phone.length });
    const meta = usr.user_metadata || {};

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

    try {
      logOtpEvent("login_queue_started", { phoneLength: phone.length, userId: usr.id.slice(0, 8) });
      await queueOtpSms(phone, buildOtpMessage(code));
      logOtpEvent("login_queue_success", { userId: usr.id.slice(0, 8), phoneLength: phone.length });
    } catch (e: any) {
      logOtpError("login_queue_failed", { userId: usr.id.slice(0, 8), error: e.message, phoneLength: phone.length });
      return NextResponse.json({ success: false, code: "OTP_SEND_FAILED", message: "تعذّر إرسال الرمز — جرب مجدداً" }, { status: 500 });
    }

    return NextResponse.json({ success: true, requiresVerification: true, message: "تم إرسال رمز التحقق", email });
  } catch (e: any) {
    logOtpError("login_fatal", { error: e.message });
    return NextResponse.json({ success: false, code: "LOGIN_FAILED", message: e.message || "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
