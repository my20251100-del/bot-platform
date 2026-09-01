import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { genOtp, queueOtpSms, buildOtpMessage } from "@/lib/otp";
import { normalizePhoneNumber, isValidWhatsAppPhone } from "@/lib/phone";
import { logOtpEvent, logOtpError } from "@/lib/otp-logger";
import { validateGoogleSignupEmail } from "@/lib/email";

export const runtime = "nodejs";

async function updateUserMetadata(userId: string, metadata: Record<string, any>, url: string, key: string) {
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_metadata: metadata }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "تعذّر تحديث بيانات المستخدم");
  }
}

// الخطوة الأولى من التسجيل: إنشاء الحساب + إرسال رمز التحقق عبر واتساب (MOH)
export async function POST(req: NextRequest) {
  try {
    const { full_name, email, password, phone, referral_code } = await req.json();
    logOtpEvent("signup_request_received", { emailDomain: email ? email.split("@")[1] : null, hasReferral: Boolean(referral_code), phoneLength: String(phone || "").length });

    if (!full_name || !email || !password || !phone)
      return NextResponse.json({ success: false, code: "INVALID_INPUT", message: "أكمل جميع الحقول" }, { status: 400 });
    if (String(password).length < 6)
      return NextResponse.json({ success: false, code: "WEAK_PASSWORD", message: "كلمة المرور 6 أحرف على الأقل" }, { status: 400 });

    const emailCheck = validateGoogleSignupEmail(email);
    if (!emailCheck.ok) {
      return NextResponse.json({ success: false, code: "INVALID_EMAIL", message: emailCheck.message }, { status: 400 });
    }

    const normalizedEmail = emailCheck.email;
    const digits = normalizePhoneNumber(phone);
    if (!isValidWhatsAppPhone(digits))
      return NextResponse.json({ success: false, code: "INVALID_PHONE", message: "رقم واتساب غير صالح" }, { status: 400 });

    logOtpEvent("signup_input_validated", { phoneLength: digits.length, emailDomain: normalizedEmail.split("@")[1] || null });

    const admin = createAdmin();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const existingRes = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(normalizedEmail)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    logOtpEvent("signup_user_lookup_completed", { status: existingRes.status, emailDomain: normalizedEmail.split("@")[1] || null });
    const existingJson = await existingRes.json();
    const existingUser = Array.isArray(existingJson?.users) ? existingJson.users.find((u: any) => u.email === normalizedEmail) : null;

    if (existingUser) {
      const meta = existingUser.user_metadata || {};
      const pendingStatus = String(meta.verification_status || meta.pending_verification || "");
      if (pendingStatus === "pending_verification" || meta.pending_otp) {
        const code = genOtp();
        const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        const nextMeta = {
          ...meta,
          full_name: full_name || meta.full_name,
          phone: digits,
          referral_code: referral_code?.trim() || meta.referral_code,
          verification_status: "pending_verification",
          pending_otp: { code, expires, purpose: "signup" },
        };

        try {
          await updateUserMetadata(existingUser.id, nextMeta, url, key);
          await queueOtpSms(digits, buildOtpMessage(code));
          return NextResponse.json({
            success: true,
            requiresVerification: true,
            message: "تم إرسال رمز التحقق إلى واتسابك",
            email,
          });
        } catch (e: any) {
          console.error("[signup][otp resend failed]", e.message);
          return NextResponse.json(
            {
              success: false,
              code: "OTP_SEND_FAILED",
              requiresVerification: true,
              message: "تعذر إرسال رمز التحقق عبر واتساب. تأكد من اتصال البوت ثم حاول مرة أخرى.",
            },
            { status: 503 }
          );
        }
      }

      return NextResponse.json({ success: false, code: "USER_EXISTS", message: "هذا البريد مسجّل مسبقاً" }, { status: 409 });
    }

    const code = genOtp();
    const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    logOtpEvent("signup_otp_generated", { expiresAt: expires, otpLength: code.length, purpose: "signup" });

    const res = await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          phone: digits,
          referral_code: referral_code?.trim() || undefined,
          verification_status: "pending_verification",
          pending_otp: { code, expires, purpose: "signup" },
        },
      }),
    });

    const usr = await res.json();
    if (!usr?.id) {
      if (res.status === 422)
        return NextResponse.json({ success: false, code: "USER_EXISTS", message: "هذا البريد مسجّل مسبقاً" }, { status: 409 });
      return NextResponse.json(
        { success: false, code: "USER_CREATE_FAILED", message: usr?.msg || "تعذّر إنشاء الحساب" },
        { status: 500 }
      );
    }

    try {
      await admin.from("profiles").update({ phone: digits }).eq("id", usr.id);
      logOtpEvent("signup_queue_started", { phoneLength: digits.length, userId: usr.id.slice(0, 8) });
      await queueOtpSms(digits, buildOtpMessage(code));
      logOtpEvent("signup_queue_success", { userId: usr.id.slice(0, 8), phoneLength: digits.length });
      return NextResponse.json({
        success: true,
        requiresVerification: true,
        message: "تم إرسال رمز التحقق إلى واتسابك",
        email,
      });
    } catch (e: any) {
      logOtpError("signup_queue_failed", { userId: usr?.id ? String(usr.id).slice(0, 8) : null, error: e.message, phoneLength: digits.length });
      try {
        await updateUserMetadata(
          usr.id,
          {
            ...(usr.user_metadata || {}),
            full_name,
            phone: digits,
            verification_status: "pending_verification",
            pending_otp: { code, expires, purpose: "signup" },
            last_otp_error: e.message,
          },
          url,
          key
        );
      } catch {}

      return NextResponse.json(
        {
          success: false,
          code: "OTP_SEND_FAILED",
          requiresVerification: true,
          message: "تعذر إرسال رمز التحقق عبر واتساب. تأكد من اتصال البوت ثم حاول مرة أخرى.",
        },
        { status: 503 }
      );
    }
  } catch (e: any) {
    logOtpError("signup_fatal", { error: e.message });
    return NextResponse.json({ success: false, code: "SIGNUP_FAILED", message: e.message || "حدث خطأ أثناء إنشاء الحساب" }, { status: 500 });
  }
}
