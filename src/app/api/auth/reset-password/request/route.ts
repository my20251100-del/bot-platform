import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { genOtp, queueOtpSms } from "@/lib/otp";
import { normalizePhoneNumber } from "@/lib/phone";
import { logOtpEvent, logOtpError } from "@/lib/otp-logger";
import { sendTelegramOtp } from "@/lib/telegram";
import { sendUniversalOtp } from "@/lib/mailer";

export const runtime = "nodejs";

function buildResetOtpMessage(code: string) {
  return `🔐 *بوت برو — استعادة كلمة المرور*\n\nرمز التحقق لتعيين كلمة مرور جديدة هو:\n\n*${code}*\n\nصالح لمدة 15 دقيقة.\nلا تشارك هذا الرمز مع أي شخص.\n\n— بوت برو`;
}

// طلب استعادة كلمة المرور عبر إرسال رمز OTP
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, code: "INVALID_INPUT", message: "يرجى كتابة البريد الإلكتروني" },
        { status: 400 }
      );
    }

    const admin = createAdmin();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // البحث عن المستخدم
    const r = await fetch(
      `${url}/auth/v1/admin/users?email=${encodeURIComponent(cleanEmail)}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const list = await r.json();
    const usr = Array.isArray(list?.users) ? list.users.find((u: any) => u.email?.toLowerCase() === cleanEmail) : null;

    if (!usr?.id) {
      return NextResponse.json(
        { success: false, code: "USER_NOT_FOUND", message: "هذا البريد الإلكتروني غير مسجل في المنصة" },
        { status: 404 }
      );
    }

    const phone = normalizePhoneNumber(usr?.user_metadata?.phone || "");
    const code = genOtp();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const meta = usr.user_metadata || {};

    // حفظ رمز OTP في بيانات المستخدم
    const upd = await fetch(`${url}/auth/v1/admin/users/${usr.id}`, {
      method: "PUT",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_metadata: { ...meta, pending_otp: { code, expires, purpose: "reset_password" } },
      }),
    });

    if (!upd.ok) {
      throw new Error("تعذر إنشاء رمز التحقق");
    }

    // إرسال الرمز عبر القنوات المتاحة
    sendTelegramOtp({ code, purpose: "reset", email: cleanEmail, phone }).catch(() => {});
    sendUniversalOtp({ to: cleanEmail, code, purpose: "reset" }).catch(() => {});

    if (phone) {
      try {
        await queueOtpSms(phone, buildResetOtpMessage(code));
      } catch (e: any) {
        logOtpError("reset_queue_failed", { userId: usr.id, error: e.message });
      }
    }

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      dev_otp: code,
      message: "تم إرسال رمز التحقق إلى بريدك وواتسابك بنجاح",
      email: cleanEmail,
    });
  } catch (e: any) {
    logOtpError("reset_fatal", { error: e.message });
    return NextResponse.json(
      { success: false, code: "RESET_FAILED", message: e.message || "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}
