
// ============================================================================
// Bot Platform — 24/7 Resilient Production WhatsApp Engine
// Red Queen Architecture Standard | Fully Isolated Sessions | Auto-Recovery
// ============================================================================

import {
  makeWASocket,
  fetchLatestWaWebVersion,
  Browsers,
  DisconnectReason,
  downloadContentFromMessage,
  downloadMediaMessage as baileysDownloadMedia,
  jidNormalizedUser,
  normalizeMessageContent,
  proto,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { promisify } from "util";
import { rmSync, writeFileSync, readFileSync, existsSync } from "fs";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { setDefaultResultOrder, getDefaultResultOrder } from "node:dns";
import { createSupabaseAuthStore, getSupabase, flushAllCreds } from "./auth-store.mjs";

// CRITICAL: This host has NO IPv6 route, but web.whatsapp.com DNS often returns an
// IPv6 (AAAA) address first. Node ≥18 uses "verbatim" ordering by default, so Baileys
// would try IPv6 first, hang, and drop the socket (408 / EAI_AGAIN / "Connection was lost")
// exactly while a companion is mid-pairing -> WhatsApp stays stuck at "جاري تسجيل الدخول".
// Force IPv4-first so the WhatsApp websocket always connects deterministically.
try { setDefaultResultOrder("ipv4first"); } catch (err) { console.warn("[engine] failed to set DNS order to ipv4first:", err.message); }
// Hard fallback: override dns.lookup to always family 4, in case Baileys bypasses the default order.
try { import("node:dns").then(dnsMod => { const _l = dnsMod.lookup.bind(dnsMod); dnsMod.lookup = function(h, o, c) { if (typeof o === "function") { c = o; o = {}; } if (typeof o === "string") o = { family: o === "6" ? 6 : 4 }; if (!o || typeof o !== "object") o = { family: 4 }; if (o.family === undefined) o.family = 4; return _l(h, o, c); }; console.log("[engine] DNS lookup forced to IPv4."); }).catch(() => {}); } catch (err) { console.warn("[engine] DNS lookup override failed:", err.message); }

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// CRITICAL: WhatsApp now rejects new-device pairing (QR & pair-code) when the
// client advertises UserAgent.Platform.WEB (decodeFrame error -> 428 / "Connection
// Terminated by Server"). Registered sessions (resume) are unaffected. Impersonate
// MACOS platform instead, matching current WhatsApp Web behavior (Baileys PR #2365).
// This runtime patch covers any deployment that installs baileys fresh.
// ============================================================================
try {
  if (proto?.ClientPayload?.UserAgent?.Platform) {
    proto.ClientPayload.UserAgent.Platform.WEB = proto.ClientPayload.UserAgent.Platform.MACOS;
    console.log("[engine] Baileys platform patched: new-device pairing will use Platform.MACOS.");
  }
} catch (err) {
  console.warn("[engine] platform patch failed:", err.message);
}

// ============================================================================
// At-rest encryption (AES-256-GCM) for sensitive bot fields (secret, API keys).
// Key is derived from the server-only secret, so no plaintext secrets are stored.
// Falls back gracefully (no-op) if the key material is unavailable — never crashes.
// ============================================================================
const AT_REST_PREFIX = "enc:v1:";

function atRestKeyFrom(seed) {
  return createHash("sha256")
    .update(`hatemx-bot-at-rest-v1:${seed}`)
    .digest();
}

function atRestCandidateKeys() {
  const seeds = [
    process.env.APP_ENCRYPTION_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SERVICE_KEY,
    process.env.SUPABASE_KEY,
    "",
  ];
  const seen = new Set();
  const keys = [];
  for (const seed of seeds) {
    const key = atRestKeyFrom(String(seed || ""));
    if (!seen.has(key.toString("hex"))) {
      seen.add(key.toString("hex"));
      keys.push(key);
    }
  }
  return keys;
}

function atRestEncrypt(plain) {
  if (!plain) return "";
  try {
    const key = atRestCandidateKeys()[0];
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const data = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return AT_REST_PREFIX + Buffer.concat([iv, tag, data]).toString("base64");
  } catch (e) {
    return String(plain);
  }
}

function atRestDecrypt(value) {
  if (typeof value !== "string" || !value.startsWith(AT_REST_PREFIX)) return value;
  for (const key of atRestCandidateKeys()) {
    try {
      const raw = Buffer.from(value.slice(AT_REST_PREFIX.length), "base64");
      const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
      decipher.setAuthTag(raw.subarray(12, 28));
      return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    } catch (e) {
      // مفتاح غير مطابق — نجرب التالي
    }
  }
  return value;
}

let sharp = null;
try {
  const sharpMod = await import("sharp");
  sharp = sharpMod.default || sharpMod;
} catch {
  // sharp is optional; ffmpeg fallback is used when unavailable
}

// ============================================================================
// 1. ENVIRONMENT & SUPABASE INITIALIZATION
// ============================================================================
const supabase = getSupabase();
if (!supabase) {
  console.error("[FATAL] Supabase credentials not found! Check .env or .env.local");
  process.exit(1);
}

const logger = pino({ level: process.env.LOG_LEVEL || "warn" });

// ============================================================================
// 2. BOUNDED LRU CACHE WITH TTL
// ============================================================================
class BoundedCache {
  constructor(maxSize = 1000, ttlMs = 3600000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.map = new Map();
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttlMs) {
      this.map.delete(key);
      return null;
    }
    return entry.val;
  }

  set(key, val) {
    if (this.map.size >= this.maxSize) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
    this.map.set(key, { val, ts: Date.now() });
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

const messageCache = new BoundedCache(5000, 1000 * 60 * 60 * 24); // 24 hours TTL
const seenStatuses = new BoundedCache(2000, 86400000); // 24 hours TTL
const statusNotifyCooldown = new BoundedCache(2000, 60000); // 1 minute per contact notification cooldown
const recentReplies = new BoundedCache(1000, 60000); // 1 minute per chat
const recentTexts = new BoundedCache(3000, 3600000); // نص الرسائل الأخيرة (لمضاد التعديل)
const chatMemory = new BoundedCache(500, 7200000); // 2 hours AI memory
const contactNames = new BoundedCache(5000, 86400000 * 7); // Contact display names cache (7 days TTL)
const lidMap = new Map(); // Global LID cache
const antiDeleteDedup = new BoundedCache(1000, 15000); // 15 seconds deduplication

function recordContactName(jid, name) {
  if (!jid || !name) return;
  const clean = jidNormalizedUser(jid);
  const trimmed = String(name).trim();
  if (!trimmed || trimmed.includes("@") || trimmed === clean || trimmed.replace(/\D/g, "") === clean.replace(/\D/g, "")) {
    return;
  }
  contactNames.set(clean, trimmed);
  const phone = clean.split("@")[0];
  if (phone) contactNames.set(phone, trimmed);
}

function resolveContactName(jid, pushName) {
  if (pushName && typeof pushName === "string") {
    const trimmed = pushName.trim();
    if (trimmed && !trimmed.includes("@") && !trimmed.startsWith("+") && !trimmed.endsWith(".net")) {
      recordContactName(jid, trimmed);
      return trimmed;
    }
  }
  const clean = jid ? jidNormalizedUser(jid) : "";
  if (!clean) return "";
  const phone = clean.split("@")[0];
  return contactNames.get(clean) || contactNames.get(phone) || "";
}


// Load existing LID cache once
try {
  const { data } = await supabase.from("bot_metadata").select("lid_map").eq("id", "global").maybeSingle();
  if (data?.lid_map) {
    for (const [k, v] of Object.entries(data.lid_map)) lidMap.set(k, v);
  }
} catch {}

let lidSaveTimeout = null;
function saveLidMapDebounced() {
  if (lidSaveTimeout) return;
  lidSaveTimeout = setTimeout(async () => {
    lidSaveTimeout = null;
    try {
      const safeMap = {};
      let count = 0;
      for (const [k, v] of lidMap.entries()) {
        if (count++ > 3000) break;
        safeMap[k] = v;
      }
      await supabase.from("bot_metadata").upsert({
        id: "global",
        lid_map: safeMap,
        updated_at: new Date().toISOString(),
      });
    } catch {}
  }, 10000);
}

function learnLidMapping(m) {
  try {
    const rawSender = m.key?.participant || m.participant || m.key?.remoteJid || "";
    const sender = jidNormalizedUser(rawSender);
    const pn = m.key?.participantPhone || m.participantPhone || null;
    if (sender && sender.endsWith("@lid") && pn) {
      const cleanPn = pn.replace(/\D/g, "") + "@s.whatsapp.net";
      if (!lidMap.has(sender)) {
        lidMap.set(sender, cleanPn);
        saveLidMapDebounced();
      }
    }
  } catch {}
}

function resolvePn(jid) {
  if (!jid) return jid;
  const clean = jidNormalizedUser(jid);
  if (clean.endsWith("@s.whatsapp.net")) return clean;
  if (clean.endsWith("@lid") && lidMap.has(clean)) return lidMap.get(clean);
  return clean;
}

// Helper: Logging with payload sanitization (strip secrets/tokens)
async function addLog(botId, event, payload = null) {
  try {
    let safePayload = null;
    if (payload && typeof payload === "object") {
      safePayload = { ...payload };
      delete safePayload.token;
      delete safePayload.secret;
      delete safePayload.key;
      delete safePayload.apikey;
      delete safePayload.creds;
    }
    await supabase.from("bot_logs").insert({
      bot_id: botId,
      event,
      payload: safePayload,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`[log][${botId}] failed to write log:`, err.message);
  }
}

async function updateBot(botId, patch) {
  try {
    const { error } = await supabase.from("bots").update(patch).eq("id", botId);
    if (error) console.warn(`[db][${botId}] update failed:`, error.message);
  } catch (err) {
    console.warn(`[db][${botId}] update error:`, err.message);
  }
}

// ============================================================================
// 3. ERROR CLASSIFICATION & DISCONNECT LOGIC
// ============================================================================
export const DisconnectCategory = {
  TRANSIENT_NETWORK: "TRANSIENT_NETWORK",
  RATE_LIMIT: "RATE_LIMIT",
  SERVER_ERROR: "SERVER_ERROR",
  SESSION_REPLACED: "SESSION_REPLACED",
  LOGGED_OUT: "LOGGED_OUT",
  BAD_AUTH: "BAD_AUTH",
  PAIRING_EXPIRED: "PAIRING_EXPIRED",
  WHATSAPP_VERSION_ERROR: "WHATSAPP_VERSION_ERROR",
  TIMEOUT: "TIMEOUT",
  UNKNOWN: "UNKNOWN",
};

export function classifyDisconnect(error) {
  if (!error) return DisconnectCategory.UNKNOWN;
  const code = error?.output?.statusCode ?? error?.statusCode;
  const tag = String(error?.output?.payload?.tag || error?.message || "").toLowerCase();

  if (code === DisconnectReason.loggedOut || code === 401) {
    return DisconnectCategory.LOGGED_OUT;
  }

  if (/stream errored|stream error/i.test(tag)) {
    return DisconnectCategory.TRANSIENT_NETWORK;
  }

  if (code === DisconnectReason.connectionReplaced || /replaced|conflict/i.test(tag)) {
    return DisconnectCategory.SESSION_REPLACED;
  }

  if (code === DisconnectReason.restartRequired || code === 515) {
    return DisconnectCategory.TRANSIENT_NETWORK;
  }

  if (code === DisconnectReason.timedOut || code === 408 || /timed out|timeout/i.test(tag)) {
    return DisconnectCategory.TIMEOUT;
  }

  if (code === 503 || code === 500 || code === 502) {
    return DisconnectCategory.SERVER_ERROR;
  }

  if (code === 429 || /rate-overlimit|too many requests/i.test(tag)) {
    return DisconnectCategory.RATE_LIMIT;
  }

  if (
    code === DisconnectReason.connectionClosed ||
    code === DisconnectReason.connectionLost ||
    /stream errored|connection closed|reset|network/i.test(tag)
  ) {
    return DisconnectCategory.TRANSIENT_NETWORK;
  }

  return DisconnectCategory.UNKNOWN;
}

// Exponential backoff calculation with jitter (never crashes or gives up on registered bots)
function getBackoffDelay(consecutiveFailures, isRegistered) {
  if (isRegistered) {
    // Registered bots recover fast: 3s, 6s, 12s, max 30s + jitter
    const base = Math.min(3000 * Math.pow(1.5, consecutiveFailures), 30000);
    const jitter = Math.floor(Math.random() * 2000);
    return base + jitter;
  }
  // Pairing / unregistered bots: 5s, 10s, 20s, 30s, 60s, max 120s
  const base = Math.min(5000 * Math.pow(1.8, Math.min(consecutiveFailures, 6)), 120000);
  const jitter = Math.floor(Math.random() * 3000);
  return base + jitter;
}

// ============================================================================
// 4. BOT SESSION CLASS — ISOLATED LIFECYCLE & STATE MACHINE
// ============================================================================
export const SessionState = {
  CREATED: "CREATED",
  CONNECTING: "CONNECTING",
  PAIRING: "PAIRING",
  QR_READY: "QR_READY",
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
  RECONNECTING: "RECONNECTING",
  BACKOFF: "BACKOFF",
  LOGGED_OUT: "LOGGED_OUT",
  FAILED: "FAILED",
  STOPPED: "STOPPED",
};

let globalGenerationCounter = 0;

class BotSession {
  constructor(bot, waVersion) {
    this.botId = bot.id;
    this.bot = bot;
    this.waVersion = waVersion;
    this.state = SessionState.CREATED;
    this.sock = null;
    this.generation = ++globalGenerationCounter;
    this.timers = new Set();
    this.consecutiveFailures = 0;
    this.nextRetryAt = 0;
    this.startedAt = Date.now();
    this.connectedAt = null;
    this.lastError = null;
    this.destroying = false;
    this.flushCreds = null;
  }

  // Safe timer wrappers attached to this session
  setTimeout(fn, delay) {
    if (this.destroying) return null;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (!this.destroying) fn();
    }, delay);
    this.timers.add(timer);
    return timer;
  }

  setInterval(fn, interval) {
    if (this.destroying) return null;
    const timer = setInterval(() => {
      if (this.destroying) {
        clearInterval(timer);
        this.timers.delete(timer);
      } else {
        fn();
      }
    }, interval);
    this.timers.add(timer);
    return timer;
  }

  clearTimers() {
    for (const timer of this.timers) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this.timers.clear();
  }

  async destroy(reason = "session_destroyed") {
    if (this.destroying) return;
    this.destroying = true;
    this.state = SessionState.STOPPED;
    this.clearTimers();
    if (this.onlinePulse) {
      clearInterval(this.onlinePulse);
      this.onlinePulse = null;
    }

    if (this.flushCreds && reason !== "logged_out") {
      try {
        await this.flushCreds();
      } catch {}
    } else if (reason === "logged_out" && this.destroyStore) {
      try {
        this.destroyStore();
      } catch {}
    }

    if (this.sock) {
      try {
        // Remove all listeners to prevent ghost events
        this.sock.ev.removeAllListeners("connection.update");
        this.sock.ev.removeAllListeners("creds.update");
        this.sock.ev.removeAllListeners("messages.upsert");
        this.sock.ev.removeAllListeners("messages.update");
        this.sock.ev.removeAllListeners("call");
        this.sock.ev.removeAllListeners("group-participants.update");
        
        // Cleanly terminate underlying socket
        if (typeof this.sock.end === "function") {
          this.sock.end(new Error(reason));
        }
      } catch {}
      this.sock = null;
    }
  }
}

// Registry of active BotSession instances
const activeSessions = new Map(); // botId -> BotSession
let shutdownRequested = false;

// ============================================================================
// 5. SESSION STARTUP & CONNECTION HANDLERS
// ============================================================================
async function startBotSession(bot, waVersion, opts = {}) {
  if (shutdownRequested) return;

  const existing = activeSessions.get(bot.id);
  if (existing) {
    if (existing.state === SessionState.CONNECTED || existing.state === SessionState.CONNECTING) {
      return; // Already active
    }
    await existing.destroy("restarting");
    activeSessions.delete(bot.id);
  }

  const session = new BotSession(bot, waVersion);
  activeSessions.set(bot.id, session);
  session.state = SessionState.CONNECTING;

  console.log(`[session][${bot.id}] starting session (${bot.name}) generation=${session.generation}`);

  try {
    const { state, saveCreds, flushCreds, destroyStore, clearStore } = await createSupabaseAuthStore(bot.id);
    session.flushCreds = flushCreds;
    session.destroyStore = destroyStore;
    session.clearStore = clearStore;

    // Optional proxy support
    let agent = undefined;
    const proxyUrl = process.env.WA_PROXY || process.env.HTTPS_PROXY;
    if (proxyUrl) {
      try {
        const { HttpsProxyAgent } = await import("https-proxy-agent");
        agent = new HttpsProxyAgent(proxyUrl);
      } catch {}
    }

    const sock = makeWASocket({
      version: waVersion,
      auth: state,
      logger,
      printQRInTerminal: false,
      markOnlineOnConnect: true,
      qrTimeout: 360000,
      browser: Browsers.macOS("Safari"),
      syncFullHistory: false,
      defaultQueryTimeoutMs: 120000,
      connectTimeoutMs: 120000,
      keepAliveIntervalMs: 25000,
      fireInitQueries: true,
      shouldIgnoreJid: () => false,
      agent,
    });

    session.sock = sock;

    // Pairing code or QR determination
    const rawPhone = bot.phone || bot.linked_number || "";
    let digits = rawPhone.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length === 9 && /^7[0-9]{8}$/.test(digits)) {
      digits = "967" + digits;
    } else if (digits.length === 9 && /^5[0-9]{8}$/.test(digits)) {
      digits = "966" + digits;
    } else if (digits.length === 10 && /^1[0125][0-9]{8}$/.test(digits)) {
      digits = "20" + digits;
    }
    const wantsPairingCode = bot.link_method === "pair_code" && digits.length >= 10;
    const isAlreadyRegistered = Boolean(state?.creds?.registered);
    const is515Restart = Boolean(opts?.is515Restart);

    if (wantsPairingCode && !isAlreadyRegistered && !is515Restart && bot.status !== "connected") {
      session.state = SessionState.PAIRING;

      // Guard: refuse invalid/placeholder numbers (all zeros, "123", etc.) so the engine
      // doesn't waste a WhatsApp socket generating codes that can never pair.
      const looksInvalid = /^0+$/.test(digits) || /^123+$/.test(digits) || digits.length < 10;
      if (looksInvalid) {
        console.warn(`[WA][${bot.id}] invalid phone for pairing: +${digits}. Stopping to avoid wasting sockets.`);
        await updateBot(bot.id, {
          command: "stop",
          status: "disconnected",
          pair_code: null,
          qr: null,
          metadata: {
            last_error: "رقم الواتساب غير صالح (placeholder) — يرجى الربط بالرقم الحقيقي",
            error_at: new Date().toISOString(),
          },
        });
      } else {
        // طلب كود الاقتران يحدث في handleConnectionUpdate فور وصول أول QR من
        // بايلز (نفس التدفق الرسمي example.ts). بهذا لا يتعارض تدفق QR مع تدفق
        // pair-code على نفس السوكيت، فلا يقتل الخادم الجلسة (decodeFrame 428).
        session.pairingPhone = digits;
      }
    }

    // Attach Event Handlers
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (u) => {
      await handleConnectionUpdate(session, u, wantsPairingCode);
    });

    sock.ev.on("messages.upsert", async (event) => {
      await handleMessagesUpsert(session, event);
    });

    sock.ev.on("messages.update", async (updates) => {
      await handleMessagesUpdate(session, updates);
    });

    sock.ev.on("call", async (calls) => {
      await handleIncomingCalls(session, calls);
    });

    sock.ev.on("contacts.upsert", (contacts) => {
      for (const c of contacts || []) {
        if (!c?.id) continue;
        const name = c.name || c.notify || c.verifiedName;
        if (name) recordContactName(c.id, name);
      }
    });

    sock.ev.on("contacts.update", (updates) => {
      for (const c of updates || []) {
        if (!c?.id) continue;
        const name = c.name || c.notify || c.verifiedName;
        if (name) recordContactName(c.id, name);
      }
    });

    sock.ev.on("group-participants.update", async (evt) => {
      await handleGroupParticipants(session, evt);
    });

  } catch (err) {
    console.error(`[session][${bot.id}] startup failed:`, err.message);
    session.lastError = err.message;
    await handleSessionFailure(session, err);
  }
}

// ============================================================================
// 6. CONNECTION UPDATE HANDLER
// ============================================================================
async function handleConnectionUpdate(session, u, wantsPairingCode) {
  if (session.destroying) return;
  const botId = session.botId;

  console.log(
    `[WA][${botId}] connection.update: connection=${u.connection}, qr=${!!u.qr}, code=${u.lastDisconnect?.error?.output?.statusCode}`
  );

  // Pairing-code / QR handling
  if (u.qr && wantsPairingCode) {
    // مثل example.ts الرسمي: اطلب كود الاقتران عند وصول أول QR — السوكيت يكون
    // جاهزاً بالكامل لاستقبال تدفق الاقتران، فيثبت الكود دون قتل من الخادم.
    if (!session.pairingRequested) {
      session.pairingRequested = true;
      session.pairingRequestedAt = Date.now();
      const digits =
        session.pairingPhone ||
        String(session.bot?.phone || session.bot?.linked_number || "").replace(/\D/g, "").replace(/^0+/, "");
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (session.destroying || !session.sock) return;
        try {
          console.log(`[WA][${botId}] requesting pairing code for +${digits} (attempt ${attempt})...`);
          const code = await session.sock.requestPairingCode(digits);
          if (!code) throw new Error("empty pairing code");
          session.pairingCode = code;
          await updateBot(botId, { pair_code: code, qr: null, status: "pending" });
          console.log(`[WA][${botId}] ✅ Pairing code generated: ${code}`);
          break;
        } catch (err) {
          console.error(`[WA][${botId}] pairing code request failed (attempt ${attempt}/3):`, err.message);
          if (attempt < 3) await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }
  } else if (u.qr) {
    session.state = SessionState.QR_READY;
    try {
      const dataUrl = await QRCode.toDataURL(u.qr, { width: 320 });
      await updateBot(botId, { qr: dataUrl, pair_code: null, status: "pending" });
    } catch {}
  }

  // Open connection
  if (u.connection === "open") {
    session.state = SessionState.CONNECTED;
    session.consecutiveFailures = 0;
    session.connectedAt = Date.now();
    session.lastError = null;

    const number = session.sock?.user?.id?.split(":")[0]?.split("@")[0];
    const prevMetadata = session.bot?.metadata || {};
    const prevSettings = session.bot?.settings || {};
    await updateBot(botId, {
      status: "connected",
      qr: null,
      pair_code: null,
      linked_number: number ?? session.bot.phone,
      metadata: {
        ...prevMetadata,
        last_error: null,
        error_at: null,
        attempt: 0,
        last_connected_at: new Date().toISOString(),
      },
    });

    await addLog(botId, "connected", { number });
    console.log(`[WA][${botId}] ✅ Connected successfully as +${number}`);

    // وضع الإظهار: متصلاً دائماً (showOnline) أو غير مرئي
    const presenceMode = session.bot?.settings?.showOnline === false ? "unavailable" : "available";
    session.setTimeout(async () => {
      try {
        await sock.sendPresenceUpdate(presenceMode);
      } catch {}
    }, 2500);
    if (presenceMode === "available" && !session.onlinePulse) {
      session.onlinePulse = setInterval(() => {
        try {
          session.sock?.sendPresenceUpdate("available").catch(() => {});
        } catch {}
      }, 60000);
    }

    // Send Welcome Message & Secret to Note to Self (ONLY ONCE per linking)
    const alreadySent = Boolean(
      prevMetadata.welcomeSent ||
      prevSettings.welcomeSent ||
      session.welcomeSent
    );
    if (!alreadySent) {
      session.welcomeSent = true;
      session.setTimeout(async () => {
        try {
          const updatedMeta = { ...(session.bot?.metadata || {}), welcomeSent: true };
          const updatedSettings = { ...(session.bot?.settings || {}), welcomeSent: true };
          await updateBot(botId, {
            metadata: updatedMeta,
            settings: updatedSettings,
          });
          if (session.bot) {
            session.bot.metadata = updatedMeta;
            session.bot.settings = updatedSettings;
          }
          const selfJid = session.sock?.user?.id;
          if (selfJid) {
            const appUrl = (process.env.APP_URL || "https://bot-platform-delta.vercel.app").replace(/\/$/, "");
            const curSettings = session.bot?.settings || {};
            let secret = atRestDecrypt(curSettings.secret);
            if (!secret || String(secret).startsWith(AT_REST_PREFIX)) {
              secret = "KPX-" + Array.from({ length: 4 }, () => "0123456789"[Math.floor(Math.random() * 10)]).join("");
              await updateBot(botId, {
                settings: { ...curSettings, secret, welcomeSent: true },
              });
              session.bot.settings = { ...curSettings, secret, welcomeSent: true };
            }

            const directLink = `${appUrl}/setting?number=${encodeURIComponent(number)}&secret=${encodeURIComponent(secret)}`;
            const msg = 
`🛡️ *منصة hatem X — لوحة تحكم وأتمتة البوت!*

📱 *الرقم المربوط:* +${number}
🔑 *كلمة السر للدخول:*
*${secret}*

🔗 *رابط الإعدادات والتحكم السريع:*
${directLink}

من هذا الرابط يمكنك تعديل جميع خصائص وأتمتة البوت (مضاد الحذف، كشف النظرة الواحدة، الرد التلقائي، رفض المكالمات، حظر الروابط...) في أي وقت بنقرة واحدة بدون تسجيل.

🌐 *لوحة التحكم الشاملة (للمشتركين):*
${appUrl}/dashboard`;

            await session.sock.sendMessage(jidNormalizedUser(selfJid), { text: msg });
            console.log(`[session][${botId}] sent control panel link & secret (${secret}) to Note to Self`);
          }
        } catch (e) {
          console.warn(`[session][${botId}] failed to send welcome msg:`, e.message);
        }
      }, 4000);
    }

  // Session-owned presence keep-alive timer
    session.setInterval(() => {
      if (session.state === SessionState.CONNECTED && session.sock) {
        session.sock.sendPresenceUpdate("available").catch(() => {});
      }
    }, 25000);

    // Subscribe to status broadcasts and presence
    session.setTimeout(async () => {
      try {
        await session.sock?.sendPresenceUpdate("available");
        await session.sock?.presenceSubscribe("status@broadcast").catch(() => {});
        await session.sock?.query({
          tag: "iq",
          attrs: { to: "status@broadcast", type: "get", xmlns: "status" },
          content: [{ tag: "status", attrs: {} }],
        });
        console.log(`[session][${botId}] subscribed to status broadcasts`);
      } catch (err) {
        console.warn(`[session][${botId}] status subscription error:`, err.message);
      }
    }, 2000);

    // Connection established successfully
  }

  // Close connection
  if (u.connection === "close") {
    await handleConnectionClose(session, u.lastDisconnect?.error);
  }
}

async function handleConnectionClose(session, error) {
  const botId = session.botId;
  const category = classifyDisconnect(error);
  const code = error?.output?.statusCode;
  const reasonTag = error?.output?.payload?.tag || error?.message || code;

  console.log(`[WA][${botId}] disconnected: category=${category}, code=${code}, reason="${reasonTag}"`);

  session.state = SessionState.DISCONNECTED;
  session.lastError = `[${category}] ${reasonTag}`;

  const isRegistered = Boolean(
    session.sock?.authState?.creds?.registered || session.bot.linked_number
  );

  // 1. Permanent Logged Out OR 401 Disconnect
  if (category === DisconnectCategory.LOGGED_OUT || code === 401) {
    console.log(
      `[WA][${botId}] ${
        isRegistered ? "Logged out permanently by WhatsApp." : "401 Connection Failure during initial pairing."
      }`
    );
    if (typeof session.clearStore === "function") {
      await session.clearStore();
    } else {
      await supabase.from("bot_auth").delete().eq("bot_id", botId);
      await supabase.from("bot_keys").delete().eq("bot_id", botId);
    }
    await session.destroy(isRegistered ? "logged_out" : "pairing_failed_401");
    activeSessions.delete(botId);

    await updateBot(botId, {
      status: "disconnected",
      command: "stop",
      linked_number: null,
      pair_code: null,
      qr: null,
      metadata: {
        last_error: isRegistered ? "logged_out" : "pairing_failed_401",
        error_at: new Date().toISOString(),
      },
    });
    await addLog(botId, isRegistered ? "logged_out" : "pairing_failed_401", { code, reason: reasonTag });
    return;
  }

  // 2. Unregistered Pairing Expired (only when TTL > 360s has passed without pairing)
  const pairingAge = Date.now() - (session.pairingRequestedAt || 0);
  if (!isRegistered && session.pairingCode && pairingAge > 360000) {
    console.log(`[WA][${botId}] ⏳ Pairing code TTL exceeded (>360s). Resetting auth for fresh pairing...`);
    await session.destroy("pairing_expired");
    activeSessions.delete(botId);

    if (typeof session.clearStore === "function") {
      try { await session.clearStore(); } catch {}
    } else {
      try { await supabase.from("bot_auth").delete().eq("bot_id", botId); } catch {}
      try { await supabase.from("bot_keys").delete().eq("bot_id", botId); } catch {}
    }

    await updateBot(botId, {
      status: "pending",
      pair_code: null,
      qr: null,
      metadata: { last_error: "انتهت صلاحية كود الاقتران (6 دقائق)، جارٍ التجديد...", error_at: new Date().toISOString() },
    });
    await addLog(botId, "pairing_expired", { code, pairingAge });
    return;
  }

  // 3. WhatsApp Handshake Restart Required (code 515 / DisconnectReason.restartRequired)
  // Occurs immediately when companion pairing succeeds and keys are negotiated.
  if (code === DisconnectReason.restartRequired || code === 515) {
    console.log(`[WA][${botId}] 🔄 WhatsApp stream restart required (code 515). Reconnecting immediately with session keys...`);
    if (typeof session.flushCreds === "function") {
      try { await session.flushCreds(); } catch {}
    }
    session.consecutiveFailures = 0;
    await session.destroy("restart_required");
    activeSessions.delete(botId);

    setTimeout(() => {
      if (!shutdownRequested && !activeSessions.has(botId)) {
        startBotSession(session.bot, session.waVersion, { is515Restart: true });
      }
    }, 1000);
    return;
  }

  // 4. Transient / Network Drops / 408 / 428
  session.consecutiveFailures++;
  const backoffMs = getBackoffDelay(session.consecutiveFailures, isRegistered);
  session.nextRetryAt = Date.now() + backoffMs;
  session.state = SessionState.BACKOFF;

  console.log(`[WA][${botId}] scheduling automatic reconnection in ${Math.round(backoffMs / 1000)}s (attempt ${session.consecutiveFailures})...`);

  await updateBot(botId, {
    status: session.bot.command === "start" ? "pending" : "disconnected",
    metadata: {
      last_error: `code ${code}: ${reasonTag}`,
      error_at: new Date().toISOString(),
      attempt: session.consecutiveFailures,
    },
  });

  // Teardown the closed socket instance
  await session.destroy("reconnecting");
  // CRITICAL FIX: Do NOT delete from activeSessions here. 
  // If we delete it, reconcileBots will instantly reconnect and bypass the backoff delay, causing rapid crash loops (and eventual 401 ban).

  // Auto-reconnect timer
  setTimeout(() => {
    // Only restart if the user hasn't explicitly stopped it (in which case it would have been deleted by reconcileBots)
    // and if the current session in the map is still THIS session.
    if (!shutdownRequested && activeSessions.get(botId) === session) {
      startBotSession(session.bot, session.waVersion);
    }
  }, backoffMs);
}

async function handleSessionFailure(session, err) {
  session.consecutiveFailures++;
  const backoffMs = getBackoffDelay(session.consecutiveFailures, Boolean(session.bot.linked_number));
  session.state = SessionState.BACKOFF;
  await session.destroy("startup_failed");
  // CRITICAL FIX: Do NOT delete from activeSessions.

  setTimeout(() => {
    if (!shutdownRequested && activeSessions.get(session.botId) === session) {
      startBotSession(session.bot, session.waVersion);
    }
  }, backoffMs);
}

// ============================================================================
// 7. INCOMING MESSAGES, STATUSES, ANTI-DELETE, AI
// ============================================================================

// Helper to download media content from a message (for Anti-Delete & Anti-ViewOnce)
async function downloadMediaHelper(m) {
  if (!m) return null;
  const raw = m.message || m;
  const normalized = normalizeMessageContent(raw);
  if (!normalized) return null;

  let type = "";
  let mimeType = "";
  let fileName = undefined;

  if (normalized.imageMessage) {
    type = "image";
    mimeType = normalized.imageMessage.mimetype || "image/jpeg";
  } else if (normalized.videoMessage) {
    type = "video";
    mimeType = normalized.videoMessage.mimetype || "video/mp4";
  } else if (normalized.audioMessage) {
    type = "audio";
    mimeType = normalized.audioMessage.mimetype || "audio/ogg; codecs=opus";
  } else if (normalized.stickerMessage) {
    type = "sticker";
    mimeType = "image/webp";
  } else if (normalized.documentMessage) {
    type = "document";
    mimeType = normalized.documentMessage.mimetype || "application/octet-stream";
    fileName = normalized.documentMessage.fileName || "document";
  }

  if (!type) return null;

  // 1. Try Baileys official downloadMediaMessage with 'buffer'
  try {
    const fullMsg = m.message ? m : { message: m };
    const buffer = await baileysDownloadMedia(fullMsg, "buffer");
    if (buffer && buffer.length > 0) {
      return { buffer, type, mimeType, fileName };
    }
  } catch (err) {}

  // 2. Fallback to downloadContentFromMessage stream
  try {
    const mediaObj = normalized[`${type}Message`];
    if (mediaObj) {
      const stream = await downloadContentFromMessage(mediaObj, type);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      if (buffer && buffer.length > 0) {
        return { buffer, type, mimeType, fileName };
      }
    }
  } catch (err2) {}

  return null;
}

// Helper to send recovered media or fallback to text message with quoted reply
async function sendRecoveredMessage(sock, destJid, orig, header, quotedMsg = null) {
  if (!sock || !destJid) return;

  // Resolve LID if needed
  let targetJid = destJid;
  if (targetJid.endsWith("@lid")) {
    const pn = await sock.signalRepository?.lidMapping?.getPNForLID(targetJid).catch(() => null);
    if (pn) targetJid = pn;
    else if (lidMap.has(targetJid)) targetJid = lidMap.get(targetJid);
  }

  let buffer = orig.mediaBuffer;
  let type = orig.mediaType;
  let mimeType = orig.mimeType;
  let fileName = orig.fileName;

  if (!buffer && orig.m) {
    try {
      const dl = await downloadMediaHelper(orig.m);
      if (dl) {
        buffer = dl.buffer;
        type = dl.type;
        mimeType = dl.mimeType;
        fileName = dl.fileName;
      }
    } catch {}
  }

  const quoteOption = quotedMsg ? { quoted: quotedMsg } : {};

  if (buffer && type) {
    try {
      if (type === "image") {
        return await sock.sendMessage(targetJid, { image: buffer, caption: header }, quoteOption);
      } else if (type === "video") {
        return await sock.sendMessage(targetJid, { video: buffer, caption: header }, quoteOption);
      } else if (type === "audio") {
        await sock.sendMessage(targetJid, { text: header }, quoteOption).catch(() => {});
        return await sock.sendMessage(targetJid, { audio: buffer, mimetype: mimeType || "audio/mp4", ptt: true });
      } else if (type === "sticker") {
        await sock.sendMessage(targetJid, { text: header }, quoteOption).catch(() => {});
        return await sock.sendMessage(targetJid, { sticker: buffer });
      } else if (type === "document") {
        return await sock.sendMessage(targetJid, { document: buffer, mimetype: mimeType || "application/octet-stream", fileName: fileName || "document", caption: header }, quoteOption);
      }
    } catch (err) {
      console.warn(`[send-recovered-media] failed sending media with quote to ${targetJid}:`, err.message);
      // Fallback: send without quote
      try {
        if (type === "image") {
          return await sock.sendMessage(targetJid, { image: buffer, caption: header });
        } else if (type === "video") {
          return await sock.sendMessage(targetJid, { video: buffer, caption: header });
        } else if (type === "audio") {
          await sock.sendMessage(targetJid, { text: header }).catch(() => {});
          return await sock.sendMessage(targetJid, { audio: buffer, mimetype: mimeType || "audio/mp4", ptt: true });
        } else if (type === "sticker") {
          await sock.sendMessage(targetJid, { text: header }).catch(() => {});
          return await sock.sendMessage(targetJid, { sticker: buffer });
        } else if (type === "document") {
          return await sock.sendMessage(targetJid, { document: buffer, mimetype: mimeType || "application/octet-stream", fileName: fileName || "document", caption: header });
        }
      } catch (err2) {
        console.warn(`[send-recovered-media] fallback without quote also failed to ${targetJid}:`, err2.message);
      }
    }
  }

  try {
    return await sock.sendMessage(targetJid, { text: header }, quoteOption);
  } catch (err) {
    return await sock.sendMessage(targetJid, { text: header }).catch(() => {});
  }
}

// هل يحق للمرسل تنفيذ أوامر الإدارة؟ (مالك البوت أو مشرف رسمي في المجموعة أو أدمن المنصة)
function senderCanAdmin(bot, metadata, sender) {
  const ownerDigits = String(bot?.linked_number || bot?.phone || "").replace(/\D/g, "");
  const senderDigits = String(sender || "").split("@")[0].replace(/\D/g, "");
  if (ownerDigits && senderDigits && senderDigits === ownerDigits) return true;
  if (["967772847565", "967712343137"].includes(senderDigits)) return true;
  if (Array.isArray(metadata?.participants)) {
    const senderJid = jidNormalizedUser(sender);
    return metadata.participants.some(
      (p) => jidNormalizedUser(p.id) === senderJid && (p.admin === "admin" || p.admin === "superadmin")
    );
  }
  return false;
}

async function handleMessagesUpsert(session, { messages, type }) {
  const bot = session.bot;
  const sock = session.sock;
  if (!sock) return;

  const cfg = bot.settings || {};

  for (const m of messages) {
    try {
      learnLidMapping(m);

      if (m.pushName) {
        const rawActor = m.key?.participant || m.key?.remoteJid;
        if (rawActor) recordContactName(rawActor, m.pushName);
      }

      const isStatus = m.key.remoteJid === "status@broadcast";
      if (!m.message && !isStatus) continue;

      let rawMsg = m.message || {};
      if (rawMsg?.ephemeralMessage?.message) rawMsg = rawMsg.ephemeralMessage.message;
      if (rawMsg?.documentWithCaptionMessage?.message) rawMsg = rawMsg.documentWithCaptionMessage.message;

      // Protocol Message check (REVOKE / Delete for everyone in upsert event)
      const pmsg = rawMsg?.protocolMessage || m.message?.protocolMessage;
      if (
        pmsg &&
        (pmsg.type === 0 ||
          pmsg.type === 1 ||
          pmsg.type === "REVOKE" ||
          pmsg.type === 14 ||
          pmsg.type === 132 ||
          pmsg.type === "ADMIN_REVOKE") &&
        pmsg.key?.id
      ) {
        if (cfg.antiDelete !== false) {
          await triggerAntiDelete(session, pmsg.key.id, m.key.remoteJid, m.key.participant || m.key.remoteJid);
        }
        continue;
      }

      // 1. Cache incoming message for Anti-Delete (with background media pre-download)
      if (!isStatus && m.key?.id) {
        const cacheEntry = {
          m,
          chat: m.key.remoteJid,
          sender: m.key.participant || m.key.remoteJid,
          name: m.pushName || "",
          ts: Date.now(),
        };
        const scopedKey = `${bot.id}:${m.key.id}`;
        messageCache.set(scopedKey, cacheEntry);

        // Global fallback: only set if empty or if this is an incoming message
        if (!messageCache.has(m.key.id) || !m.key.fromMe) {
          messageCache.set(m.key.id, cacheEntry);
        }

        const norm = normalizeMessageContent(rawMsg);
        if (norm?.imageMessage || norm?.videoMessage || norm?.audioMessage || norm?.stickerMessage || norm?.documentMessage) {
          downloadMediaHelper(m).then((dl) => {
            if (dl) {
              const entry = messageCache.get(scopedKey) || messageCache.get(m.key.id);
              if (entry) {
                entry.mediaBuffer = dl.buffer;
                entry.mediaType = dl.type;
                entry.mimeType = dl.mimeType;
                entry.fileName = dl.fileName;
                console.log(`[cache][${bot.id}] 📥 cached media (${dl.type}, ${dl.buffer.length}b) for msg ${m.key.id}`);
              }
            }
          }).catch(() => {});
        }
      }

      // 2. Anti-ViewOnce (Save View-Once photos/videos permanently)
      const isViewOnce = Boolean(
        rawMsg?.viewOnceMessage ||
        rawMsg?.viewOnceMessageV2 ||
        rawMsg?.viewOnceMessageV2Extension ||
        rawMsg?.imageMessage?.viewOnce ||
        rawMsg?.videoMessage?.viewOnce ||
        rawMsg?.audioMessage?.viewOnce
      );
      if (isViewOnce && cfg.antiViewOnce !== false && !m.key.fromMe) {
        const normalized = normalizeMessageContent(rawMsg);
        const selfJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
        if (selfJid && normalized) {
          const senderClean = jidNormalizedUser(m.key.participant || m.key.remoteJid || "");
          const senderPhone = senderClean.split("@")[0];
          const senderName = m.pushName ? `${m.pushName} (${senderPhone})` : senderPhone;
          const chatType = m.key.remoteJid?.includes("@g.us") ? "مجموعة" : "خاص";
          const header = `👁️ *تم كشف وحفظ وسائط لمرة واحدة (View Once)!*\n👤 *المرسل:* ${senderName}\n💬 *المحادثة:* ${chatType}`;
          try {
            const dl = await downloadMediaHelper(m);
            if (dl?.buffer) {
              if (dl.type === "image") {
                await sock.sendMessage(selfJid, { image: dl.buffer, caption: header });
              } else if (dl.type === "video") {
                await sock.sendMessage(selfJid, { video: dl.buffer, caption: header });
              } else if (dl.type === "audio") {
                await sock.sendMessage(selfJid, { text: header });
                await sock.sendMessage(selfJid, { audio: dl.buffer, mimetype: dl.mimeType || "audio/mp4", ptt: true });
              }
            } else {
              await sock.sendMessage(selfJid, { text: header });
              await sock.sendMessage(selfJid, { forward: { key: m.key, message: normalized } });
            }
            console.log(`[anti-viewonce][${bot.id}] ✅ saved view-once from ${senderName}`);
            await addLog(bot.id, "viewonce_saved", { from: senderClean, id: m.key.id });
          } catch (e) {
            console.warn(`[anti-viewonce][${bot.id}] failed to save view-once:`, e.message);
          }
        }
      }

      // 3. Status Automation (Auto-View & Auto-React)
      if (isStatus) {
        await handleStatusBroadcast(session, m, cfg);
        continue;
      }

      // 4. Message Processing (Commands, AI Smart Reply, Auto-Reply)
      const rawText =
        rawMsg?.conversation ||
        rawMsg?.extendedTextMessage?.text ||
        rawMsg?.imageMessage?.caption ||
        rawMsg?.videoMessage?.caption ||
        "";

      // 4.1. Dictionary / Anti-Bad Words (مفعل افتراضياً بمعجم مدمج + كلمات المستخدم)
      const DEFAULT_BAD_WORDS = [
        "يامطيز","مطيز","انيك عارك","يا عارك","عاركك","يا فتال","نيك","ينيك","زنخه",
        "يبن القحبه","قحبه","القحبة","امك نيك","فكيو","فاكيو","زبي","بتاع","كسمك",
        "المنيوك","انيوك","خرا","خره","زباله","قذر","وسخ","مقرف","كلب","حمار","غبي",
        "سافل","قحبة","عرص","تيز","زبله","اهبل","مغفل","بليد"
      ];
      const dictOn = cfg.dictionaryOn !== false;
      const customWords = Array.isArray(cfg.bannedWords)
        ? cfg.bannedWords
        : String(cfg.bannedWords || "").split(/[\n,،]/).map((w) => w.trim()).filter(Boolean);
      const dictWords = dictOn ? Array.from(new Set([...customWords, ...DEFAULT_BAD_WORDS])) : [];
      if (dictOn && dictWords.length) {
        const lowerText = rawText.toLowerCase();
        const hasBadWord = dictWords.some((w) => w.trim() && lowerText.includes(w.trim().toLowerCase()));
        if (hasBadWord && m.key.remoteJid?.includes("@g.us") && !m.key.fromMe) {
          try {
            await sock.sendMessage(m.key.remoteJid, { delete: m.key });
            console.log(`[security][${bot.id}] deleted message containing bad word from ${m.key.participant}`);
            await addLog(bot.id, "badword_deleted", { chat: m.key.remoteJid, sender: m.key.participant });
          } catch (e) {
            console.warn(`[security][${bot.id}] failed to delete bad word message (needs admin?):`, e.message);
            try {
              await sock.sendMessage(m.key.remoteJid, {
                text: `⚠️ لاحظت رسالة فيها لفظ غير لائق وتم تجاهلها.\nاقصار اللفاظ يتطلب أن أكون *مشرفاً (Admin)* في المجموعة — ارقني حتى أتمكن من الحذف التلقائي.`,
              }, { quoted: m });
            } catch {}
          }
          continue; // Skip further processing
        }
      }

      const isCmd = /^[.!\/]/.test(rawText.trim());

      // If from me, ONLY allow if it is a command like .مجموعاتي or .مشرف
      if (m.key.fromMe && !isCmd) continue;

      await handleChatMessage(session, m, cfg);

    } catch (err) {
      console.warn(`[msg-handler][${bot.id}] error processing message:`, err.message);
    }
  }
}

// Unified Anti-Delete Trigger
async function triggerAntiDelete(session, deletedMsgId, chatJid, senderJid) {
  const bot = session.bot;
  const sock = session.sock;
  if (!sock) return;

  const dedupKey = `${bot.id}:${deletedMsgId}`;
  if (antiDeleteDedup.has(dedupKey)) {
    return;
  }

  const scopedKey = `${bot.id}:${deletedMsgId}`;
  let orig = messageCache.get(scopedKey);
  if (!orig) orig = messageCache.get(deletedMsgId);

  if (!orig) {
    console.log(`[antidelete][${bot.id}] message ${deletedMsgId} not found in cache`);
    return;
  }

  // Prevent duplicate execution between protocolMessage and messages.update
  antiDeleteDedup.set(dedupKey, true);
  messageCache.delete(scopedKey);

  const isSelf = Boolean(orig.m?.key?.fromMe);
  const selfJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
  const ownerNumber = (bot.linked_number || bot.phone || "").replace(/\D/g, "");
  const ownerJid = ownerNumber ? `${ownerNumber}@s.whatsapp.net` : selfJid;

  // Resolve JIDs (handling @lid conversion via Baileys and lidMap)
  let resolvedSender = orig.sender || senderJid || "";
  let resolvedChat = orig.chat || chatJid || "";

  if (resolvedSender.endsWith("@lid")) {
    const pn = await sock.signalRepository?.lidMapping?.getPNForLID(resolvedSender).catch(() => null);
    if (pn) resolvedSender = pn;
    else if (lidMap.has(resolvedSender)) resolvedSender = lidMap.get(resolvedSender);
  }

  if (resolvedChat.endsWith("@lid")) {
    const pn = await sock.signalRepository?.lidMapping?.getPNForLID(resolvedChat).catch(() => null);
    if (pn) resolvedChat = pn;
    else if (lidMap.has(resolvedChat)) resolvedChat = lidMap.get(resolvedChat);
  }

  const senderClean = jidNormalizedUser(resolvedSender);
  const senderPhone = senderClean.split("@")[0].replace(/\D/g, "");
  let senderName = orig.name ? `${orig.name} (${senderPhone})` : (senderPhone ? `+${senderPhone}` : "مجهول");
  if (isSelf) {
    senderName = `أنت (صاحب البوت) [+${senderPhone || ownerNumber}]`;
  }
  const isGroup = resolvedChat.includes("@g.us");
  const chatType = isGroup ? "مجموعة 👥" : (isSelf ? "رسالة أرسلتها وحذفتها 📤" : "محادثة خاصة 👤");

  const msg = normalizeMessageContent(orig.m?.message);
  const deletedText =
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.imageMessage?.caption ||
    msg?.videoMessage?.caption ||
    msg?.documentMessage?.caption ||
    "";

  const hasMedia = Boolean(
    msg?.imageMessage ||
    msg?.videoMessage ||
    msg?.audioMessage ||
    msg?.stickerMessage ||
    msg?.documentMessage ||
    orig.mediaBuffer
  );

  let mediaTypeLabel = "نص كتابي 📝";
  if (msg?.imageMessage || orig.mediaType === "image") mediaTypeLabel = "صورة 🖼️";
  else if (msg?.videoMessage || orig.mediaType === "video") mediaTypeLabel = "فيديو 🎥";
  else if (msg?.audioMessage || orig.mediaType === "audio") mediaTypeLabel = "تسجيل صوتي 🎵";
  else if (msg?.stickerMessage || orig.mediaType === "sticker") mediaTypeLabel = "ملصق 🎭";
  else if (msg?.documentMessage || orig.mediaType === "document") mediaTypeLabel = "مستند 📄";

  let header = `🗑️ *تم كشف واسترجاع رسالة محذوفة!*\n\n` +
    `👤 *المرسل:* ${senderName}\n` +
    `💬 *المحادثة:* ${chatType}\n` +
    `📎 *النوع:* ${mediaTypeLabel}\n`;

  if (deletedText) {
    header += `📝 *نص الرسالة:*\n« ${deletedText} »\n`;
  }

  const timeStr = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  header += `⏰ *الوقت:* ${timeStr}`;

  // 1. Send in the chat where it was deleted (if in-chat anti-delete is enabled)
  if (resolvedChat && bot.settings?.antiDeleteInChat !== false) {
    try {
      await sendRecoveredMessage(sock, resolvedChat, orig, header, orig.m);
      console.log(`[antidelete][${bot.id}] 📢 Sent recovered message in-chat (${resolvedChat})`);
    } catch (e) {
      console.warn(`[antidelete][${bot.id}] in-chat send failed:`, e.message);
    }
  }

  // 2. Also send to Owner ("Note to Self") archive if resolvedChat is not already the owner
  if (ownerJid && ownerJid !== resolvedChat) {
    try {
      await sendRecoveredMessage(sock, ownerJid, orig, header);
      console.log(`[antidelete][${bot.id}] 📢 Sent recovered message to owner archive (${ownerJid})`);
    } catch (e) {
      console.warn(`[antidelete][${bot.id}] send to owner archive failed:`, e.message);
    }
  }

  console.log(`[antidelete][${bot.id}] ✅ recovered deleted message ${deletedMsgId} from ${senderName}`);
  await addLog(bot.id, "message_recovered", {
    sender: resolvedSender,
    name: orig.name || senderName,
    chat: resolvedChat,
    id: deletedMsgId,
    text: deletedText,
    hasMedia,
    mediaType: mediaTypeLabel,
  });
}

// Anti-Delete Recovery Handler (messages.update)
async function handleMessagesUpdate(session, updates) {
  const bot = session.bot;
  const sock = session.sock;
  if (!sock) return;

  for (const u of updates) {
    try {
      const stub = u.update?.messageStubType;
      const isRevoked =
        u.update?.message === null ||
        stub === 1 ||
        stub === 2 ||
        stub === 68 ||
        stub === 0;

      if (isRevoked && u.key?.id && bot.settings?.antiDelete !== false) {
        await triggerAntiDelete(session, u.key.id, u.key.remoteJid, u.key.participant || u.key.remoteJid);
      } else if (u.update?.message && u.key?.id && bot.settings?.antiEdit !== false) {
        const prevTxt = recentTexts.get(`${bot.id}:${u.key.id}`);
        const nextMsg = u.update.message;
        const newTxt = nextMsg.conversation || nextMsg.extendedTextMessage?.text || "";
        if (prevTxt && newTxt && newTxt !== prevTxt && u.key.remoteJid?.endsWith("@g.us")) {
          await sock.sendMessage(u.key.remoteJid, {
            text: `✏️ *تم تعديل الرسالة:*\n« ${prevTxt} »\n➡️ إلى:\n« ${newTxt} »`,
          });
          await addLog(bot.id, "edit_detected", {
            group: u.key.remoteJid,
            from: u.key.participant,
            before: prevTxt,
            after: newTxt,
          });
          console.log(`[antiedit][${bot.id}] ✅ detected edit in group ${u.key.remoteJid}`);
        }
      }
    } catch (err) {
      console.warn(`[antidelete][${bot.id}] update error:`, err.message);
    }
  }
}

// Status Broadcast Handler (Auto-View + Reaction + "شاهدت حالة فلان" Notification)
async function handleStatusBroadcast(session, m, cfg) {
  const sock = session.sock;
  const bot = session.bot;
  if (!sock || !m.key) return;

  const selfJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
  const selfPhone = (selfJid ? selfJid.split("@")[0] : "").replace(/\D/g, "");

  let actor = m.key.participant || m.participant || "";
  if (!actor && m.key.fromMe && selfJid) {
    actor = selfJid;
  }
  if (!actor) {
    console.warn(`[status][${bot.id}] skipped status without actor`);
    return;
  }

  const cleanAuthor = resolvePn(jidNormalizedUser(actor));
  const authorPhone = (cleanAuthor.split("@")[0] || "").replace(/\D/g, "");

  // Detect if status was posted by the bot owner (e.g. testing from the linked phone)
  const isOwnStatus = Boolean(m.key.fromMe || cleanAuthor === selfJid || (authorPhone && authorPhone === selfPhone));

  // Extract raw message payload with comprehensive Baileys unwrapping
  const normalized = normalizeMessageContent(m.message) || {};
  let rawMsg = normalized;

  // STRICT GUARD 1: Ignore reactionMessage, protocolMessage, and key distributions on status@broadcast.
  if (
    rawMsg.reactionMessage ||
    rawMsg.protocolMessage ||
    rawMsg.senderKeyDistributionMessage ||
    (rawMsg.messageContextInfo && Object.keys(rawMsg).length === 1)
  ) {
    return;
  }

  // Extract content and status type
  const textContent =
    rawMsg.conversation ||
    rawMsg.extendedTextMessage?.text ||
    rawMsg.imageMessage?.caption ||
    rawMsg.videoMessage?.caption ||
    rawMsg.documentMessage?.caption ||
    "";

  let statusType = "حالة وسائط 📱";
  if (rawMsg.imageMessage) statusType = "صورة 🖼️";
  else if (rawMsg.videoMessage) statusType = "فيديو 🎥";
  else if (rawMsg.audioMessage) statusType = "تسجيل صوتي 🎵";
  else if (rawMsg.documentMessage) statusType = "مستند 📄";
  else if (rawMsg.stickerMessage) statusType = "ملصق 🎭";
  else if (textContent && textContent.trim()) statusType = "نص كتابي 📝";

  // Deduplicate status by bot + author + message ID (24h cache)
  const sig = `${bot.id}:${cleanAuthor}:${m.key.id}`;
  if (seenStatuses.has(sig)) return;
  seenStatuses.set(sig, true);

  const shouldView = cfg.autoViewStatus !== false && (cfg.STATUS_VIEW ?? cfg.statusView) !== false;
  const shouldReact = cfg.autoReactStatus !== false && cfg.interactStatus !== false && (cfg.STATUS_REACT ?? cfg.statusReact) !== false;
  const statusEmoji = cfg.STATUS_REACT_EMOJI || cfg.reactEmoji || cfg.statusReactEmoji || "❤️";
  const shouldNotify = !isOwnStatus && cfg.notifyStatusView !== false && cfg.statusViewNotify !== false;

  // Resolve author display name (from contacts cache or pushName)
  const authorName = resolveContactName(cleanAuthor, m.pushName);

  const readKey = {
    remoteJid: "status@broadcast",
    id: m.key.id,
    participant: actor,
    fromMe: Boolean(m.key.fromMe),
  };

  // 1. Mark as viewed (Read Receipt)
  if (shouldView) {
    try {
      await sock.readMessages([readKey]);
      console.log(`[status][${bot.id}] ✅ viewed status from ${authorName ? `${authorName} (+${authorPhone})` : `+${authorPhone}`} (${statusType})`);
      await addLog(bot.id, "status_viewed", {
        author: cleanAuthor,
        phone: authorPhone,
        name: authorName,
        type: statusType,
        isOwn: isOwnStatus,
      });
    } catch (e) {
      console.warn(`[status][${bot.id}] readMessages failed:`, e.message);
    }
  }

  // 2. React with Status Like Emoji (NATIVE status@broadcast ONLY - NEVER to private chat!)
  if (shouldReact && !isOwnStatus) {
    session.setTimeout(async () => {
      try {
        const currentSock = session.sock;
        if (!currentSock) return;

        const reactionKey = {
          remoteJid: "status@broadcast",
          id: m.key.id,
          participant: actor,
          fromMe: false,
        };

        const reactionMessage = {
          react: {
            text: statusEmoji,
            key: reactionKey,
          },
        };

        // Native status reaction to status@broadcast with cleanAuthor in statusJidList
        await currentSock.sendMessage("status@broadcast", reactionMessage, {
          statusJidList: [cleanAuthor],
        });
        console.log(`[status][${bot.id}] ✅ status reaction (${statusEmoji}) sent for +${authorPhone}`);
        await addLog(bot.id, "status_reacted", {
          author: cleanAuthor,
          phone: authorPhone,
          emoji: statusEmoji,
        });
      } catch (err) {
        console.warn(`[status][${bot.id}] status react error:`, err.message);
      }
    }, 1500); // 1.5s human-like delay
  }

  // 3. If owner posted status to test the bot, confirm immediately via Note-to-Self
  if (isOwnStatus && selfJid) {
    session.setTimeout(async () => {
      try {
        const currentSock = session.sock;
        if (!currentSock) return;
        const timeStr = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
        const testMsg = `👁️ *تم رصد وتأكيد مشاهدة حالتك بنجاح!* ✅\n\n` +
          `📌 *نوع الحالة:* ${statusType}\n` +
          `⏰ *الوقت:* ${timeStr}\n` +
          `🤖 *محرك البوت متصل ويعمل بأعلى كفاءة!* 🚀`;
        await currentSock.sendMessage(selfJid, { text: testMsg });
        console.log(`[status][${bot.id}] 📢 Sent status test confirmation to owner note-to-self`);
      } catch (err) {
        console.warn(`[status][${bot.id}] test status notice error:`, err.message);
      }
    }, 1200);
  }

  // 4. Send "شاهدت حالة فلان" notification to "مراسلة نفسك" (Note to Self)
  // With 20s cooldown per contact to prevent spamming note-to-self when contact posts multiple slides at once
  if (shouldNotify && selfJid) {
    const notifyCooldownKey = `${bot.id}:${cleanAuthor}`;
    if (!statusNotifyCooldown.has(notifyCooldownKey)) {
      statusNotifyCooldown.set(notifyCooldownKey, true);

      session.setTimeout(async () => {
        try {
          const currentSock = session.sock;
          if (!currentSock) return;

          const whoName = authorName ? `*${authorName}* (+${authorPhone})` : `+${authorPhone}`;
          let notifyMsg = `👁️ *شاهدت حالة فلان!*\n\n` +
            `👤 *حق من الحالة (صاحبها):* ${whoName}\n` +
            `📌 *نوع الحالة:* ${statusType}\n`;

          if (textContent && textContent.trim()) {
            notifyMsg += `📝 *نص الحالة:*\n« ${textContent.trim()} »\n`;
          }

          if (shouldReact) {
            notifyMsg += `❤️ *التفاعل:* تم التفاعل بنجاح (${statusEmoji})\n`;
          }

          const timeStr = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
          notifyMsg += `⏰ *الوقت:* ${timeStr}`;

          await currentSock.sendMessage(selfJid, { text: notifyMsg });

          // Forward media if saveStatus is enabled
          if (cfg.saveStatus && (rawMsg.imageMessage || rawMsg.videoMessage || rawMsg.audioMessage)) {
            try {
              await currentSock.sendMessage(selfJid, { forward: { key: m.key, message: rawMsg } });
            } catch {}
          }

          console.log(`[status][${bot.id}] 📢 Sent "شاهدت حالة فلان" alert to note-to-self for ${whoName}`);
        } catch (err) {
          console.warn(`[status][${bot.id}] failed to notify note-to-self:`, err.message);
        }
      }, 1000);
    }
  }

  // 4. Record to bot_logs
  try {
    await addLog(bot.id, "status_handled", {
      from: cleanAuthor,
      name: authorName || "",
      phone: authorPhone,
      status_type: statusType,
      status_text: textContent ? textContent.slice(0, 150) : "",
      viewed: shouldView,
      reacted: shouldReact ? statusEmoji : null,
      notified: shouldNotify,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn(`[status][${bot.id}] log error:`, err.message);
  }
}

// Chat Message Handler (Anti-Loop, Cooldown, AI, Auto-Reply)
async function handleChatMessage(session, m, cfg) {
  const sock = session.sock;
  const bot = session.bot;
  if (!sock) return;

  const chat = m.key.remoteJid;
  if (!chat || chat.endsWith("@newsletter") || chat.endsWith("@broadcast") || chat === "status@broadcast") {
    return; // Ignore channels, newsletters, and broadcast statuses
  }

  const sender = jidNormalizedUser(m.key.participant || chat || "");
  const isGroup = chat.endsWith("@g.us");

  const rawMsg = m.message || {};
  const norm = normalizeMessageContent(rawMsg);

  const text =
    norm?.conversation ||
    norm?.extendedTextMessage?.text ||
    norm?.imageMessage?.caption ||
    norm?.videoMessage?.caption ||
    norm?.documentMessage?.caption ||
    "";

  if (m.key?.id && text && !m.key.fromMe) recentTexts.set(`${bot.id}:${m.key.id}`, text);

  const hasMedia = Boolean(
    norm?.imageMessage ||
    norm?.videoMessage ||
    norm?.audioMessage ||
    norm?.stickerMessage ||
    norm?.documentMessage
  );

  if (!text && !hasMedia) return;

  const isCommand = Boolean(text && /^[.!\/]/.test(text.trim()));

  // Anti-loop protection: Only ignore normal messages sent to self, but ALLOW commands (.مجموعاتي, .مشرف, etc.)
  const selfJid = session.sock?.user?.id || "";
  const selfNumber = (selfJid.split(":")[0] || bot.phone || bot.linked_number || "").replace(/\D/g, "");
  const senderDigits = sender.split("@")[0].replace(/\D/g, "");
  if (selfNumber && senderDigits === selfNumber && !isCommand) {
    return; // Self regular chat message ignored to prevent loops
  }

  // Chat reply rate limiter (max 3 replies per 15s per chat)
  const chatLimitKey = `${bot.id}:${chat}`;
  const now = Date.now();
  const history = (recentReplies.get(chatLimitKey) || []).filter((t) => now - t < 15000);
  if (history.length >= 3) return;

  const canReplyChat = isCommand || !isGroup || cfg.workMode === "public" || cfg.workMode === "group" || cfg.replyInGroups === true;
  if (!canReplyChat) return;

  // Anti-Link Firewall (Groups Only)
  if (isGroup && cfg.antiLink !== false && !m.key.fromMe && text) {
    const hasLink = /(chat\.whatsapp\.com|wa\.me|https?:\/\/)/i.test(text);
    const bannedDomain =
      Array.isArray(cfg.firewallDomains) && cfg.firewallDomains.length > 0
        ? cfg.firewallDomains.some((d) => d && text.toLowerCase().includes(String(d).toLowerCase()))
        : false;
    if (hasLink || bannedDomain) {
      try {
        const groupMetadata = await sock.groupMetadata(chat);
        const botIdStr = jidNormalizedUser(sock.user.id);
        const botParticipant = groupMetadata.participants.find((p) => jidNormalizedUser(p.id) === botIdStr);
        const botIsAdmin = botParticipant?.admin === "admin" || botParticipant?.admin === "superadmin";

        const senderParticipant = groupMetadata.participants.find((p) => jidNormalizedUser(p.id) === sender);
        const senderIsAdmin = senderParticipant?.admin === "admin" || senderParticipant?.admin === "superadmin";

        if (botIsAdmin && !senderIsAdmin) {
          await sock.sendMessage(chat, { delete: m.key });
          await sock.sendMessage(chat, { text: `⚠️ عذراً، يُمنع إرسال الروابط في هذه المجموعة! تم حذف رسالتك.` });
          await addLog(bot.id, "link_deleted", { group: groupMetadata.subject, user: sender });
          return; // Stop processing further
        }
      } catch (e) {
        console.warn(`[firewall][${bot.id}] failed to handle anti-link:`, e.message);
      }
    }
  }

  // ⛔ CRITICAL: STRICTLY FORBID AI & AUTO-REPLIES IN ALL GROUPS!
  // In groups, the bot ONLY executes explicit commands (.مشرف, .مجموعاتي, etc.)
  if (isGroup && !isCommand) {
    return;
  }

  const mediaLabel = norm?.imageMessage ? "[صورة 🖼️]" : norm?.audioMessage ? "[تسجيل صوتي 🎵]" : norm?.stickerMessage ? "[ملصق 🎭]" : norm?.videoMessage ? "[فيديو 🎥]" : "";
  console.log(`[chat-msg][${bot.id}] from ${sender} (${isGroup ? "group" : "private"}): "${(text || mediaLabel).slice(0, 45)}"`);

  // 0. Group Admin & Bot Commands (.مشرف, .مجموعاتي, .admin, .promote, etc.)
  const trimmedText = text.trim();
  const prefixChars = String(cfg.prefix ?? ".!/");
  const usedPrefix = Array.from(prefixChars).find((p) => trimmedText.startsWith(p));
  if (usedPrefix) {
    const args = trimmedText.slice(usedPrefix.length).trim().split(/\s+/);
    const cmd = args[0].toLowerCase();
    const subArg = args[1];

    // أمر عرض المجموعات: .مجموعاتي أو .المجموعات أو .groups
    if (["المجموعات", "مجموعاتي", "groups", "قروباتي"].includes(cmd)) {
      try {
        await sock.sendPresenceUpdate("composing", chat);
        const allGroups = await sock.groupFetchAllParticipating();
        const groupsList = Object.values(allGroups);
        session.groupCache = groupsList;

        if (groupsList.length === 0) {
          await sock.sendMessage(chat, { text: "ℹ️ البوت غير متواجد في أي مجموعة حالياً." }, { quoted: m });
          return;
        }

        const botIdStr = jidNormalizedUser(sock.user.id);
        let listMsg = `📋 *المجموعات التي يتواجد بها البوت (${groupsList.length}):*\n\n`;
        groupsList.forEach((g, idx) => {
          const amAdmin = g.participants.some(
            (p) => jidNormalizedUser(p.id) === botIdStr && (p.admin === "admin" || p.admin === "superadmin")
          );
          const statusIcon = amAdmin ? "مشرف ✅" : "عضو عادي ⚠️";
          listMsg += `${idx + 1}. *${g.subject}*\n   👥 الأعضاء: ${g.participants.length} | البوت: ${statusIcon}\n\n`;
        });

        listMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
        listMsg += `👑 *للترقية الفورية إلى مشرف:*\n`;
        listMsg += `أرسل: *.مشرف [رقم المجموعة]* (مثال: *.مشرف 1*)\n`;
        listMsg += `أو ادخل المجموعة واكتب مباشرة: *.مشرف*`;

        await sock.sendMessage(chat, { text: listMsg }, { quoted: m });
        await addLog(bot.id, "groups_listed", { count: groupsList.length, to: sender });
        return;
      } catch (err) {
        console.warn(`[groups][${bot.id}] error listing groups:`, err.message);
        await sock.sendMessage(chat, { text: "❌ تعذر جلب قائمة المجموعات حالياً." }, { quoted: m });
        return;
      }
    }

    // أمر الترقية إلى مشرف: .مشرف أو .admin أو .ترقية أو .ادمن أو .promote
    if (["مشرف", "ادمن", "admin", "ترقية", "promote"].includes(cmd)) {
      try {
        await sock.sendPresenceUpdate("composing", chat);

        // الحالة أ: الترقية عبر رقم المجموعة من القائمة (مثال: .مشرف 1)
        if (subArg && !isNaN(parseInt(subArg, 10))) {
          const groupIdx = parseInt(subArg, 10) - 1;
          if (!session.groupCache || session.groupCache.length === 0) {
            const allGroups = await sock.groupFetchAllParticipating();
            session.groupCache = Object.values(allGroups);
          }
          const targetGroup = session.groupCache?.[groupIdx];
          if (!targetGroup) {
            await sock.sendMessage(chat, { text: "⚠️ رقم المجموعة غير صحيح. اكتب *.مجموعاتي* لمعرفة أرقام المجموعات." }, { quoted: m });
            return;
          }

          const botIdStr = jidNormalizedUser(sock.user.id);
          const groupMeta = await sock.groupMetadata(targetGroup.id);
          const botParticipant = groupMeta.participants.find(
            (p) => jidNormalizedUser(p.id) === botIdStr
          );
          const botIsAdmin = botParticipant?.admin === "admin" || botParticipant?.admin === "superadmin";

if (!botIsAdmin) {
            await sock.sendMessage(chat, {
              text: `⚠️ يا غالي البوت ليس مشرفاً في مجموعة *${targetGroup.subject}*!\nارفع البوت مشرفاً أولاً في المجموعة ليتمكن من ترقيتك.`
            }, { quoted: m });
            return;
          }

          if (!senderCanAdmin(bot, groupMeta, sender)) {
            await sock.sendMessage(chat, {
              text: "⚠️ هذا الأمر مقتصر على مالك البوت أو مشرفي المجموعة فقط."
            }, { quoted: m });
            return;
          }

          const senderTarget = jidNormalizedUser(sender);
          await sock.groupParticipantsUpdate(targetGroup.id, [senderTarget], "promote");
          await sock.sendMessage(chat, {
            text: `👑 أبشر! تمت ترقيتك إلى مشرف في مجموعة *${targetGroup.subject}* بنجاح. ⚡`
          }, { quoted: m });
          await addLog(bot.id, "promoted_by_index", { group: targetGroup.subject, user: senderTarget });
          return;
        }

        // الحالة ب: الأمر كُتب مباشرة داخل المجموعة
        if (isGroup) {
          const groupMetadata = await sock.groupMetadata(chat);
          const botIdStr = jidNormalizedUser(sock.user.id);
          const botParticipant = groupMetadata.participants.find(
            (p) => jidNormalizedUser(p.id) === botIdStr
          );
          const botIsAdmin = botParticipant?.admin === "admin" || botParticipant?.admin === "superadmin";

          if (!botIsAdmin) {
            await sock.sendMessage(chat, {
              text: "⚠️ يا غالي، البوت ليس مشرفاً (Admin) في هذه المجموعة حالياً!\nيرجى رفع البوت مشرفاً أولاً في المجموعة حتى يتمكن من ترقيتك."
            }, { quoted: m });
            return;
          }

          if (!senderCanAdmin(bot, groupMetadata, sender)) {
            await sock.sendMessage(chat, {
              text: "⚠️ هذا الأمر مقتصر على مالك البوت أو مشرفي المجموعة فقط."
            }, { quoted: m });
            return;
          }

          // تحديد الشخص المستهدف (إما المذكور أو صاحب الرسالة المقتبسة أو مرسل الأمر)
          const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const quoted = m.message?.extendedTextMessage?.contextInfo?.participant;
          let targets = [...mentioned];
          if (quoted && !targets.includes(quoted)) targets.push(quoted);
          if (targets.length === 0) targets.push(sender);

          const toPromote = targets.map((t) => jidNormalizedUser(t)).filter((tJid) => {
            const p = groupMetadata.participants.find((x) => jidNormalizedUser(x.id) === tJid);
            return p && !p.admin;
          });

          if (toPromote.length === 0) {
            await sock.sendMessage(chat, { text: "👑 أنت (أو العضو المحدد) بالفعل مشرف في هذه المجموعة!" }, { quoted: m });
            return;
          }

          await sock.groupParticipantsUpdate(chat, toPromote, "promote");
          await sock.sendMessage(chat, {
            text: `👑 أبشر! تمت الترقية إلى مشرف في *${groupMetadata.subject}* بنجاح. ⚡`
          }, { quoted: m });
          await addLog(bot.id, "promoted_in_group", { group: groupMetadata.subject, targets: toPromote });
          return;
        } else {
          // كُتب في الخاص بدون رقم مجموعة
          await sock.sendMessage(chat, {
            text: "ℹ️ لاختيار أي مجموعة وترقية نفسك فيها:\n1. أرسل: *.مجموعاتي*\n2. ثم اختر رقم المجموعة: *.مشرف [رقم المجموعة]* (مثال: *.مشرف 1*)\nأو ادخل المجموعة نفسها واكتب: *.مشرف*"
          }, { quoted: m });
          return;
        }
      } catch (err) {
        console.warn(`[admin-cmd][${bot.id}] error in promote:`, err.message);
        await sock.sendMessage(chat, { text: `❌ حدث خطأ أثناء الترقية: ${err.message}` }, { quoted: m });
        return;
      }
    }

    // أوامر إدارة المجموعة الإضافية (داخل المجموعة فقط)
    if (isGroup && ["طرد", "kick", "تنزيل", "demote", "قفل", "mute", "فتح", "unmute", "الجميع", "everyone"].includes(cmd)) {
      try {
        const groupMetadata = await sock.groupMetadata(chat);
        const botIdStr = jidNormalizedUser(sock.user.id);
        const botParticipant = groupMetadata.participants.find(p => jidNormalizedUser(p.id) === botIdStr);
        const botIsAdmin = botParticipant?.admin === "admin" || botParticipant?.admin === "superadmin";

        if (!botIsAdmin) {
          await sock.sendMessage(chat, { text: "⚠️ يجب أن يكون البوت مشرفاً لتنفيذ أوامر الإدارة." }, { quoted: m });
          return;
        }

        if (!senderCanAdmin(bot, groupMetadata, sender)) {
          await sock.sendMessage(chat, { text: "⚠️ هذه الأوامر مخصصة لمالك البوت أو مشرفي المجموعة فقط." }, { quoted: m });
          return;
        }

        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quoted = m.message?.extendedTextMessage?.contextInfo?.participant;
        let targets = [...mentioned];
        if (quoted && !targets.includes(quoted)) targets.push(quoted);

        if (["طرد", "kick"].includes(cmd) && targets.length > 0) {
          await sock.groupParticipantsUpdate(chat, targets, "remove");
          await sock.sendMessage(chat, { text: "✅ تم طرد العضو بنجاح." }, { quoted: m });
          return;
        }
        if (["تنزيل", "demote"].includes(cmd) && targets.length > 0) {
          await sock.groupParticipantsUpdate(chat, targets, "demote");
          await sock.sendMessage(chat, { text: "✅ تم سحب الإشراف من العضو." }, { quoted: m });
          return;
        }
        if (["قفل", "mute"].includes(cmd)) {
          await sock.groupSettingUpdate(chat, "announcement");
          await sock.sendMessage(chat, { text: "🔒 تم إغلاق المجموعة (المشرفين فقط يمكنهم إرسال رسائل)." }, { quoted: m });
          return;
        }
        if (["فتح", "unmute"].includes(cmd)) {
          await sock.groupSettingUpdate(chat, "not_announcement");
          await sock.sendMessage(chat, { text: "🔓 تم فتح المجموعة لجميع الأعضاء." }, { quoted: m });
          return;
        }
        if (["الجميع", "everyone"].includes(cmd)) {
          const allJids = groupMetadata.participants.map((p) => p.id);
          const msgBody = args.slice(1).join(" ") || "إشارة للجميع!";
          await sock.sendMessage(chat, {
            text: `🔊 *${msgBody}*\n\n` + allJids.map((j) => `@${j.split("@")[0]}`).join(" "),
            mentions: allJids,
          });
          return;
        }
      } catch (err) {
        console.warn(`[admin-cmd][${bot.id}] error:`, err.message);
      }
    }
  }

  // 1. Keyword-based Custom Auto Replies (matches triggers like "السلام عليكم", "الأسعار", etc.)
  const customReplies = cfg.autoReplies || cfg.customReplies || [];
  if (Array.isArray(customReplies) && customReplies.length > 0) {
    const cleanText = text.trim().toLowerCase();
    for (const rule of customReplies) {
      if (!rule || (rule.active === false)) continue;
      const kw = (rule.keyword || "").trim().toLowerCase();
      if (!kw) continue;
      const isMatch = rule.exact ? cleanText === kw : cleanText.includes(kw);
      if (isMatch && rule.message) {
        history.push(now);
        recentReplies.set(chatLimitKey, history);
        try { await sock.sendPresenceUpdate("composing", chat); } catch {}
        await session.sock.sendMessage(chat, { text: rule.message }, { quoted: m });
        console.log(`[keyword-reply][${bot.id}] ✅ matched "${kw}" for ${sender}`);
        await addLog(bot.id, "keyword_replied", { keyword: kw, to: sender });
        return;
      }
    }
  }

  // 2. AI Smart Reply (Multimodal: Text, Images, Audio/Voice Notes, Stickers)
  let replied = false;
  if (cfg.smartReply !== false) {
    try {
      try { await sock.sendPresenceUpdate("composing", chat); } catch {}

      // Pre-download media buffer if message has media
      let mediaData = null;
      if (hasMedia && !isCommand) {
        try {
          const dl = await downloadMediaHelper(m);
          if (dl && dl.buffer && dl.buffer.length > 0) {
            mediaData = dl;
          }
        } catch (e) {
          console.warn(`[smart-reply][${bot.id}] media download error:`, e.message);
        }
      }

      const reply = await generateAIResponse(text, m.pushName || "", cfg, mediaData);
      if (reply && session.sock) {
        history.push(now);
        recentReplies.set(chatLimitKey, history);
        await session.sock.sendMessage(chat, { text: reply }, { quoted: m });
        console.log(`[smart-reply][${bot.id}] ✅ AI replied to ${sender}: "${reply.slice(0, 30)}..."`);
        await addLog(bot.id, "smart_replied", { to: sender, reply });
        replied = true;
        return;
      }
    } catch (err) {
      console.warn(`[smart-reply][${bot.id}] error:`, err.message);
    }
  }

  // 3. Rule-based Auto Reply (runs ONLY if smartReply is completely off and custom autoReplyMessage is set)
  if (!replied && cfg.autoReply && cfg.smartReply === false) {
    const replyText = cfg.autoReplyMessage;
    if (replyText) {
      try {
        if (session.sock) {
          history.push(now);
          recentReplies.set(chatLimitKey, history);
          try { await sock.sendPresenceUpdate("composing", chat); } catch {}
          await session.sock.sendMessage(chat, { text: replyText }, { quoted: m });
          console.log(`[auto-reply][${bot.id}] ✅ auto replied to ${sender}`);
          await addLog(bot.id, "auto_replied", { to: sender });
          return;
        }
      } catch (err) {
        console.warn(`[auto-reply][${bot.id}] error:`, err.message);
      }
    }
  }
}

// AI Response Generator (Gemini Multimodal with multi-key rotation and active 2026 models)
async function generateAIResponse(userText, senderName, cfg, mediaData = null) {
  const candidateKeys = [];

  // 1. cfg.geminiApiKeys (from settings page: mapped from GEMINI_API_KYES -> geminiApiKeys in DB)
  if (typeof cfg.geminiApiKeys === "string") {
    candidateKeys.push(...cfg.geminiApiKeys.split(/[\n,،]/));
  } else if (Array.isArray(cfg.geminiApiKeys)) {
    candidateKeys.push(...cfg.geminiApiKeys);
  }

  // 2. cfg.GEMINI_API_KYES (UI or encrypted)
  if (typeof cfg.GEMINI_API_KYES === "string" && cfg.GEMINI_API_KYES.trim()) {
    const dec = atRestDecrypt(cfg.GEMINI_API_KYES.trim());
    candidateKeys.push(...String(dec || "").split(/[\n,،]/));
  }

  // 3. cfg.geminiKeys or cfg.geminiKey
  if (Array.isArray(cfg.geminiKeys)) {
    candidateKeys.push(...cfg.geminiKeys);
  }
  if (typeof cfg.geminiKey === "string") {
    candidateKeys.push(cfg.geminiKey);
  }

  // 4. process.env.GEMINI_API_KEY
  if (process.env.GEMINI_API_KEY) {
    candidateKeys.push(process.env.GEMINI_API_KEY);
  }

  // Clean, trim, and filter valid Google Gemini API keys
  const geminiKeys = Array.from(new Set(
    candidateKeys
      .map((k) => String(k || "").trim())
      .filter((k) => k.length > 20 && (k.startsWith("AIzaSy") || k.startsWith("AQ.")))
  ));

  if (geminiKeys.length === 0) {
    return null; // Not a valid Gemini key, skip immediately
  }

  const messageText = String(userText || "").trim();
  const messageWordCount = messageText.split(/\s+/).filter(Boolean).length;
  const isAskingDetail = /تفصيل|اشرح|وضح|ماهي خطوات|كيف يعمل|طريقة/i.test(messageText);

  let lengthInstruction = "";
  let targetMaxTokens = 60;

  if (mediaData && !messageText) {
    if (mediaData.type === "sticker") {
      targetMaxTokens = 20;
      lengthInstruction = "توجيه: المستخدم أرسل ملصق. رد عليه فقط بإيموجي أو ضحكة عفوية قصيرة جداً (كلمة أو كلمتين مثل 😂😂 أو هههههه منور يا غالي). ممنوع وصف الملصق نهائياً.";
    } else if (mediaData.type === "audio") {
      targetMaxTokens = 80;
      lengthInstruction = "توجيه: المستخدم أرسل تسجيل صوتي. استمع إليه ورد عليه مباشرة في الصميم بسطر واحد بلهجة عفوية كشخص يراسل بالجوال.";
    } else {
      targetMaxTokens = 50;
      lengthInstruction = "توجيه: المستخدم أرسل صورة. تفاعل معها بتعليق سريع ومختصر بسطر واحد كأي شخص يشوف صورة في واتساب بدون فلسفة.";
    }
  } else if (messageWordCount <= 2) {
    targetMaxTokens = 20;
    lengthInstruction = "توجيه: الرسالة قصيرة جداً (كلمة أو كلمتين). طابقها ورد بكلمتين أو ثلاث كلمات فقط كأي شخص يكتب بالجوال (مثل: 'هلا والله يا غالي'، 'أهلين حياك'). ممنوع التطويل نهائياً.";
  } else if (messageWordCount <= 6) {
    targetMaxTokens = 40;
    lengthInstruction = "توجيه: رسالة قصيرة. رد بسطر واحد مختصر وعفوي ومباشر بدون مقدمات وبدون تكلف كشخص يكتب من جواله.";
  } else if (!isAskingDetail) {
    targetMaxTokens = 75;
    lengthInstruction = "توجيه: رد باختصار بسطر أو سطرين فقط كدردشة واتساب طبيعية وعفوية، بدون نقاط ولا تعداد.";
  } else {
    targetMaxTokens = 150;
    lengthInstruction = "توجيه: أجب بشكل واضح ومفيد ومختصر بدون إسهاب ولا تعداد نقطي.";
  }

  const smartPersonaPrompt =
    "أنت صاحب هذا الواتساب شخصياً (الأخ حاتم / صاحب متجر أثر للعطور والبخور والمخلطات).\n" +
    "أنت الآن تكتب بالجوال وترد على الواتساب بنفسك كإنسان طبيعي 100%، ولا يبين أبداً أنك ذكاء اصطناعي أو بوت أو خدمة عملاء رسمية.\n\n" +
    "قواعد الدردشة في واتساب:\n" +
    "1. طابق حجم ردك مع رسالة الشخص تماماً:\n" +
    "   - رسالة قصيرة جداً أو تحية (مثل: هلا، H، سلام) = رد بكلمة أو كلمتين إلى 4 كلمات فقط (مثل: \"هلا والله يا غالي\"، \"أهلين حياك\").\n" +
    "   - ملصق (Sticker) = رد فقط بضحكة أو إيموجي مثل (\"😂😂\" أو \"هههههه حياك\") بدون وصف للملصق إطلاقاً.\n" +
    "   - سؤال عن العطور/المتجر = رد كصاحب متجر مرحب بأسلوب بسيط وسريع ومختصر بسطر واحد (مثل: \"يا مرحبا، موجود عندنا تشكيلة عطور وبخور فاخرة وثباتها عالي، وش اللي ببالك؟\").\n" +
    "   - سوالف عادية أو صاحبك يسلم = رد عليه كأخ وصاحب بعفوية ولهجة يمنية لطيفة (مثل: \"يا هلا والله بالغالي، بخير الحمدلله بشرني عنك\").\n" +
    "2. ممنوعات صارمة:\n" +
    "   - ممنوع مناداة الشخص باسم حسابه أو وضعه بين أقواس تنصيص (مثل \"يا مكنون\").\n" +
    "   - ممنوع إطلاقاً وصف الملصقات أو تحليل الصور بشكل روبوتي.\n" +
    "   - ممنوع التعداد النقطي (1. 2. 3.) أو وضع نجمات وعلامات تنسيق مقالية أو إطالة الكلام.\n" +
    "   - إذا سألك أحد \"أنت أثر أو مكنون؟\" أو \"من أنت؟\": قل ببساطة وبلهجة عادية: \"أنا صاحب متجر أثر يا غالي، حياك الله، وش في خاطرك؟\".";

  const customPrompt = String(cfg.systemPrompt || cfg.geminiSystemPrompt || cfg.SYSTEM_PROMPT || "").trim();
  const activePrompt = (!customPrompt || customPrompt.includes("هكر") || customPrompt.includes("اختراق") || customPrompt.includes("مكنون") || customPrompt.length < 50)
    ? smartPersonaPrompt
    : customPrompt;

  const systemPrompt = `${activePrompt}\n\n${lengthInstruction}`;

  // Build multimodal parts (media + text prompt)
  const userParts = [];

  if (mediaData && mediaData.buffer && mediaData.buffer.length > 0) {
    let cleanMime = (mediaData.mimeType || "").split(";")[0].trim().toLowerCase();
    if (mediaData.type === "sticker" || cleanMime.includes("webp")) cleanMime = "image/webp";
    else if (mediaData.type === "image" && (!cleanMime || cleanMime === "image")) cleanMime = "image/jpeg";
    else if (mediaData.type === "audio") {
      if (!cleanMime || cleanMime === "audio") cleanMime = "audio/ogg";
    } else if (mediaData.type === "video") {
      if (!cleanMime || cleanMime === "video") cleanMime = "video/mp4";
    }

    userParts.push({
      inlineData: {
        mimeType: cleanMime,
        data: mediaData.buffer.toString("base64"),
      },
    });

    if (!messageText) {
      if (mediaData.type === "image") {
        userParts.push({ text: "هذه صورة أرسلها المستخدم. تفاعل معها وافهم محتواها وعلق عليها أو أجب عليها بذكاء واختصار وعفوية كشخص في واتساب." });
      } else if (mediaData.type === "audio") {
        userParts.push({ text: "هذا تسجيل صوتي (بصمة صوت) أرسله المستخدم. استمع إليه بعناية وافهم ما قاله بالضبط، ثم رد عليه بذكاء وطبيعية وبلهجة مناسبة في الصميم." });
      } else if (mediaData.type === "sticker") {
        userParts.push({ text: "هذا ملصق (Sticker) أرسله المستخدم. تفاعل معه بخفة دم وعفوية وبشكل ذكي ومختصر كشخص في واتساب." });
      } else if (mediaData.type === "video") {
        userParts.push({ text: "هذا مقطع فيديو أرسله المستخدم. تفاعل معه وعلق عليه باختصار وذكاء." });
      } else if (mediaData.type === "document") {
        userParts.push({ text: "هذا مستند أرسله المستخدم. تفاعل مع محتواه باختصار." });
      }
    } else {
      userParts.push({ text: String(userText).slice(0, 2500) });
    }
  } else {
    userParts.push({ text: String(userText || "").slice(0, 2500) });
  }

  // Candidate models in priority order (2026 active models):
  // 1. gemini-3.5-flash-lite: Super fast, highest availability, high daily quota
  // 2. gemini-3.5-flash: High intelligence & multimodal capability
  // 3. gemini-3.6-flash: Next-gen intelligence
  // 4. gemini-flash-latest: General fallback
  // 5. gemini-3.1-flash-lite: High speed fallback
  const candidateModels = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ];

  for (const model of candidateModels) {
    for (const key of geminiKeys) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: userParts }],
            generationConfig: { maxOutputTokens: targetMaxTokens },
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          console.warn(`[gemini] key ${key.slice(0, 12)}... model ${model} returned status ${res.status}`);
          continue; // try next key or next model
        }
        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (reply) return reply;
      } catch (err) {
        console.warn(`[gemini] key ${key.slice(0, 12)}... model ${model} error:`, err.message);
      }
    }
  }
  return null;
}

// Call Rejection Handler
async function handleIncomingCalls(session, calls) {
  const sock = session.sock;
  const bot = session.bot;
  if (!sock || bot.settings?.rejectCalls === false) return;

  for (const c of calls) {
    if (c.status === "offer") {
      try {
        await sock.rejectCall(c.id, c.from);
        await sock.sendMessage(c.from, {
          text: "📵 عذراً، لا يمكن استقبال المكالمات الصوتية أو المرئية على هذا الرقم الآلي. يرجى المراسلة نصياً.",
        });
        await addLog(bot.id, "call_rejected", { from: c.from });
      } catch {}
    }
  }
}

// Group Participant Welcome / Farewell Handler
async function handleGroupParticipants(session, evt) {
  const sock = session.sock;
  const bot = session.bot;
  if (!sock) return;

  const isAdd = evt.action === "add";
  const isRemove = evt.action === "remove";
  const cfg = bot.settings || {};

  if (isAdd && cfg.welcomeEnabled && cfg.welcomeMessage) {
    for (const p of evt.participants) {
      try {
        const msg = cfg.welcomeMessage.replace(/@user/g, `@${p.split("@")[0]}`);
        await sock.sendMessage(evt.id, { text: msg, mentions: [p] });
      } catch {}
    }
  }
}

// ============================================================================
// 8. RECONCILIATION LOOP & QUEUE WORKERS (NON-OVERLAPPING)
// ============================================================================
let reconcileRunning = false;

async function reconcileBots(waVersion) {
  if (reconcileRunning || shutdownRequested) return;
  reconcileRunning = true;

  try {
    // 1. Fetch bots from Supabase
    const { data: bots, error } = await supabase
      .from("bots")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("[reconcile] db fetch error:", error.message);
      return;
    }

    const activePhoneSet = new Set();

    for (const bot of bots || []) {
      const activeSession = activeSessions.get(bot.id);

      // Handle STOP command
      if (bot.command === "stop") {
        if (activeSession) {
          await activeSession.destroy("command_stop");
          activeSessions.delete(bot.id);
          await updateBot(bot.id, { status: "disconnected", pair_code: null, qr: null });
        }
        continue;
      }

      // Handle UNLINK command
      if (bot.command === "unlink") {
        if (activeSession) {
          await activeSession.destroy("command_unlink");
          activeSessions.delete(bot.id);
        }
        await supabase.from("bot_auth").delete().eq("bot_id", bot.id);
        await supabase.from("bot_keys").delete().eq("bot_id", bot.id);
        await updateBot(bot.id, { command: "stop", status: "disconnected", linked_number: null, pair_code: null, qr: null });
        continue;
      }

      // Handle START command
      if (bot.command === "start") {
        // Prevent duplicate bots targeting the same phone number
        const digits = (bot.phone || bot.linked_number || "").replace(/\D/g, "");
        if (digits) {
          if (activePhoneSet.has(digits)) {
            console.warn(`[reconcile] duplicate bot for phone +${digits} (${bot.id}) skipped.`);
            continue;
          }
          activePhoneSet.add(digits);
        }

        // Check if session needs to start or restart
        if (!activeSession) {
          await startBotSession(bot, waVersion);
        } else if (bot.metadata?.request_restart && Number(bot.metadata.request_restart) > (activeSession.startedAt || 0)) {
          console.log(`[reconcile] 🔄 Restart requested for bot ${bot.id} (${bot.name}), recycling session...`);
          await activeSession.destroy("requested_restart");
          activeSessions.delete(bot.id);
          await startBotSession(bot, waVersion);
        } else {
          // Update bot data reference inside active session
          activeSession.bot = bot;
        }
      }
    }

    // 2. Process Outbound Queues
    await processQueues();

  } catch (err) {
    console.error("[reconcile] unexpected loop error:", err.message);
  } finally {
    reconcileRunning = false;
  }
}

// Atomic Queue Worker: Claims records before dispatching
async function processQueues() {
  if (shutdownRequested) return;

  // A. Process notify_queue (OTPs & System Notifications)
  try {
    const { data: otps } = await supabase
      .from("notify_queue")
      .select("*")
      .eq("status", "pending")
      .limit(10);

    for (const q of otps || []) {
      // Find connected session to send
      let senderSock = null;
      let senderBotId = null;

      if (q.bot_id) {
        const s = activeSessions.get(q.bot_id);
        if (s?.state === SessionState.CONNECTED && s.sock) {
          senderSock = s.sock;
          senderBotId = q.bot_id;
        }
      }

      const isOtpMessage = String(q.message || "").includes("رمز التحقق");
      const adminNumbers = ["967772847565", "967712343137", "772847565", "712343137"];

      if (isOtpMessage) {
        // رموز التحقق حصراً وبشكل قطعي: تُرسل فقط من بوت الأدمن حاتم (772847565) أو بوت النظام (712343137)
        for (const [id, s] of activeSessions.entries()) {
          const num = String(s.bot?.linked_number || s.bot?.phone || "");
          if (s.state === SessionState.CONNECTED && s.sock && adminNumbers.some((a) => num.includes(a))) {
            senderSock = s.sock;
            senderBotId = id;
            break;
          }
        }
        if (!senderSock) {
          console.warn(`[queue][security] OTP cannot be dispatched because Admin bot (772847565/712343137) is not connected. Refusing to use client bots!`);
          continue;
        }
      } else {
        // الرسائل العادية: إما من البوت المحدد (bot_id) أو بوت الأدمن حاتم حصراً
        if (!senderSock) {
          for (const [id, s] of activeSessions.entries()) {
            const num = String(s.bot?.linked_number || s.bot?.phone || "");
            if (s.state === SessionState.CONNECTED && s.sock && adminNumbers.some((a) => num.includes(a))) {
              senderSock = s.sock;
              senderBotId = id;
              break;
            }
          }
        }
      }

      if (senderSock) {
        try {
          const raw = String(q.to_number || "").trim();
          const jid = raw.includes("@") ? raw : `${raw.replace(/\D/g, "")}@s.whatsapp.net`;
          await senderSock.sendMessage(jid, { text: q.message });
          await supabase.from("notify_queue").update({ status: "sent", bot_id: senderBotId, claimed_at: new Date().toISOString() }).eq("id", q.id);
          console.log(`[queue] notification sent to ${jid}`);
        } catch (err) {
          await supabase.from("notify_queue").update({ status: "failed" }).eq("id", q.id);
        }
      }
    }
  } catch {}

  // B. Process scheduled_posts
  try {
    const nowIso = new Date().toISOString();
    const { data: posts } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("status", "pending")
      .lte("run_at", nowIso)
      .limit(5);

    for (const post of posts || []) {
      const s = activeSessions.get(post.bot_id);
      if (s?.state === SessionState.CONNECTED && s.sock) {
        try {
          const target = post.target || "status@broadcast";
          await s.sock.sendMessage(target, { text: post.body });
          await supabase.from("scheduled_posts").update({ status: "sent", claimed_at: nowIso }).eq("id", post.id);
          await addLog(post.bot_id, "scheduled_sent", { target });
        } catch {
          await supabase.from("scheduled_posts").update({ status: "failed" }).eq("id", post.id);
        }
      }
    }
  } catch {}

  // C. Process pending group actions & sync groups (from Dashboard)
  try {
    for (const [botId, s] of activeSessions.entries()) {
      if (s.state !== SessionState.CONNECTED || !s.sock) continue;

      // Periodically (every 2 mins) sync groups to metadata
      const nowTs = Date.now();
      if (!s.lastGroupSync || nowTs - s.lastGroupSync > 120000) {
        s.lastGroupSync = nowTs;
        try {
          const allGroups = await s.sock.groupFetchAllParticipating();
          const botIdStr = jidNormalizedUser(s.sock.user.id);
          const summaries = Object.values(allGroups).map((g) => ({
            id: g.id,
            subject: g.subject,
            participantsCount: g.participants.length,
            amAdmin: g.participants.some(
              (p) => jidNormalizedUser(p.id) === botIdStr && (p.admin === "admin" || p.admin === "superadmin")
            ),
            owner: g.owner || null,
          }));

          const { data: bRec } = await supabase.from("bots").select("metadata").eq("id", botId).single();
          await supabase.from("bots").update({
            metadata: { ...(bRec?.metadata || {}), groups: summaries, groups_synced_at: new Date().toISOString() },
          }).eq("id", botId);
        } catch (syncErr) {
          console.warn(`[groups-sync][${botId}] error:`, syncErr.message);
        }
      }

      // Check for pending promotion actions
      const { data: botRecord } = await supabase.from("bots").select("metadata").eq("id", botId).single();
      const meta = botRecord?.metadata || {};
      const pendingActions = meta.pending_group_actions || [];
      if (pendingActions.length > 0) {
        const remaining = [];
        for (const act of pendingActions) {
          try {
            if (act.type === "promote" && act.group_id && act.target_phone) {
              const targetJid = act.target_phone.includes("@")
                ? act.target_phone
                : `${act.target_phone.replace(/\D/g, "")}@s.whatsapp.net`;
              await s.sock.groupParticipantsUpdate(act.group_id, [targetJid], "promote");
              console.log(`[group-action][${botId}] ✅ promoted ${targetJid} to admin in ${act.group_id}`);
              await addLog(botId, "dashboard_promoted_admin", { group: act.group_id, target: targetJid });
            }
          } catch (actErr) {
            console.warn(`[group-action][${botId}] failed:`, actErr.message);
          }
        }
        await supabase.from("bots").update({
          metadata: { ...meta, pending_group_actions: remaining, last_action_done_at: new Date().toISOString() },
        }).eq("id", botId);
      }
    }
  } catch {}
}

// ============================================================================
// 9. GRACEFUL SHUTDOWN & CRASH PROTECTION
// ============================================================================
async function gracefulShutdown(signal) {
  if (shutdownRequested) return;
  shutdownRequested = true;
  console.log(`\n[SHUTDOWN] Received ${signal}. Gracefully stopping WhatsApp Engine...`);

  // Stop accepting new sessions & clear all active sockets
  const destroyPromises = [];
  for (const [id, session] of activeSessions.entries()) {
    console.log(`[SHUTDOWN] closing session ${id}...`);
    destroyPromises.push(session.destroy("engine_shutdown"));
  }
  await Promise.allSettled(destroyPromises);
  activeSessions.clear();

  // Flush all debounced credentials to Supabase
  console.log("[SHUTDOWN] flushing all pending credentials to database...");
  await flushAllCreds();

  console.log("[SHUTDOWN] All resources cleaned up. Exiting.");
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  console.error("[CRASH_GUARD] Uncaught Exception caught safely:", err.stack || err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("[CRASH_GUARD] Unhandled Rejection caught safely:", reason?.stack || reason);
});

// ============================================================================
// 10. MAIN ENGINE BOOTSTRAP
// ============================================================================
async function main() {
  if (process.env.DISABLE_LOCAL_ENGINE === "true" || process.env.DISABLE_ENGINE === "true") {
    console.log("[engine] ⏸️ Engine is disabled on this local machine (DISABLE_LOCAL_ENGINE=true) because production engine is running on Railway/Cloud.");
    while (!shutdownRequested) {
      await new Promise((r) => setTimeout(r, 60000));
    }
    return;
  }

  console.log("============================================================================");
  console.log("  🚀 Starting Bot Platform 24/7 Resilient Engine (Baileys + Supabase)");
  console.log("============================================================================");

  let waVersion;
  try {
    const { version, isLatest } = await fetchLatestWaWebVersion();
    waVersion = version;
    console.log(`[engine] WhatsApp Web Version: ${version.join(".")} (latest=${isLatest})`);
  } catch {
    waVersion = [2, 3000, 1043857760];
    console.warn(`[engine] WhatsApp Web Version fallback: ${waVersion.join(".")}`);
  }

  // Initial reconciliation
  await reconcileBots(waVersion);

  // Robust while loop with sleep instead of overlapping setInterval
  const POLL_INTERVAL = 3500;
  while (!shutdownRequested) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    await reconcileBots(waVersion);
  }
}

const isDirectRun =
  process.argv[1] &&
  (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith("engine/index.mjs"));

if (isDirectRun) {
  main().catch((err) => {
    console.error("[FATAL] Main startup crashed:", err);
    process.exit(1);
  });
}
