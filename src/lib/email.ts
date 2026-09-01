const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwawaymail.com",
  "yopmail.com",
  "sharklasers.com",
  "temp-mail.org",
  "trashmail.com",
  "fakeinbox.com",
  "dispostable.com",
  "maildrop.cc",
  "tmpmail.org",
  "example.com",
]);

export function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmailFormat(email: string) {
  const value = normalizeEmail(email);
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isGoogleEmail(email: string) {
  const value = normalizeEmail(email);
  if (!isValidEmailFormat(value)) return false;
  const domain = value.split("@")[1] || "";
  return domain === "gmail.com" || domain === "googlemail.com";
}

export function isDisposableEmail(email: string) {
  const value = normalizeEmail(email);
  if (!isValidEmailFormat(value)) return true;
  const domain = value.split("@")[1] || "";
  return DISPOSABLE_DOMAINS.has(domain);
}

export function validateGoogleSignupEmail(
  email: string
): { ok: true; email: string } | { ok: false; message: string } {
  const value = normalizeEmail(email);
  if (!isValidEmailFormat(value)) {
    return { ok: false, message: "صيغة البريد غير صحيحة" };
  }

  if (isDisposableEmail(value)) {
    return { ok: false, message: "لا يسمح باستخدام بريد مؤقت أو وهمي" };
  }

  if (!isGoogleEmail(value)) {
    return { ok: false, message: "يُسمح فقط باستخدام بريد Google (Gmail)" };
  }

  return { ok: true, email: value };
}
