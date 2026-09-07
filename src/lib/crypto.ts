import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "enc:v1:";
const SALT = "hatemx-bot-at-rest-v1";

function deriveKeyFrom(seed: string): Buffer {
  return createHash("sha256").update(`${SALT}:${seed}`).digest();
}

// المفتاح الافتراضي للكتابة: متغير صريح أو مفتاح الخدمة
function deriveKey(): Buffer {
  const seed = process.env.APP_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return deriveKeyFrom(seed);
}

// قائمة مفاتيح فك التشفير: نجرّبها كلها لأن المحرك ومسارات الـ API قد يعملان بمتغيرات مختلفة
function candidateKeys(): Buffer[] {
  const seeds = [
    process.env.APP_ENCRYPTION_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SERVICE_KEY,
    process.env.SUPABASE_KEY,
    "",
  ];
  const seen = new Set<string>();
  const keys: Buffer[] = [];
  for (const seed of seeds) {
    const key = deriveKeyFrom(String(seed || ""));
    const id = key.toString("hex");
    if (!seen.has(id)) {
      seen.add(id);
      keys.push(key);
    }
  }
  return keys;
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptValue(plain: string): string {
  if (!plain) return "";
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const data = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, data]).toString("base64");
}

export function decryptValue(cipher: string): string {
  if (!isEncrypted(cipher)) return cipher;
  for (const key of candidateKeys()) {
    try {
      const raw = Buffer.from(cipher.slice(PREFIX.length), "base64");
      const iv = raw.subarray(0, 12);
      const tag = raw.subarray(12, 28);
      const data = raw.subarray(28);
      const decipher = createDecipheriv(ALGO, key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    } catch {
      // مفتاح غير مطابق — نجرب التالي
    }
  }
  return "";
}