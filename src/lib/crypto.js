import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY أو SUPABASE_SERVICE_ROLE_KEY غير مُعرّف — لا يمكن بدء التشفير بأمان");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptData(plaintext) {
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

  const payload = Buffer.concat([iv, authTag, ciphertext]);
  return payload.toString("base64");
}

export function decryptData(encryptedPayload) {
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
