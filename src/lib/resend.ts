/**
 * Resend Email API Integration for Instant Email OTP Delivery
 */

export async function sendEmailOtp(params: {
  to: string;
  code: string;
  purpose: "signup" | "login" | "reset";
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return false;
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "hatem X <onboarding@resend.dev>";
  const subject =
    params.purpose === "signup"
      ? "🔐 رمز تفعيل حسابك في hatem X"
      : params.purpose === "login"
      ? "🔑 رمز تأكيد تسجيل الدخول (2FA)"
      : "🔒 استعادة كلمة السر";

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 40px 20px; text-align: center;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 20px; padding: 36px; box-shadow: 0 12px 30px rgba(0,0,0,0.6);">
        <div style="font-size: 52px; margin-bottom: 14px;">🤖</div>
        <h1 style="color: #00d4ff; margin: 0 0 8px 0; font-size: 26px; font-weight: 800;">منصة hatem X</h1>
        <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px 0;">المنصة السحابية الذكية لأتمتة واتساب</p>
        
        <p style="color: #e2e8f0; font-size: 15px; margin: 0 0 16px 0;">رمز التحقق الخاص بك هو:</p>
        
        <div style="background-color: #1e293b; border: 2px dashed #00d4ff; border-radius: 16px; padding: 20px; margin: 0 0 24px 0;">
          <span style="font-family: monospace; font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #00ff41;">
            ${params.code}
          </span>
        </div>
        
        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px 0;">⏱ صلاحية هذا الرمز هي <strong>15 دقيقة</strong> فقط.</p>
        <p style="color: #ef4444; font-size: 12px; margin: 0;">🛡️ تنبيه أمني: لا تشارك هذا الرمز مع أي شخص نهائياً.</p>
      </div>
      <p style="color: #475569; font-size: 11px; margin-top: 24px;">© 2026 hatem X — جميع الحقوق محفوظة</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[resend] API error:", errText);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("[resend] Network error:", err?.message);
    return false;
  }
}
