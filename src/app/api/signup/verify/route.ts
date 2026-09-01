import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { normalizePhoneNumber } from "@/lib/phone";
import { logOtpEvent, logOtpError } from "@/lib/otp-logger";

export const runtime = "nodejs";

// التحقق من رمز التسجيل الذي وصله المستخدم عبر واتساب
export async function POST(req: NextRequest) {
  try {
    const { email, phone, code } = await req.json();
    logOtpEvent("signup_verify_request_received", { emailDomain: email ? email.split("@")[1] : null, phoneLength: String(phone || "").length });

    if (!email || !phone || !code)
      return NextResponse.json({ success: false, code: "INVALID_INPUT", message: "بيانات ناقصة" }, { status: 400 });

    const digits = normalizePhoneNumber(phone);
    const admin = createAdmin();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const r = await fetch(
      `${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const list = await r.json();
    const usr = Array.isArray(list?.users) ? list.users.find((u: any) => u.email === email) : null;
    if (!usr?.id)
      return NextResponse.json({ success: false, code: "USER_NOT_FOUND", message: "الحساب غير موجود" }, { status: 404 });

    const meta = usr.user_metadata || {};
    const pending = meta.pending_otp;
    if (!pending || pending.purpose !== "signup") {
      return NextResponse.json({ success: false, code: "NO_PENDING_OTP", message: "لا يوجد رمز معلّق، أعد المحاولة" }, { status: 400 });
    }
    if (String(meta.phone || "") !== String(digits)) {
      return NextResponse.json({ success: false, code: "PHONE_MISMATCH", message: "رقم غير مطابق" }, { status: 400 });
    }
    if (new Date(pending.expires).getTime() < Date.now()) {
      return NextResponse.json({ success: false, code: "OTP_EXPIRED", message: "انتهت صلاحية الرمز، أعد إرساله" }, { status: 400 });
    }
    if (String(pending.code) !== String(code).trim()) {
      return NextResponse.json({ success: false, code: "OTP_INVALID", message: "الرمز غير صحيح" }, { status: 400 });
    }

    const upd = await fetch(`${url}/auth/v1/admin/users/${usr.id}`, {
      method: "PUT",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_metadata: {
          ...meta,
          verification_status: "verified",
          pending_otp: null,
          verified_at: new Date().toISOString(),
        },
      }),
    });
    if (!upd.ok) throw new Error("فشل تحديث الحساب");

    try {
      await admin.from("profiles").update({ phone_verified: true }).eq("id", usr.id);
    } catch {}

    logOtpEvent("signup_verified_success", { userId: usr.id.slice(0, 8), phoneLength: digits.length });
    return NextResponse.json({ success: true, message: "تم تأكيد الحساب بنجاح" });
  } catch (e: any) {
    logOtpError("signup_verify_failed", { error: e.message });
    return NextResponse.json({ success: false, code: "VERIFY_FAILED", message: e.message || "حدث خطأ أثناء التحقق" }, { status: 500 });
  }
}
