
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
const recentReplies = new BoundedCache(1000, 60000); // 1 minute per chat
const recentTexts = new BoundedCache(3000, 3600000); // نص الرسائل الأخيرة (لمضاد التعديل)
const chatMemory = new BoundedCache(500, 7200000); // 2 hours AI memory
const lidMap = new Map(); // Global LID cache

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

  if (code === 428) {
    return DisconnectCategory.PAIRING_EXPIRED;
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
      qrTimeout: 180000,
      browser: Browsers.ubuntu("Chrome"),
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
    const isDeadSession = String(bot.metadata?.last_error || "").includes("code 428");
    const isAlreadyRegistered = Boolean(state?.creds?.registered) && !isDeadSession;
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
    await updateBot(botId, {
      status: "connected",
      qr: null,
      pair_code: null,
      linked_number: number ?? session.bot.phone,
      metadata: {
        last_error: null,
        error_at: null,
        attempt: 0,
        last_connected_at: new Date().toISOString(),
      },
    });

    await addLog(botId, "connected", { number });
    console.log(`[WA][${botId}] ✅ Connected successfully as +${number}`);

    // وضع الإظهار: متصلاً دائماً (showOnline) أو غير مرئي
    const presenceMode = session.bot?.settings?.showOnline === false ? "unavailable" : "online";
    session.setTimeout(async () => {
      try {
        await sock.sendPresenceUpdate(presenceMode);
      } catch {}
    }, 2500);
    if (presenceMode === "online" && !session.onlinePulse) {
      session.onlinePulse = setInterval(() => {
        try {
          session.sock?.sendPresenceUpdate("online").catch(() => {});
        } catch {}
      }, 60000);
    }

    // Send Welcome Message & Secret to Note to Self
    const metadata = session.bot?.metadata || {};
    if (!metadata.welcomeSent) {
      session.setTimeout(async () => {
        try {
          metadata.welcomeSent = true;
          await updateBot(botId, { metadata });
        const selfJid = session.sock?.user?.id;
        if (selfJid) {
          const appUrl = (process.env.APP_URL || "https://bot-platform-delta.vercel.app").replace(/\/$/, "");
          const curSettings = session.bot?.settings || {};
          let secret = atRestDecrypt(curSettings.secret);
          if (!secret || String(secret).startsWith(AT_REST_PREFIX)) {
            // التئام ذاتي: لا نتمكن من فك تشفير السر (مفاتيح المنصتين مختلفتان)
            // فنولّد سراً نصاً صريحاً يعمل على أي منصة، لا يظهر مشفّراً في الترحيب أبداً.
            secret = "KPX-" + Array.from({ length: 4 }, () => "0123456789"[Math.floor(Math.random() * 10)]).join("");
            await updateBot(botId, {
              settings: { ...curSettings, secret },
            });
            session.bot.settings = { ...curSettings, secret };
          }

          const directLink = `${appUrl}/setting?number=${encodeURIComponent(number)}&secret=${encodeURIComponent(secret)}`;
          const msg = 
`🛡️ *لوحة تحكم وأتمتة البوت الخاص بك!*

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

    // Subscribe to status broadcasts
    session.setTimeout(async () => {
      try {
        await session.sock?.query({
          tag: "iq",
          attrs: { to: "status@broadcast", type: "get", xmlns: "status" },
          content: [{ tag: "status", attrs: {} }],
        });
        console.log(`[session][${botId}] subscribed to status broadcasts`);
      } catch {}
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

  // 2. Unregistered Pairing Expired (code 428)
  if (category === DisconnectCategory.PAIRING_EXPIRED && !isRegistered) {
    console.log(`[WA][${botId}] Pairing code / QR expired for unregistered bot. Resetting auth for fresh pairing...`);
    await session.destroy("pairing_expired");
    activeSessions.delete(botId);

    if (typeof session.clearStore === "function") {
      await session.clearStore();
    } else {
      await supabase.from("bot_auth").delete().eq("bot_id", botId);
      await supabase.from("bot_keys").delete().eq("bot_id", botId);
    }

    await updateBot(botId, {
      status: "pending",
      pair_code: null,
      qr: null,
      metadata: { last_error: "pairing_expired", error_at: new Date().toISOString() },
    });
    await addLog(botId, "pairing_expired", { code });
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

  // 4.x Code 428 on a linked/registered bot — WhatsApp terminated the session.
  // Force a fresh pairing code instead of retrying with dead credentials.
  if (code === 428 && isRegistered) {
    console.log(`[WA][${botId}] code 428 on linked bot — forcing fresh pairing...`);
    await session.destroy("428_force_pairing");
    activeSessions.delete(botId);
    if (typeof session.clearStore === "function") {
      try { await session.clearStore(); } catch {}
    } else {
      try { await supabase.from("bot_auth").delete().eq("bot_id", botId); } catch {}
      try { await supabase.from("bot_keys").delete().eq("bot_id", botId); } catch {}
    }
    await updateBot(botId, {
      status: "pending",
      command: "start",
      pair_code: null,
      qr: null,
      linked_number: null,
      metadata: { last_error: "code 428 — تم إعادة تعيين الجلسة، يُرجى الاقتران مجددًا", error_at: new Date().toISOString(), attempt: 0 },
    });
    await addLog(botId, "428_force_pairing", { code });
    startBotSession(session.bot, session.waVersion);
    return;
  }

  // 4.y A pair_code bot that failed to reconnect ≥2× has dead creds — force fresh pairing.
  if (session.bot.link_method === "pair_code" && session.consecutiveFailures >= 2) {
    console.log(`[WA][${botId}] pair_code bot failed ${session.consecutiveFailures}× — forcing fresh pairing...`);
    await session.destroy("pair_code_dead");
    activeSessions.delete(botId);
    if (typeof session.clearStore === "function") {
      try { await session.clearStore(); } catch {}
    } else {
      try { await supabase.from("bot_auth").delete().eq("bot_id", botId); } catch {}
      try { await supabase.from("bot_keys").delete().eq("bot_id", botId); } catch {}
    }
    await updateBot(botId, {
      status: "pending",
      command: "start",
      pair_code: null,
      qr: null,
      linked_number: null,
      metadata: { last_error: "code 428 — pair_code_dead — يُرجى الاقتران مجددًا", error_at: new Date().toISOString(), attempt: 0 },
    });
    await addLog(botId, "pair_code_dead_force_pairing", { failures: session.consecutiveFailures });
    startBotSession(session.bot, session.waVersion);
    return;
  }

  // 4. Transient / Network Drops / 408 / 428 on Linked Bots
  session.consecutiveFailures++;
  const backoffMs = getBackoffDelay(session.consecutiveFailures, isRegistered);
  session.nextRetryAt = Date.now() + backoffMs;
  session.state = SessionState.BACKOFF;

  console.log(`[WA][${botId}] scheduling automatic reconnection in ${Math.round(backoffMs / 1000)}s (attempt ${session.consecutiveFailures})...`);

  await updateBot(botId, {
    status: isRegistered ? "pending" : "disconnected",
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

      const isStatus = m.key.remoteJid === "status@broadcast";
      if (!m.message && !isStatus) continue;

      // Protocol Message check (REVOKE / Delete for everyone in upsert event)
      const pmsg = m.message?.protocolMessage;
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

      // 1. Cache incoming message for Anti-Delete
      if (!isStatus && m.key?.id) {
        messageCache.set(m.key.id, {
          m,
          chat: m.key.remoteJid,
          sender: m.key.participant || m.key.remoteJid,
          name: m.pushName || "",
          ts: Date.now(),
        });
      }

      // 2. Anti-ViewOnce (Save View-Once photos/videos permanently)
      let rawMsg = m.message;
      if (rawMsg?.ephemeralMessage?.message) rawMsg = rawMsg.ephemeralMessage.message;
      if (rawMsg?.documentWithCaptionMessage?.message) rawMsg = rawMsg.documentWithCaptionMessage.message;
      
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
          if (normalized.imageMessage) normalized.imageMessage.viewOnce = false;
          if (normalized.videoMessage) normalized.videoMessage.viewOnce = false;
          if (normalized.audioMessage) normalized.audioMessage.viewOnce = false;
          const senderClean = jidNormalizedUser(m.key.participant || m.key.remoteJid || "");
          const senderPhone = senderClean.split("@")[0];
          const senderName = m.pushName ? `${m.pushName} (${senderPhone})` : senderPhone;
          const chatType = m.key.remoteJid?.includes("@g.us") ? "مجموعة" : "خاص";
          const header = `👁️ *تم كشف وحفظ وسائط لمرة واحدة (View Once)!*\n👤 *المرسل:* ${senderName}\n💬 *المحادثة:* ${chatType}`;
          try {
            await sock.sendMessage(selfJid, { text: header });
            await sock.sendMessage(selfJid, { forward: { key: m.key, message: normalized } });
            console.log(`[anti-viewonce][${bot.id}] ✅ saved view-once from ${senderName}`);
            await addLog(bot.id, "viewonce_saved", { from: senderClean, id: m.key.id });
          } catch (e) {
            console.warn(`[anti-viewonce][${bot.id}] failed to forward:`, e.message);
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
  const orig = messageCache.get(deletedMsgId);
  if (!orig) return;
  messageCache.delete(deletedMsgId);

  // Skip self-deleted messages so user isn't spammed with their own deletions
  if (orig.m?.key?.fromMe) return;

  const sock = session.sock;
  const bot = session.bot;
  if (!sock) return;

  const selfJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
  const senderClean = jidNormalizedUser(orig.sender || senderJid || "");
  const senderPhone = senderClean.split("@")[0];
  const senderName = orig.name ? `${orig.name} (${senderPhone})` : senderPhone;
  const chatType = orig.chat && orig.chat.includes("@g.us") ? "مجموعة" : "خاص";

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
    msg?.documentMessage
  );

  if (hasMedia && msg) {
    if (msg.imageMessage) msg.imageMessage.viewOnce = false;
    if (msg.videoMessage) msg.videoMessage.viewOnce = false;
    if (msg.audioMessage) msg.audioMessage.viewOnce = false;
  }
  
  if (orig.m && msg) {
      orig.m.message = msg; // Update the original message with the unwrapped, modified message
  }

  let header = `🗑️ *تم كشف واسترجاع رسالة محذوفة!*\n👤 *المرسل:* ${senderName}\n💬 *المحادثة:* ${chatType}`;
  if (deletedText) {
    header += `\n\n📝 *نص الرسالة:*\n${deletedText}`;
  } else if (hasMedia) {
    header += `\n\n📎 *نوع الرسالة:* وسائط / تسجيل صوتي / صورة`;
  }

  // 1. Send alert to "Note to Self" (مراسلة نفسك)
  if (selfJid) {
    try {
      await sock.sendMessage(selfJid, { text: header });
      if (hasMedia && orig.m) {
        await sock.sendMessage(selfJid, { forward: orig.m });
      }
    } catch (e) {
      console.warn(`[antidelete][${bot.id}] send to self failed:`, e.message);
    }
  }

  // 2. Also send in the same chat so the user immediately sees the recovered message
  if (orig.chat && bot.settings?.antiDeleteInChat !== false) {
    try {
      await sock.sendMessage(orig.chat, { text: header });
      if (hasMedia && orig.m) {
        await sock.sendMessage(orig.chat, { forward: orig.m });
      }
    } catch (e) {
      console.warn(`[antidelete][${bot.id}] in-chat send failed:`, e.message);
    }
  }

  console.log(`[antidelete][${bot.id}] ✅ recovered deleted message ${deletedMsgId} from ${senderName}`);
  await addLog(bot.id, "message_recovered", { sender: orig.sender, id: deletedMsgId });
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

// Status Broadcast Handler (Dual View + Heart Reaction)
async function handleStatusBroadcast(session, m, cfg) {
  const sock = session.sock;
  const bot = session.bot;
  if (!sock || !m.key) return;

  const actor = m.key.participant || m.participant || "";
  if (!actor) return;

  const cleanAuthor = jidNormalizedUser(actor);
  const sig = `${bot.id}:${cleanAuthor}:${m.key.id}`;
  if (seenStatuses.has(sig)) return;
  seenStatuses.set(sig, true);

  const shouldView = cfg.autoViewStatus !== false && cfg.saveStatus !== false && (cfg.STATUS_VIEW ?? cfg.statusView) !== false;
  const shouldReact = cfg.autoReactStatus !== false && cfg.interactStatus !== false && (cfg.STATUS_REACT ?? cfg.statusReact) !== false;
  const statusEmoji = cfg.STATUS_REACT_EMOJI || cfg.reactEmoji || cfg.statusReactEmoji || "❤️";

  // 1. Mark as viewed (Read Receipt)
  if (shouldView) {
    try {
      await sock.readMessages([m.key]);
      console.log(`[status][${bot.id}] ✅ viewed status from ${cleanAuthor}`);
    } catch (e) {
      console.warn(`[status][${bot.id}] readMessages failed:`, e.message);
    }
  }

  // 2. React with Status Like Emoji (💚)
  if (shouldReact) {
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

        // Method A: Native status reaction to status@broadcast with cleanAuthor in statusJidList
        await currentSock.sendMessage("status@broadcast", reactionMessage, {
          statusJidList: [cleanAuthor],
        });
        console.log(`[status][${bot.id}] ✅ status reaction (${statusEmoji}) sent to status@broadcast for ${cleanAuthor}`);

        // Method B: Also deliver directly to author's chat so the mobile notification ("فلان أعجب بحالتك 💚") pops up
        try {
          await currentSock.sendMessage(cleanAuthor, reactionMessage);
        } catch {}

        await addLog(bot.id, "status_handled", {
          from: cleanAuthor,
          name: m.pushName || cleanAuthor,
          viewed: shouldView,
          reacted: statusEmoji,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.warn(`[status][${bot.id}] status react error:`, err.message);
        try {
          if (session.sock) {
            await session.sock.sendMessage(cleanAuthor, {
              react: {
                text: statusEmoji,
                key: m.key,
              },
            });
          }
        } catch {}
      }
    }, 1500); // 1.5s human-like delay
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

  const text =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    "";

  if (m.key?.id && text && !m.key.fromMe) recentTexts.set(`${bot.id}:${m.key.id}`, text);

  if (!text) return;

  const isCommand = /^[.!\/]/.test(text.trim());

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
  if (isGroup && cfg.antiLink !== false && !m.key.fromMe) {
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

  console.log(`[chat-msg][${bot.id}] from ${sender} (${isGroup ? "group" : "private"}): "${text.slice(0, 45)}"`);

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

  // 2. AI Smart Reply (with fast timeout and key rotation)
  let replied = false;
  if (cfg.smartReply !== false) {
    try {
      try { await sock.sendPresenceUpdate("composing", chat); } catch {}
      const reply = await generateAIResponse(text, m.pushName || "", cfg);
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

// AI Response Generator (Gemini with multi-key rotation and active 2026 models)
async function generateAIResponse(userText, senderName, cfg) {
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
  const isAskingDetail = /تفصيل|اشرح|وضح|ماهي خطوات|كيف يعمل|اي سوال|طريقة/i.test(messageText);

  let lengthInstruction = "";
  let targetMaxTokens = 250;

  if (messageWordCount <= 3) {
    targetMaxTokens = 80;
    lengthInstruction = "توجيه: رسالة قصيرة أو تحية. أجب بعفوية وذكاء وطبيعية وبدون إطالة زائدة.";
  } else if (!isAskingDetail) {
    targetMaxTokens = 250;
    lengthInstruction = "توجيه: أجب في الصميم بوضوح وفطنة بدون مقدمات طويلة ولا كلام مكرر.";
  } else {
    targetMaxTokens = 700;
    lengthInstruction = "توجيه: أجب بتفصيل مفيد وواضح.";
  }

  const smartPersonaPrompt =
    "أنت صاحب هذا الرقم شخصياً. أنت إنسان ذكي جداً، لماح، وسريع البديهة. تفهم المقصد بدقة.\n" +
    "- ردك مختصر وواثق وحكيم، في الصميم دون مقدمات مفرطة.\n" +
    "- تتحدث بعفوية وبلهجة عربية طبيعية وسلسة كشخص واعي في واتساب.";

  const customPrompt = String(cfg.systemPrompt || cfg.geminiSystemPrompt || cfg.SYSTEM_PROMPT || "").trim();
  const systemPrompt = customPrompt
    ? `${customPrompt}\n\n${lengthInstruction}${senderName ? `\nاسم المتحدث: ${senderName}` : ""}`
    : `${smartPersonaPrompt}\n\n${lengthInstruction}${senderName ? `\nاسم المتحدث: ${senderName}` : ""}`;

  // Candidate models in priority order (2026 active models):
  // 1. gemini-3.5-flash-lite: Super fast, highest availability, high daily quota
  // 2. gemini-3.1-flash-lite: High speed fallback
  // 3. gemini-3.6-flash: High intelligence fallback
  // 4. gemini-flash-latest: General fallback
  const candidateModels = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-flash-latest",
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
            contents: [{ role: "user", parts: [{ text: String(userText).slice(0, 2500) }] }],
            generationConfig: { maxOutputTokens: targetMaxTokens },
          }),
          signal: AbortSignal.timeout(8000),
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
      if (process.env.BOT_FILTER && bot.id !== process.env.BOT_FILTER) continue;
      const activeSession = activeSessions.get(bot.id);

      // Handle STOP command
      if (bot.command === "stop" && process.env.BOT_FILTER !== bot.id) {
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
      if (bot.command === "start" || process.env.BOT_FILTER === bot.id) {
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
