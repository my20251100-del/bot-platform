type SafePayload = Record<string, unknown>;

const SENSITIVE_KEYS = new Set([
  "password",
  "otp",
  "code",
  "token",
  "jwt",
  "secret",
  "apiKey",
  "apikey",
  "authorization",
  "cookie",
  "session",
  "access_token",
  "refresh_token",
  "email",
  "full_name",
  "phone",
]);

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length <= 0) return value;
    if (trimmed.length <= 4) return "[redacted]";
    return trimmed.length > 8 ? `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}` : "[redacted]";
  }

  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "[redacted]" : sanitizeValue(v);
    }
    return out;
  }

  return value;
}

export function logOtpEvent(event: string, payload: SafePayload = {}) {
  const safe = sanitizeValue(payload) as Record<string, unknown>;
  console.info(`[OTP] ${event}`, JSON.stringify(safe));
}

export function logOtpError(event: string, payload: SafePayload = {}) {
  const safe = sanitizeValue(payload) as Record<string, unknown>;
  console.error(`[OTP] ${event}`, JSON.stringify(safe));
}
