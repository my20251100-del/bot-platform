import wwjs from "whatsapp-web.js";
import { supabase } from "./utils/supabase.js";
import { askGemini } from "./utils/gemini.js";

const { Client, LocalAuth } = wwjs;

// ---------------------------------------------------------------------------
// In-memory registry of live clients (botId -> Client).
// ---------------------------------------------------------------------------
const clients = new Map();

// Puppeteer args required to avoid crashes on Render/Linux (headless servers).
const PUPPETEER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-first-run",
  "--no-zygote",
];

// اختياري: توجيه puppeteer لمتصفّح مُحدَّد إن عُيّن في البيئة (مفيد في
// بيئات لا يجد فيها التخزين المؤقت الصحيح، مثل بعض الـ containers).
const PUPPETEER_EXECUTABLE = process.env.PUPPETEER_EXECUTABLE_PATH || "";

function puppeteerOptions() {
  const opts = { headless: true, args: PUPPETEER_ARGS };
  if (PUPPETEER_EXECUTABLE) opts.executablePath = PUPPETEER_EXECUTABLE;
  return opts;
}

// ---------------------------------------------------------------------------
// Small, safe Supabase helpers (never throw into the event loop)
// The production project stores everything on the existing `bots` table:
//   status  -> text (pending/connected/disconnected)
//   settings -> jsonb with the dashboard's original key names.
// ---------------------------------------------------------------------------

async function updateBotStatus(botId, status) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from("bots")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", botId);
    if (error) console.error(`[db:${botId}] update status failed:`, error.message);
  } catch (e) {
    console.error(`[db:${botId}] update status exception:`, e.message);
  }
}

async function logEvent(botId, event, payload = null) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from("bot_logs")
      .insert({ bot_id: botId, event, payload });
    if (error) console.error(`[db:${botId}] log failed:`, error.message);
  } catch (e) {
    console.error(`[db:${botId}] log exception:`, e.message);
  }
}

// Read the bot's settings JSONB and normalize it to the controller's field
// names while also honoring the dashboard's original key names.
async function getSettings(botId) {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase
      .from("bots")
      .select("settings")
      .eq("id", botId)
      .maybeSingle();
    if (error) throw error;
    const s = (data && data.settings) || {};
    return {
      show_online: s.show_online ?? true,
      reject_calls: !!s.reject_calls,
      anti_delete_mode: s.anti_delete_mode ?? (s.antiDelete ? "on" : "off"),
      blocked_words: s.blocked_words ?? s.bannedWords ?? [],
      blocked_links: s.blocked_links ?? s.firewallDomains ?? [],
      auto_react_emoji: s.auto_react_emoji ?? s.reactEmoji ?? null,
      gemini_api_keys: s.gemini_api_keys ?? null,
      gemini_model: s.gemini_model ?? null,
      ai_system_prompt: s.ai_system_prompt ?? null,
      _raw: s,
    };
  } catch (e) {
    console.error(`[db:${botId}] settings fetch failed:`, e.message);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Message skeleton
// ---------------------------------------------------------------------------
async function handleIncomingMessage(botId, message) {
  try {
    if (message.fromMe) return; // ignore our own sent messages

    const text = (message.body || "").trim();
    const isGroup = message.from.endsWith("@g.us");

    const settings = await getSettings(botId);

    // 1) Group safety: blocked words + blocked links
    if (text && isGroup) {
      const blockedWords = (Array.isArray(settings.blocked_words)
        ? settings.blocked_words
        : []
      ).map((w) => String(w).toLowerCase());
      const blockedLinks = (Array.isArray(settings.blocked_links)
        ? settings.blocked_links
        : []
      ).map((l) => String(l).toLowerCase());

      const lower = text.toLowerCase();
      const hasBlockedWord = blockedWords.some((w) => w && lower.includes(w));
      const host = extractHost(text);
      const hasBlockedLink = host ? blockedLinks.includes(host) : false;

      if (hasBlockedWord || hasBlockedLink) {
        await message.delete(true); // remove the offending message
        await logEvent(botId, "message_blocked", {
          from: message.from,
          text,
          reason: hasBlockedWord ? "word" : "link",
        });
        return; // never reply to a blocked message
      }
    }

    // 2) Auto-react when an emoji is configured
    if (settings.auto_react_emoji) {
      try {
        await message.react(settings.auto_react_emoji);
      } catch (re) {
        console.warn(`[react:${botId}]`, re.message);
      }
    }

    // 3) AI reply for non-command messages
    if (text && !text.startsWith("!") && text.toLowerCase() !== "ping") {
      const answer = await askGemini(settings, text);
      if (answer) {
        await message.reply(answer);
        await logEvent(botId, "ai_replied", { to: message.from });
      }
    } else if (text && text.toLowerCase() === "ping") {
      await message.reply("pong 🏓");
    }
  } catch (e) {
    console.error(`[msg:${botId}] handler failed safely:`, e.message);
  }
}

function extractHost(text) {
  const m = String(text).match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?:\/\S*)?/i);
  return m ? m[1].toLowerCase().replace(/^\.+|\.+$/g, "") : null;
}

// Anti-delete: forward deleted-for-everyone content to the owner.
async function handleAntiDelete(botId, client, revokedMsg) {
  try {
    if (!revokedMsg || !supabase) return;

    const settings = await getSettings(botId);
    if ((settings.anti_delete_mode || "off").toLowerCase() === "off") return;

    const owner = await getOwnerNumber(botId);
    if (!owner) return;

    let media = null;
    if (revokedMsg.hasMedia && revokedMsg.downloadMedia) {
      try {
        media = await revokedMsg.downloadMedia();
      } catch (me) {
        console.warn(`[antidelete:${botId}] media download failed:`, me.message);
      }
    }

    const text =
      revokedMsg.body ||
      revokedMsg.rawData?.message?.conversation ||
      revokedMsg.rawData?.message?.extendedTextMessage?.text ||
      "";

    if (media) {
      await client.sendMessage(`${owner}@c.us`, media);
      await client.sendMessage(
        `${owner}@c.us`,
        `🗑️ *وسائط محذوفة* من ${revokedMsg.from || "جهة مجهولة"}`
      );
    } else if (text) {
      await client.sendMessage(
        `${owner}@c.us`,
        `🗑️ *رسالة محذوفة*\nمن: ${revokedMsg.from || "جهة مجهولة"}\nالمحتوى:\n"${text}"`
      );
    } else {
      await client.sendMessage(
        `${owner}@c.us`,
        `🗑️ *رسالة محذوفة* من ${revokedMsg.from || "جهة مجهولة"} (تعذّر استرجاع المحتوى)`
      );
    }

    await logEvent(botId, "anti_delete_forwarded", {
      from: revokedMsg.from,
      hasMedia: !!media,
    });
  } catch (e) {
    console.error(`[antidelete:${botId}] failed safely:`, e.message);
  }
}

async function getOwnerNumber(botId) {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from("bots")
      .select("phone")
      .eq("id", botId)
      .maybeSingle();
    return data?.phone || null;
  } catch (e) {
    console.error(`[db:${botId}] owner fetch failed:`, e.message);
    return null;
  }
}

// Reject incoming calls when configured.
async function handleIncomingCall(botId, call) {
  try {
    if (!supabase) return;
    const settings = await getSettings(botId);
    if (settings.reject_calls) {
      try {
        await call.reject();
      } catch (re) {
        console.warn(`[call:${botId}] could not reject:`, re.message);
      }
    }
  } catch (e) {
    console.error(`[call:${botId}] failed safely:`, e.message);
  }
}

// ---------------------------------------------------------------------------
// Attach event listeners and keep the DB in sync
// ---------------------------------------------------------------------------

// أزل client من الذاكرة وأغلق موارده بأمان (يُستدعى عند disconnected/auth_failure).
async function clearClient(botId, client) {
  if (!client) return;
  try {
    await client.destroy();
  } catch {}
  try {
    client.removeAllListeners();
  } catch {}
  // لا نضبط حالة زائفة: إن كان الـ Map ما زال يشير لنفس الـ client فاحذفه.
  const cur = clients.get(botId);
  if (cur === client) clients.delete(botId);
}

function attachListeners(botId, client) {
  client.on("qr", async (qr) => {
    console.log(`[WhatsApp:${botId}] QR generated`);
    client._qrCache = qr;
    client._lastStatus = "pairing";
    // تخزين الـ QR في قاعدة البيانات حتى يتسنّى للواجهة عرضه.
    if (supabase) {
      try {
        await supabase
          .from("bots")
          .update({ qr, status: "pending", command: "start" })
          .eq("id", botId);
      } catch (e) {
        console.error(`[db:${botId}] QR store failed:`, e.message);
      }
    }
  });

  client.on("ready", async () => {
    console.log(`[WhatsApp:${botId}] ✅ Ready`);
    client._lastStatus = "ready";
    await updateBotStatus(botId, "connected");
    await logEvent(botId, "ready");
    client._lastStatus = "connected";
    try {
      await client.sendState?.("available");
    } catch {}
  });

  client.on("authenticated", () => {
    client._lastStatus = "authenticated";
    console.log(`[WhatsApp:${botId}] ✅ Authenticated`);
  });

  client.on("auth_failure", async (msg) => {
    client._lastStatus = "auth_failure";
    // logs السبب دون كشف أي أسرار/توكنز — فقط رسالة مختصرة.
    const reason = String(msg || "")
      .replace(/token|key|cred|=|[\s]/gi, " ")
      .trim()
      .slice(0, 200);
    console.error(`[WhatsApp:${botId}] ❌ Authentication failure: ${reason}`);
    // المخطط يسمح فقط بـ disconnected/pending/connected — لا "failed".
    await updateBotStatus(botId, "disconnected");
    await logEvent(botId, "auth_failure", { msg: reason });
    // بعد فشل المصادقة تكون الجلسة عديمة الفائدة — نزيله من الذاكرة.
    clearClient(botId, client);
  });

  client.on("disconnected", async (reason) => {
    client._lastStatus = "disconnected";
    const why = String(reason || "").slice(0, 200);
    console.warn(`[WhatsApp:${botId}] ❌ Disconnected: ${why}`);
    await updateBotStatus(botId, "disconnected");
    await logEvent(botId, "disconnected", { reason: why });
    clearClient(botId, client);
  });

  client.on("error", (err) => {
    console.error(`[WhatsApp:${botId}] ❌ Error:`, (err && err.message) || err);
  });

  client.on("message", (message) => {
    handleIncomingMessage(botId, message).catch(() => {});
  });

  client.on("message_revoke_everyone", (after, revokedMsg) => {
    handleAntiDelete(botId, client, revokedMsg).catch(() => {});
  });

  client.on("call", (call) => {
    handleIncomingCall(botId, call).catch(() => {});
  });
}

// ---------------------------------------------------------------------------
// Create a fresh client for a botId (LocalAuth, per-bot session folder)
// ---------------------------------------------------------------------------
function createClient(botId) {
  // Allow overriding where LocalAuth stores sessions (Render disk mount).
  const sessionDir = process.env.WA_SESSION_DIR;
  const opts = sessionDir
    ? { authStrategy: new LocalAuth({ clientId: botId, dataPath: sessionDir }) }
    : { authStrategy: new LocalAuth({ clientId: botId }) };

  const client = new Client({
    ...opts,
    puppeteer: puppeteerOptions(),
  });
  client._qrCache = null;
  client._lastStatus = "starting";
  clients.set(botId, client);
  attachListeners(botId, client);
  return client;
}

/**
 * Pair a phone number (no QR). Initializes the client if needed, then
 * requests an 8-character pairing code and returns it.
 */
export async function pairBot(botId, phoneNumber) {
  try {
    let client = clients.get(botId);
    if (!client) {
      client = createClient(botId);
      client
        .initialize()
        .catch(async (e) => {
          console.error(`[whatsapp:${botId}] initialize error:`, e.message);
          await updateBotStatus(botId, "disconnected");
          clients.delete(botId);
        });
    }

    const cleanNumber = String(phoneNumber).replace(/\D/g, "");
    if (!cleanNumber) throw new Error("رقم الهاتف غير صالح");

    const code = await client.requestPairingCode(cleanNumber);
    const cleanCode = String(code || "").replace(/-/g, "");

    console.log(`[whatsapp:${botId}] pairing code for ${cleanNumber}: ${cleanCode}`);

    // Persist pairing info on the existing bots row.
    if (supabase) {
      await supabase
        .from("bots")
        .update({
          pair_code: cleanCode,
          link_method: "code",
          phone: "+" + cleanNumber,
        })
        .eq("id", botId);
    }

    await logEvent(botId, "pair_code_generated", { phone: cleanNumber });
    return { botId, phoneNumber: cleanNumber, pairingCode: cleanCode };
  } catch (e) {
    console.error(`[pair:${botId}] failed:`, e.message);
    throw new Error(`فشل توليد كود الإقران: ${e.message}`);
  }
}

/** Whether a given bot has a live, initialized client. */
export function isReady(botId) {
  const c = clients.get(botId);
  if (!c) return false;
  // الأكثر موثوقية: نفترض جاهزاً عندما وصلنا لمرحلة "ready"/"connected".
  return c._lastStatus === "ready" || c._lastStatus === "connected";
}

/** الحالة الدقيقة داخل الذاكرة لأي بوت (starting/pairing/authenticated/ready/…) */
export function getSessionStatus(botId) {
  const c = clients.get(botId);
  if (!c) return "idle";
  return c._lastStatus || "starting";
}

/** آخر QR مُلتقط داخل الذاكرة لأي بوت (إن وُجد). */
export function getCachedQr(botId) {
  const c = clients.get(botId);
  return c ? c._qrCache || null : null;
}

/** هل يوجد أي بوت جاهز/متصل في الذاكرة؟ (يُستخدم لـ /api/bot/status بلا botId) */
export function anyReady() {
  for (const id of clients.keys()) {
    if (isReady(id)) return true;
  }
  return false;
}

/** POST /api/bot/init — (re)start a bot's client in the background. */
export function initBot(botId) {
  if (clients.has(botId)) return { status: "already_running", botId };
  const client = createClient(botId);
  client.initialize().catch(async (e) => {
    console.error(`[whatsapp:${botId}] initialize error:`, e.message);
    await updateBotStatus(botId, "disconnected");
    clients.delete(botId);
  });
  return { status: "initializing", botId };
}

/** POST /api/bot/stop — clear a bot's client from memory + mark disconnected. */
export async function stopBot(botId) {
  const client = clients.get(botId);
  if (client) await clearClient(botId, client);
  try {
    await updateBotStatus(botId, "disconnected");
  } catch {}
  return { status: "stopped", botId };
}

/**
 * POST /api/bot/send — send a WhatsApp text message from the bot,
 * to a chat JID (someone@s.whatsapp.net) or a human number.
 * Body: { botId, to, text }
 */
export async function sendMessage(botId, to, text) {
  const client = clients.get(botId);
  if (!client) throw new Error("البوت غير مهيّأ — نفّذ /api/bot/init أولاً");

  let jid = String(to || "").trim();
  if (/^\d+$/.test(jid)) jid = `${jid}@s.whatsapp.net`; // رقم → JID

  if (!jid) throw new Error("رقم/محادثة الوجهة مطلوب");
  if (!client.info || !client.info.wid || !client.info.wid.user) {
    throw new Error("البوت غير متصل — تأكد من حالته قبل الإرسال");
  }

  const sent = await client.sendMessage(jid, String(text));
  await logEvent(botId, "message_sent", { to: jid });
  return { success: true, botId, to: jid, id: sent?.id?.id ?? null };
}

/** PUT /api/bot/settings/:botId — merge settings into the bot's jsonb. */
export async function updateBotSettings(botId, body) {
  if (!supabase) throw new Error("Supabase غير مُهيَّأ");

  const { data: cur, error: curErr } = await supabase
    .from("bots")
    .select("settings")
    .eq("id", botId)
    .maybeSingle();
  if (curErr) throw new Error(`جلب الإعدادات فشل: ${curErr.message}`);

  // Map controller field names -> the dashboard's jsonb key names.
  const mapped = {};
  const keyMap = {
    show_online: "show_online",
    reject_calls: "reject_calls",
    anti_delete_mode: "anti_delete_mode",
    blocked_words: "bannedWords",
    blocked_links: "firewallDomains",
    auto_react_emoji: "reactEmoji",
    gemini_api_keys: "gemini_api_keys",
    gemini_model: "gemini_model",
    ai_system_prompt: "ai_system_prompt",
  };
  for (const k of Object.keys(keyMap)) {
    if (body[k] !== undefined) mapped[keyMap[k]] = body[k];
  }

  const base = (cur && cur.settings) || {};
  const { data, error } = await supabase
    .from("bots")
    .update({ settings: { ...base, ...mapped } })
    .eq("id", botId)
    .select("settings")
    .single();
  if (error) throw new Error(`حفظ الإعدادات فشل: ${error.message}`);
  return data;
}

/** GET /api/bot/settings/:botId — fetch normalized settings. */
export async function getBotSettings(botId) {
  if (!supabase) return {};
  return getSettings(botId);
}

/** GET /api/bot/status/:botId — connection status + dashboard aggregates. */
export async function getBotStatus(botId) {
  let bot = null;
  if (supabase) {
    try {
      const { data } = await supabase
        .from("bots")
        .select("id, name, phone, status, link_method, pair_code")
        .eq("id", botId)
        .maybeSingle();
      bot = data || null;
    } catch (e) {
      console.error(`[db:${botId}] status fetch error:`, e.message);
    }
  }

  let total = 0;
  let online = 0;
  if (supabase) {
    try {
      const { data: all } = await supabase.from("bots").select("status");
      if (Array.isArray(all)) {
        total = all.length;
        online = all.filter((b) => b.status === "connected").length;
      }
    } catch (e) {
      console.error(`[db:${botId}] aggregate error:`, e.message);
    }
  }
  return {
    bot,
    isReady: isReady(botId),
    sessionStatus: getSessionStatus(botId),
    qr: getCachedQr(botId),
    stats: { total_bots: total, online_now: online },
  };
}

// ---------------------------------------------------------------------------
// Bot Manager / Synchronizer
// ---------------------------------------------------------------------------
// Lifecycle: Supabase`bots` → syncBots() → startBotIfNeeded()/stopBotIfNeeded()
// → whatsapp-web.js Client → ready → bots.status = connected.
//
// The sync loop polls the `bots` table on an interval so bots created AFTER
// server boot are picked up automatically (no need to restart the backend).
// ---------------------------------------------------------------------------

const DEFAULT_BOT_ID = process.env.DEFAULT_BOT_ID || "";

// عدد الثواني بين دورات المزامنة (افتراضياً 8 ثوانٍ — ليس سريعاً جداً).
const SYNC_INTERVAL_MS = Math.max(5000, Number(process.env.SYNC_INTERVAL_MS) || 8000);

async function startBotIfNeeded(bot) {
  if (!bot || !bot.id) return;
  if (clients.has(bot.id)) return; // لا ننشئ أكثر من Client لنفس البوت.
  const { LocalAuth } = wwjs;
  let client;
  try {
    console.log(`[WhatsApp] Initializing bot ${bot.id}...`);
    const sessionDir = process.env.WA_SESSION_DIR;
    client = new (wwjs.Client)({
      authStrategy: sessionDir
        ? new LocalAuth({ clientId: bot.id, dataPath: sessionDir })
        : new LocalAuth({ clientId: bot.id }),
      puppeteer: puppeteerOptions(),
    });
    client._qrCache = null;
    client._lastStatus = "connecting";
    client._command = bot.command || "start";
    clients.set(bot.id, client);
    attachListeners(bot.id, client);
    // لا ننتظر هنا—initialize يعمل بتأثير لاحق عبر الأحداث (qr/ready/...).
    await client.initialize();
  } catch (e) {
    console.error(`[WhatsApp:${bot.id}] ❌ Error initializing:`, (e && e.message) || e);
    clearClient(bot.id, client);
    try {
      await updateBotStatus(bot.id, "disconnected");
    } catch {}
  }
}

async function stopBotIfNeeded(bot) {
  if (!bot || !bot.id) return;
  const client = clients.get(bot.id);
  if (!client) return;
  console.log(`[WhatsApp] Stopping bot ${bot.id} (command=${bot.command});`);
  await clearClient(bot.id, client);
  try {
    await updateBotStatus(bot.id, "disconnected");
  } catch {}
}

// البوتات المؤهَّلة للبدء (تمتلك جلسة / ترغب التشغيل).
async function fetchEligibleBots() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("bots")
      .select("id, status, command, link_method, pair_code, qr, linked_number, phone")
      .or(
        `command.eq.start,status.eq.pending,linked_number.not.is.null,status.eq.disconnected`
      );
    if (error) {
      console.error("[WhatsApp] fetch bots failed:", error.message);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("[WhatsApp] fetch bots exception:", e.message);
    return [];
  }
}

// كل البوتات (حتى نعرف أيها يريد الإيقاف/فك الربط).
async function fetchAllBots() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("bots")
      .select("id, status, command, link_method, pair_code, qr, linked_number, phone");
    if (error) {
      console.error("[WhatsApp] fetch all bots failed:", error.message);
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("[WhatsApp] fetch all bots exception:", e.message);
    return [];
  }
}

/** تشغيل كل البوتات المؤهَّلة (مكالمة واحدة عند الإقلاع). */
export async function startAllBots() {
  let bots = [];
  try {
    bots = await fetchEligibleBots();
  } catch (e) {
    console.error("[WhatsApp] startAllBots fetch failed:", e.message);
  }
  if (bots.length === 0 && DEFAULT_BOT_ID) {
    bots = [{ id: DEFAULT_BOT_ID, command: "start", status: "pending" }];
  }
  await Promise.allSettled(bots.map((b) => startBotIfNeeded(b)));
  console.log(`[WhatsApp] Auto-boot finished. Bots in memory: ${[...clients.keys()].length}`);
}

/**
 * دورة مزامنة واحدة:
 *  - يبدأ أي بوت command=start / مؤهَّل ليس قيد التشغيل.
 *  - يوقف/يحذف أي client حالياً لبوت صار command=stop أو unlink.
 */
export async function syncBots() {
  let bots = [];
  try {
    bots = await fetchAllBots();
  } catch (e) {
    console.error("[WhatsApp] syncBots fetch failed:", e.message);
    return;
  }

  // أوقف أولاً البوتات التي أمرها stop/unlink.
  const toStop = bots.filter(
    (b) => clients.has(b.id) && (b.command === "stop" || b.command === "unlink")
  );
  await Promise.allSettled(toStop.map((b) => stopBotIfNeeded(b)));

  // ثم ابدأ المؤهَّلين.
  const toStart = bots.filter(
    (b) => b.command === "start" || b.status === "pending" || (b.link_method === "pair_code" && !b.linked_number)
  );
  await Promise.allSettled(toStart.map((b) => startBotIfNeeded(b)));
}

/**
 * يبدأ حلقة مزامنة دورية غير محظورة، ويعيد مقبضاً بإمكانيات
 * runOnce() (تنفيذ دورة واحدة فوراً) و stop() (إيقاف الحلقة).
 */
export function startSynchronizer() {
  let timer = null;
  const tick = () =>
    syncBots().catch((e) => {
      console.error("[WhatsApp] sync loop error:", e && e.message);
    });
  return {
    runOnce: tick,
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
        console.log("[WhatsApp] synchronizer stopped.");
      }
    },
    start() {
      if (timer) return;
      timer = setInterval(tick, SYNC_INTERVAL_MS);
      console.log(`[WhatsApp] synchronizer started (every ${SYNC_INTERVAL_MS}ms).`);
    },
  };
}

/** Destroy all clients on shutdown. */
export async function shutdownAll(botIds = [...clients.keys()]) {
  await Promise.allSettled(
    botIds.map(async (id) => {
      const c = clients.get(id);
      if (!c) return;
      try {
        await c.destroy();
        c.removeAllListeners();
      } catch {}
    })
  );
  clients.clear();
}
