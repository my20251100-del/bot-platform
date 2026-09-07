import nodemailer from "nodemailer";
import { sendEmailOtp as sendResendOtp } from "./resend";

export async function sendUniversalOtp(params: {
  to: string;
  code: string;
  purpose: "signup" | "login" | "reset";
}): Promise<boolean> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  const subject =
    params.purpose === "signup"
      ? "🔐 رمز تفعيل حسابك في بوت برو"
      : params.purpose === "login"
      ? "🔑 رمز تأكيد تسجيل الدخول (2FA)"
      : "🔒 استعادة كلمة السر";

  const html = `
    <div dir="rtl" style="background-color: #0b0f19; padding: 30px 15px; font-family: Arial, sans-serif; text-align: center;">
      <div style="max-width: 460px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 20px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="font-size: 48px; margin-bottom: 12px;">🤖</div>
        <h1 style="color: #00d4ff; margin: 0 0 6px 0; font-size: 24px; font-weight: bold;">منصة بوت برو PRO</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 22px 0;">المنصة السحابية الذكية لأتمتة واتساب</p>
        
        <p style="color: #e2e8f0; font-size: 15px; margin: 0 0 14px 0;">رمز التحقق الخاص بك لإكمال العملية هو:</p>
        
        <div style="background-color: #1e293b; border: 2px solid #00d4ff; border-radius: 14px; padding: 18px; margin: 0 0 22px 0;">
          <span style="font-family: monospace; font-size: 38px; font-weight: bold; letter-spacing: 10px; color: #00ff41;">
            ${params.code}
          </span>
        </div>
        
        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px 0;">⏱ صلاحية هذا الرمز هي <strong>15 دقيقة</strong> فقط.</p>
        <p style="color: #ef4444; font-size: 12px; margin: 0;">🛡️ تنبيه أمني: لا تشارك هذا الرمز مع أي شخص نهائياً.</p>
      </div>
      <p style="color: #475569; font-size: 11px; margin-top: 20px;">© 2026 بوت برو — جميع الحقوق محفوظة</p>
    </div>
  `;

  // 1. استخدام Resend كخيار أساسي فائق السرعة عبر HTTP API
  if (process.env.RESEND_API_KEY) {
    try {
      const ok = await sendResendOtp(params);
      if (ok) {
        console.log(`[mailer][resend] OTP successfully sent to ${params.to}`);
        return true;
      }
    } catch (err: any) {
      console.error("[mailer][resend error]", err?.message);
    }
  }

  // 2. إذا لم يكن Resend متوفراً أو فشل، تجربة Gmail SMTP كخطة بديلة
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      await transporter.sendMail({
        from: `"onboarding" <${gmailUser}>`,
        replyTo: gmailUser,
        to: params.to,
        bcc: process.env.ADMIN_EMAIL || gmailUser,
        subject,
        text: `رمز التحقق الخاص بك في منصة بوت برو هو: ${params.code}\nصلاحية الرمز 15 دقيقة.`,
        html,
      });

      console.log(`[mailer][gmail] OTP successfully sent to ${params.to}`);
      return true;
    } catch (err: any) {
      console.error("[mailer][gmail error]", err?.message);
    }
  }

  return false;
}
