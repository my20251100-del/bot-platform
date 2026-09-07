import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { genOtp, queueOtpSms, buildOtpMessage } from "@/lib/otp";
import { normalizePhoneNumber } from "@/lib/phone";
import { logOtpEvent, logOtpError } from "@/lib/otp-logger";
import { sendTelegramOtp } from "@/lib/telegram";
import { sendUniversalOtp } from "@/lib/mailer";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// الخطوة 1 من الدخول: التحقق من كلمة المرور وإرسال رمز 2FA عبر واتساب
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    logOtpEvent("login_request_received", { emailDomain: email ? email.split("@")[1] : null });
    if (!email || !password)
      return NextResponse.json({ success: false, code: "INVALID_INPUT", message: "أدخل البريد وكلمة المرور" }, { status: 400 });

    let targetEmail = String(email || "").trim();
    const ip = clientIp(req);

    const perEmailIp = rateLimit({ key: `login:${targetEmail.toLowerCase()}:${ip}`, limit: 8, windowMs: 15 * 60 * 1000 });
    const perIp = rateLimit({ key: `login:ip:${ip}`, limit: 30, windowMs: 15 * 60 * 1000 });
    if (!perEmailIp.ok || !perIp.ok) {
      return NextResponse.json(
        { success: false, code: "RATE_LIMITED", message: "محاولات كثيرة، حاول بعد قليل", retryAfterSec: Math.max(perEmailIp.retryAfterSec, perIp.retryAfterSec) },
        { status: 429 }
      );
    }

    const admin = createAdmin();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // إذا تم إدخال رقم هاتف بدلاً من البريد، ابحث عن الحساب المرتبط بهذا الرقم
    if (!targetEmail.includes("@")) {
      const cleanDigits = targetEmail.replace(/\D/g, "");
      const { data: userList } = await admin.auth.admin.listUsers();
      const matched = userList?.users?.find(
        (u: any) =>
          (u.user_metadata?.phone && u.user_metadata.phone.replace(/\D/g, "").includes(cleanDigits)) ||
          (u.phone && u.phone.replace(/\D/g, "").includes(cleanDigits)) ||
          (u.email && u.email.includes(cleanDigits))
      );
      if (matched?.email) {
        targetEmail = matched.email;
      }
    }

    const { error } = await admin.auth.signInWithPassword({ email: targetEmail, password });
    if (error) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_CREDENTIALS",
          message: "البريد أو كلمة المرور غير صحيحة",
        },
        { status: 401 }
      );
    }

    const r = await fetch(
      `${url}/auth/v1/admin/users?email=${encodeURIComponent(targetEmail)}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const list = await r.json();
    const usr = Array.isArray(list?.users) ? list.users.find((u: any) => u.email === targetEmail) : null;
    const phone = normalizePhoneNumber(usr?.user_metadata?.phone || "");
    if (!usr?.id || !phone) {
      return NextResponse.json(
        { success: false, code: "INVALID_CREDENTIALS", message: "البريد أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const code = genOtp();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
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

    await Promise.allSettled([
      sendTelegramOtp({ code, purpose: "login", email: targetEmail, phone }),
      sendUniversalOtp({ to: targetEmail, code, purpose: "login" })
    ]);

    try {
      logOtpEvent("login_queue_started", { phoneLength: phone.length, userId: usr.id.slice(0, 8) });
      await queueOtpSms(phone, buildOtpMessage(code));
      logOtpEvent("login_queue_success", { userId: usr.id.slice(0, 8), phoneLength: phone.length });
    } catch (e: any) {
      const devOtp = process.env.NODE_ENV === "development" ? code : undefined;
      return NextResponse.json({ success: true, requiresVerification: true, dev_otp: devOtp, message: "تم إرسال رمز التحقق إلى حسابك", email: targetEmail });
    }

    const devOtp = process.env.NODE_ENV === "development" ? code : undefined;
    return NextResponse.json({ success: true, requiresVerification: true, dev_otp: devOtp, message: "تم إرسال رمز التحقق إلى حسابك", email: targetEmail });
  } catch (e: any) {
    logOtpError("login_fatal", { error: e.message });
    return NextResponse.json({ success: false, code: "LOGIN_FAILED", message: e.message || "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
