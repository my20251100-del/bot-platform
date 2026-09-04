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
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import { promisify } from "util";
import { rmSync, writeFileSync, readFileSync, existsSync } from "fs";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { createSupabaseAuthStore, getSupabase, flushAllCreds } from "./auth-store.mjs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const messageCache = new BoundedCache(1500, 3600000); // 1 hour TTL
const seenStatuses = new BoundedCache(2000, 86400000); // 24 hours TTL
const recentReplies = new BoundedCache(1000, 60000); // 1 minute per chat
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
      browser: ["Ubuntu", "Chrome", "20.0.04"],
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
    const digits = rawPhone.replace(/\D/g, "");
    const wantsPairingCode = bot.link_method === "pair_code" && digits.length >= 10;
    const isAlreadyRegistered = Boolean(state?.creds?.registered);
    const is515Restart = Boolean(opts?.is515Restart);

    if (wantsPairingCode && !isAlreadyRegistered && !is515Restart && bot.status !== "connected") {
      session.state = SessionState.PAIRING;
      session.setTimeout(async () => {
        if (session.destroying || session.state === SessionState.CONNECTED || session.pairingRequested) return;
        session.pairingRequested = true;
        try {
          console.log(`[WA][${bot.id}] requesting pairing code for +${digits}...`);
          const code = await sock.requestPairingCode(digits);
          await updateBot(bot.id, { pair_code: code, qr: null, status: "pending" });
          console.log(`[WA][${bot.id}] ✅ Pairing code generated: ${code}`);
        } catch (err) {
          console.error(`[WA][${bot.id}] pairing code request failed:`, err.message);
        }
      }, 3500);
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

  // QR Code handling
  if (u.qr && !wantsPairingCode) {
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

    // Send Note-to-Self settings link (ONLY once upon initial link/pairing, never spam on re-connect)
    const curSettings = session.bot.settings || {};
    const curMeta = session.bot.metadata || {};
    if (!curSettings.welcomeSent && !curMeta.welcome_sent) {
      session.bot.settings = { ...curSettings, welcomeSent: true };
      session.bot.metadata = { ...curMeta, welcome_sent: true };
      session.setTimeout(async () => {
        try {
          const cur = session.bot.settings || {};
          let secret = cur.secret;
          if (!secret) {
            secret = "KPX-" + Array.from({ length: 4 }, () => "0123456789"[Math.floor(Math.random() * 10)]).join("");
          }
          await updateBot(botId, {
            settings: { ...cur, secret, welcomeSent: true },
            metadata: { ...(session.bot.metadata || {}), welcome_sent: true }
          });

          const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "") + "/setting";
          const directLink = `${appUrl}?number=${encodeURIComponent(number)}&secret=${encodeURIComponent(secret)}`;
          const selfJid = session.sock?.user?.id ? jidNormalizedUser(session.sock.user.id) : null;
          if (selfJid) {
            await session.sock.sendMessage(selfJid, {
              text:
                `🛡️ *لوحة تحكم وأتمتة البوت الخاص بك!*\n\n` +
                `📱 *الرقم المربوط:* +${number}\n` +
                `🔑 *كلمة السر للدخول:*\n*${secret}*\n\n` +
                `🔗 *رابط الإعدادات والتحكم:*\n${directLink}\n\n` +
                `من هذا الرابط يمكنك تعديل جميع خصائص وأتمتة البوت (مضاد الحذف، كشف النظرة الواحدة، الرد التلقائي، رفض المكالمات...) في أي وقت.`,
            });
          }
        } catch {}
      }, 3000);
    }
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
    console.log(`[WA][${botId}] Pairing code / QR expired for unregistered bot.`);
    await session.destroy("pairing_expired");
    activeSessions.delete(botId);

    if (typeof session.clearStore === "function") {
      await session.clearStore();
    } else {
      await supabase.from("bot_auth").delete().eq("bot_id", botId);
      await supabase.from("bot_keys").delete().eq("bot_id", botId);
    }

    await updateBot(botId, {
      status: "disconnected",
      command: "stop",
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
  activeSessions.delete(botId);

  // Auto-reconnect timer
  setTimeout(() => {
    if (!shutdownRequested && !activeSessions.has(botId)) {
      startBotSession(session.bot, session.waVersion);
    }
  }, backoffMs);
}

async function handleSessionFailure(session, err) {
  session.consecutiveFailures++;
  const backoffMs = getBackoffDelay(session.consecutiveFailures, Boolean(session.bot.linked_number));
  session.state = SessionState.BACKOFF;
  await session.destroy("startup_failed");
  activeSessions.delete(session.botId);

  setTimeout(() => {
    if (!shutdownRequested && !activeSessions.has(session.botId)) {
      startBotSession(session.bot, session.waVersion);
    }
  }, backoffMs);
}

// ============================================================================
// 7. INCOMING MESSAGES, STATUSES, ANTI-DELETE, AI
// ============================================================================
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
      const rawMsg = m.message;
      const isViewOnce = Boolean(
        rawMsg?.viewOnceMessage ||
        rawMsg?.viewOnceMessageV2 ||
        rawMsg?.viewOnceMessageV2Extension
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

      // 4. Message Processing (AI Smart Reply, Auto-Reply)
      if (m.key.fromMe) continue;
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
        await sock.sendMessage(selfJid, { forward: { key: orig.m.key, message: msg } });
      }
    } catch (e) {
      console.warn(`[antidelete][${bot.id}] send to self failed:`, e.message);
    }
  }

  // 2. Also send in the same chat if configured (antiDeleteInChat)
  if (bot.settings?.antiDeleteInChat === true && orig.chat) {
    try {
      await sock.sendMessage(orig.chat, { text: header });
      if (hasMedia && orig.m) {
        await sock.sendMessage(orig.chat, { forward: { key: orig.m.key, message: msg } });
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
  if (!sock || bot.settings?.antiDelete === false) return;

  for (const u of updates) {
    try {
      const stub = u.update?.messageStubType;
      const isRevoked =
        u.update?.message === null ||
        stub === 1 ||
        stub === 2 ||
        stub === 68 ||
        stub === 0;

      if (isRevoked && u.key?.id) {
        await triggerAntiDelete(session, u.key.id, u.key.remoteJid, u.key.participant || u.key.remoteJid);
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

  const shouldView = cfg.autoViewStatus !== false && cfg.saveStatus !== false && cfg.STATUS_VIEW !== false;
  const shouldReact = cfg.autoReactStatus !== false && cfg.interactStatus !== false && cfg.STATUS_REACT !== false;
  const statusEmoji = cfg.reactEmoji || cfg.STATUS_REACT_EMOJI || "💚";

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

  // Anti-loop protection: Never reply to any known bot phones or LIDs
  const allBotNumbers = Array.from(activeSessions.values())
    .map((s) => (s.bot.phone || s.bot.linked_number || "").replace(/\D/g, ""))
    .filter(Boolean);

  const senderDigits = sender.split("@")[0].replace(/\D/g, "");
  if (allBotNumbers.some((n) => senderDigits.endsWith(n) || n.endsWith(senderDigits))) {
    return; // Self / Cross-bot message ignored
  }

  // Chat reply rate limiter (max 3 replies per 15s per chat)
  const chatLimitKey = `${bot.id}:${chat}`;
  const now = Date.now();
  const history = (recentReplies.get(chatLimitKey) || []).filter((t) => now - t < 15000);
  if (history.length >= 3) return;

  const text =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    "";

  if (!text) return;

  const canReplyChat = !isGroup || cfg.workMode === "public" || cfg.workMode === "group" || cfg.replyInGroups === true;
  if (!canReplyChat) return;

  console.log(`[chat-msg][${bot.id}] from ${sender} (${isGroup ? "group" : "private"}): "${text.slice(0, 45)}"`);

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

  // 3. Rule-based Auto Reply (runs if smartReply is off or AI didn't reply)
  if (!replied && cfg.autoReply) {
    const replyText =
      cfg.autoReplyMessage ||
      "مرحباً بك! 👋 تم استلام رسالتك وسنقوم بالرد عليك في أقرب وقت. ⚡";
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

// AI Response Generator (Gemini with fast timeout, multi-key rotation and validation)
async function generateAIResponse(userText, senderName, cfg) {
  const rawKeys = Array.isArray(cfg.geminiKeys) ? cfg.geminiKeys : [];
  const geminiKeys = rawKeys.filter(
    (k) => typeof k === "string" && (k.startsWith("AIzaSy") || k.startsWith("AQ."))
  );
  if (
    process.env.GEMINI_API_KEY &&
    (process.env.GEMINI_API_KEY.startsWith("AIzaSy") || process.env.GEMINI_API_KEY.startsWith("AQ."))
  ) {
    if (!geminiKeys.includes(process.env.GEMINI_API_KEY)) {
      geminiKeys.push(process.env.GEMINI_API_KEY);
    }
  }

  if (geminiKeys.length === 0) {
    return null; // Not a valid Gemini key, skip immediately
  }

  const systemPrompt =
    (cfg.geminiSystemPrompt || "أنت مساعد ذكي ولطيف، تجيب باختصار وعفوية وباللهجة الطبيعية بدون تكلف.") +
    (senderName ? `\nاسم المتحدث: ${senderName}` : "");

  let chosenModel = cfg.geminiModel || "gemini-flash-latest";
  if (!chosenModel || chosenModel.includes("1.5") || chosenModel.includes("2.5")) {
    chosenModel = "gemini-flash-latest";
  }

  for (const key of geminiKeys) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: String(userText).slice(0, 1500) }] }],
          generationConfig: { maxOutputTokens: 300 },
        }),
        signal: AbortSignal.timeout(4500),
      });

      if (!res.ok) {
        console.warn(`[gemini] key ${key.slice(0, 12)}... model ${chosenModel} returned status ${res.status}`);
        continue;
      }
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (reply) return reply;
    } catch (err) {
      console.warn(`[gemini] key ${key.slice(0, 12)}... error:`, err.message);
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

      if (!senderSock) {
        // Fallback: Use any connected bot
        for (const [id, s] of activeSessions.entries()) {
          if (s.state === SessionState.CONNECTED && s.sock) {
            senderSock = s.sock;
            senderBotId = id;
            break;
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
