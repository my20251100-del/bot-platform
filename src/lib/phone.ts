// =============================================================
// normalizePhoneNumber — الدالة المركزية الوحيدة لتوحيد أرقام الهاتف
// تُستخدم في كل مكان: التسجيل، ربط البوت، الاشتران، المحرك.
// =============================================================

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  const cleaned = String(phone).replace(/\D/g, "").replace(/^0+/, "");
  return cleaned;
}

export function isValidWhatsAppPhone(phone: string): boolean {
  const n = normalizePhoneNumber(phone);
  return n.length >= 10;
}

export function toDisplayPhone(phone: string): string {
  return "+" + normalizePhoneNumber(phone);
}
