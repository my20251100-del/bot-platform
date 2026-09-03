/**
 * Telegram Bot API Integration for OTP & System Notifications
 */

export async function sendTelegramMessage(text: string, chatId?: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !targetChatId) {
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: "HTML",
      }),
    });
    return res.ok;
  } catch (err: any) {
    console.error("[telegram] Failed to send message:", err?.message);
    return false;
  }
}

export async function sendTelegramOtp(params: {
  code: string;
  purpose: "signup" | "login" | "reset";
  phone?: string;
  email?: string;
}): Promise<boolean> {
  const title =
    params.purpose === "signup"
      ? "📝 <b>رمز تفعيل حساب جديد</b>"
      : params.purpose === "login"
      ? "🔐 <b>رمز تأكيد الدخول (2FA)</b>"
      : "🔑 <b>رمز استعادة كلمة السر</b>";

  const message = [
    title,
    "",
    `رمز التحقق الخاص بك هو:`,
    `👉 <code>${params.code}</code> 👈`,
    "",
    params.email ? `📧 البريد: <code>${params.email}</code>` : null,
    params.phone ? `📱 الهاتف: <code>+${params.phone}</code>` : null,
    `⏱ الصلاحية: 15 دقيقة`,
    "",
    `⚠️ <i>لا تشارك هذا الرمز مع أي شخص.</i>`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(message);
}
