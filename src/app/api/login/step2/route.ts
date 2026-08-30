import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// الخطوة 2 من الدخول: التحقق من رمز 2FA ثم منح الجلسة فعلياً
export async function POST(req: NextRequest) {
  try {
    const { email, password, code } = await req.json();
    if (!email || !password || !code)
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

    const admin = createAdmin();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // جلب المستخدم وفحص الرمز
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
    if (!pending || pending.purpose !== "login")
      return NextResponse.json({ error: "لا يوجد رمز معلّق" }, { status: 400 });
    if (new Date(pending.expires).getTime() < Date.now())
      return NextResponse.json({ error: "انتهت صلاحية الرمز، أعد تسجيل الدخول" }, { status: 400 });
    if (String(pending.code) !== String(code).trim())
      return NextResponse.json({ error: "الرمز غير صحيح" }, { status: 400 });

    // مسح الرمز المعلّق
    await fetch(`${url}/auth/v1/admin/users/${usr.id}`, {
      method: "PUT",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ user_metadata: { ...meta, pending_otp: null } }),
    });

    // منح الجلسة فعلياً (اكتب كوكيز) بعد نجاح التحقق
    const supabase = await createClient();
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr)
      return NextResponse.json({ error: "حدث خطأ أثناء الدخول" }, { status: 401 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
