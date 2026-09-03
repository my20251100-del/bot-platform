// =============================================================
// normalizePhoneNumber — الدالة المركزية الوحيدة لتوحيد أرقام الهاتف
// تُستخدم في كل مكان: التسجيل، ربط البوت، الاشتران، المحرك.
// =============================================================

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = String(phone).replace(/\D/g, "").replace(/^0+/, "");
  // دعم تلقائي للأرقام اليمنية إذا أُدخلت بدون مفتاح الدولة (مثل 77xxxxxxx أو 71xxxxxxx أو 73xxxxxxx)
  if (cleaned.length === 9 && /^7[0-9]{8}$/.test(cleaned)) {
    cleaned = "967" + cleaned;
  }
  // دعم تلقائي للأرقام السعودية (مثل 5xxxxxxx)
  if (cleaned.length === 9 && /^5[0-9]{8}$/.test(cleaned)) {
    cleaned = "966" + cleaned;
  }
  // دعم تلقائي للأرقام المصرية (مثل 10xxxxxxx أو 11xxxxxxx أو 12xxxxxxx)
  if (cleaned.length === 10 && /^1[0125][0-9]{8}$/.test(cleaned)) {
    cleaned = "20" + cleaned;
  }
  return cleaned;
}

export function isValidWhatsAppPhone(phone: string): boolean {
  const n = normalizePhoneNumber(phone);
  return n.length >= 10;
}

export function toDisplayPhone(phone: string): string {
  return "+" + normalizePhoneNumber(phone);
}
