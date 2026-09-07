import crypto from "crypto";

// خوارزمية التشفير القياسية المعتمدة عالمياً
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits auth tag

/**
 * استرجاع مفتاح التشفير من متغيرات البيئة في Backend فقط
 * ممنوع تسريب المفتاح إلى Frontend أو الكود المصدري
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY أو SUPABASE_SERVICE_ROLE_KEY غير مُعرّف — لا يمكن بدء التشفير بأمان");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * تشفير البيانات الحساسة باستخدام AES-256-GCM مع التحقق من السلامة (Authenticated Encryption)
 * @param plaintext النص الصريح المراد تشفيره
 * @returns نص مشفر بتنسيق Base64 يحتوي على: iv + ciphertext + authTag
 */
export function encryptData(plaintext: string): string {
  if (!plaintext || typeof plaintext !== "string") {
    throw new Error("Invalid plaintext input: Must be a non-empty string");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let ciphertext = cipher.update(plaintext, "utf8");
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // دمج IV + Ciphertext + AuthTag في حزمة واحدة بتنسيق Base64
  const payload = Buffer.concat([iv, authTag, ciphertext]);
  return payload.toString("base64");
}

/**
 * فك تشفير البيانات الحساسة مع التحقق الصارم من التلاعب والمفتاح
 * @param encryptedPayload النص المشفر بتنسيق Base64
 * @returns النص الأصلي بعد فك التشفير
 */
export function decryptData(encryptedPayload: string): string {
  if (!encryptedPayload || typeof encryptedPayload !== "string") {
    throw new Error("Invalid ciphertext input: Must be a valid Base64 string");
  }

  const key = getEncryptionKey();
  const buffer = Buffer.from(encryptedPayload, "base64");

  if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Malformed payload: Data length is too short to be valid AES-GCM");
  }

  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  try {
    let decrypted = decipher.update(ciphertext, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    throw new Error("Decryption failed: Key mismatch, tampered data, or corrupted auth tag");
  }
}
