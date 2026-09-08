// ============================================================================
// Postinstall patch for @whiskeysockets/baileys
// WhatsApp (2026) rejects new-device pairing when the client uses
// UserAgent.Platform.WEB (decodeFrame error -> 428 / "Connection Terminated by
// Server"). Impersonate Platform.MACOS instead (Baileys PR #2365). Also applies
// the classic socket.js guarded-registration fix used by termux/start.sh.
// Idempotent + safe to skip when baileys is absent.
// ============================================================================
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const candidates = [
  join(root, "node_modules", "@whiskeysockets", "baileys"),
  join(root, "termux", "node_modules", "@whiskeysockets", "baileys"),
];

let patched = false;

for (const base of candidates) {
  const validate = join(base, "lib", "Utils", "validate-connection.js");
  if (!existsSync(validate)) continue;
  try {
    let src = readFileSync(validate, "utf8");
    if (src.includes("UserAgent.Platform.WEB")) {
      src = src.replace(/UserAgent\.Platform\.WEB/g, "UserAgent.Platform.MACOS");
      writeFileSync(validate, src, "utf8");
      patched = true;
      console.log(`[patch-baileys] ${validate} -> UserAgent.Platform.MACOS`);
    }
  } catch (err) {
    console.error(`[patch-baileys] validate-connection patch failed for ${base}:`, err.message);
  }

  const socket = join(base, "lib", "Socket", "socket.js");
  if (!existsSync(socket)) continue;
  try {
    let src = readFileSync(socket, "utf8");
    const replaced = src.replace(/if \(!creds\.me\)/g, "if (!creds.me || !creds.registered)");
    if (replaced !== src) {
      writeFileSync(socket, replaced, "utf8");
      patched = true;
      console.log(`[patch-baileys] ${socket} -> guarded registration`);
    }
  } catch (err) {
    console.error(`[patch-baileys] socket patch failed for ${base}:`, err.message);
  }
}

if (!patched) {
  console.log("[patch-baileys] baileys not found or already patched — skipping.");
}