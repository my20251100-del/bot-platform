import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// تأكيد رمز OTP وتعيين كلمة المرور الجديدة
export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanCode = String(code || "").trim();
    const cleanPw = String(newPassword || "").trim();

    if (!cleanEmail || !cleanCode || !cleanPw) {
      return NextResponse.json(
        { success: false, message: "يرجى تعبئة جميع الحقول المطلوبة" },
        { status: 400 }
      );
    }

    if (cleanPw.length < 6) {
      return NextResponse.json(
        { success: false, message: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل" },
        { status: 400 }
      );
    }

    const admin = createAdmin();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // جلب المستخدم
    const r = await fetch(
      `${url}/auth/v1/admin/users?email=${encodeURIComponent(cleanEmail)}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const list = await r.json();
    const usr = Array.isArray(list?.users) ? list.users.find((u: any) => u.email?.toLowerCase() === cleanEmail) : null;

    if (!usr?.id) {
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    const meta = usr.user_metadata || {};
    const pending = meta.pending_otp;

    if (!pending || pending.purpose !== "reset_password") {
      return NextResponse.json(
        { success: false, message: "لا يوجد طلب استعادة معلّق. يرجى طلب رمز جديد." },
        { status: 400 }
      );
    }

    if (new Date(pending.expires).getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, message: "انتهت صلاحية الرمز. يرجى طلب رمز تحقق جديد." },
        { status: 400 }
      );
    }

    if (String(pending.code) !== cleanCode) {
      return NextResponse.json(
        { success: false, message: "رمز التحقق غير صحيح، يرجى التأكد وإعادة المحاولة." },
        { status: 400 }
      );
    }

    // تحديث كلمة المرور ومسح الرمز المعلق
    const { error: updateError } = await admin.auth.admin.updateUserById(usr.id, {
      password: cleanPw,
      user_metadata: { ...meta, pending_otp: null },
      email_confirm: true,
    });

    if (updateError) {
      return NextResponse.json(
        { success: false, message: `تعذر تحديث كلمة المرور: ${updateError.message}` },
        { status: 500 }
      );
    }

    // تسجيل الدخول ومنح الجلسة فوراً للمستخدم
    const supabase = await createClient();
    await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPw,
    });

    return NextResponse.json({
      success: true,
      message: "تم تعيين كلمة المرور الجديدة بنجاح! جارٍ تحويلك للوحة التحكم...",
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e.message || "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
