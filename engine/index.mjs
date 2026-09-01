import {
  makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
  downloadContentFromMessage,
} from "@whiskeysockets/baileys";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import pino from "pino";
import { promisify } from "util";
import { createSupabaseAuthStore } from "./auth-store.mjs";
import { rmSync, readFileSync, writeFileSync } from "fs";
import { execFile } from "child_process";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
} = process.env;

if (!url || !serviceKey) {
  console.error(
    "\n[engine] Missing env vars. Add to .env.local:\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=<service_role key from Supabase > Settings > API>\n" +
      "Then run: node --env-file=.env.local engine/index.mjs\n"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);
const log = pino({ level: "warn" });
const sessions = new Map(); // botId -> { sock, closing }
// أحدث نسخة من بيانات البوتات — تُحدّث كل دورة فحص حتى ترى المعالجات الإعدادات الجديدة
const latestBots = new Map();
// الحالات التي عولجت سابقاً لمنع التكرار
const seenStatuses = new Set();
// آخر وقت تفاعل لكل بوت — حد زمني ضد الحلقات
const lastStatusAction = new Map();
// كاش آخر الرسائل لاستعادة المحذوفات (مضاد الحذف)
const messageCache = new Map(); // msgId -> { m, chat, sender, name, ts }
// ربط هويات LID الجديدة بأرقام الهاتف — تُخزَّن في Supabase (bot_metadata)
const lidMap = new Map();
try {
  const { data } = await supabase.from("bot_metadata").select("lid_map").eq("id", "global").single();
  if (data?.lid_map) {
    for (const [k, v] of Object.entries(data.lid_map)) lidMap.set(k, v);
  }
} catch {}
function saveLidMap() {
  supabase.from("bot_metadata").upsert({
    id: "global",
    lid_map: Object.fromEntries(lidMap),
    updated_at: new Date().toISOString(),
  }).catch(() => {});
}

// تعلم الربط: كل رسالة خاصة تكشف العلاقة بين LID والرقم
function learnLidMapping(m) {
  const chat = m.key.remoteJid || "";
  const part = m.key.participant || "";
  if (!chat.endsWith("@s.whatsapp.net") && !chat.endsWith("@lid")) return;
  if (part.endsWith("@lid")) {
    const digits = part.split("@")[0].split(":")[0];
    if (/^\d+$/.test(digits)) {
      const pn = chat.split(":")[0].split("@")[0] + "@s.whatsapp.net";
      if (lidMap.get(digits) !== pn) {
        lidMap.set(digits, pn);
        saveLidMap();
        console.log(`[lid-map] learned ${digits.slice(-4)} → +${pn.split("@")[0]}`);
      }
    }
  } else if (part.endsWith("@s.whatsapp.net")) {
    // الاتجاه المعاكس: المشارك رقم والمحادثة LID — نستفيد أيضاً
    const chatDigits = chat.split("@")[0].split(":")[0];
    if (/^\d+$/.test(chatDigits)) {
      const pn = part.split(":")[0].split("@")[0] + "@s.whatsapp.net";
      if (lidMap.get(chatDigits) !== pn) {
        lidMap.set(chatDigits, pn);
        saveLidMap();
      }
    }
  }
}

// ترجمة هوية المشارك إلى رقم هاتف معروف إن وُجد الربط
function resolvePn(actor) {
  if (!actor) return null;
  if (actor.endsWith("@s.whatsapp.net")) return actor.split(":")[0];
  if (actor.endsWith("@lid")) {
    const digits = actor.split("@")[0].split(":")[0];
    return lidMap.get(digits) || null;
  }
  return null;
}

async function updateBot(botId, patch) {
  const { error } = await supabase.from("bots").update(patch).eq("id", botId);
  if (error) console.error(`[db] update ${botId}:`, error.message);
}

async function addLog(botId, event, payload = null) {
  await supabase.from("bot_logs").insert({ bot_id: botId, event, payload });
}

function extractText(m) {
  return (
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    ""
  );
}

// كاش روابط القنوات المصدر لإعادة النشر (code -> jid)
const forwardSourceCache = new Map();

// ===== الرد الذكي عبر Gemini أو أي واجهة متوافقة مع OpenAI =====
let aiKeyMissingLogged = false;

// عدّاد الاستخدامات اليومي لمفاتيح Gemini (إعادة تصفير عند تغيّر اليوم)
let geminiCount = 0;
let geminiDay = new Date().toISOString().slice(0, 10);
function rollGeminiDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== geminiDay) {
    geminiDay = today;
    geminiCount = 0;
  }
}

// يختار مفتاح Gemini الأول الصالح من قائمة المفاتيح المدخلة
function activeGeminiKey(cfg) {
  const keys = (cfg.geminiKeys || []).filter((k) => typeof k === "string" && k.trim());
  return keys.length ? keys[0].trim() : null;
}

async function askAI(cfg, userMessage) {
  // 1) محرك Gemini (الأولوية) إذا كانت المفاتيح مكوّنة
  const geminiKey = activeGeminiKey(cfg);
  if (geminiKey) {
    rollGeminiDay();
    // حصة يومية افتراضية (يمكن زيادتها من الإعدادات)
    const dailyQuota = Number(cfg.geminiDailyQuota) || 50;
    if (geminiCount >= dailyQuota) {
      console.warn("[ai][gemini] تم استهلاك الحصة اليومية");
      return "عذراً، استُهلكت حصة اليوم من الذكاء. عد غداً 💀";
    }
    geminiCount += 1;
    return await askGemini(cfg, geminiKey, userMessage);
  }

  // 2) بديل متوافق مع OpenAI (احتياط)
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    if (!aiKeyMissingLogged) {
      console.warn(
        "[ai] لا توجد مفاتيح Gemini ولا OPENAI_API_KEY — الرد الذكي معطّل.\n" +
          "     أضف مفاتيح Gemini من صفحة (محرك الذكاء) أو OPENAI_API_KEY في .env.local"
      );
      aiKeyMissingLogged = true;
    }
    return null;
  }
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.SMART_MODEL || "gpt-4o-mini";
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content:
              "أنت موظف خدمة عملاء ودود تجيب بالعربية بإيجاز واحترافية. " +
              "إذا لم تكن المعلومة موجودة اعتذر بلطف واطلب ترك وسيلة تواصل." +
              (cfg.businessInfo ? `\n\nمعلومات النشاط:\n${cfg.businessInfo}` : ""),
          },
          { role: "user", content: String(userMessage).slice(0, 1500) },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error("[ai]", e.message);
    return null;
  }
}

// ===== محرك Gemini Google =====
async function askGemini(cfg, key, userMessage) {
  const model = cfg.geminiModel || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const systemPrompt =
    cfg.geminiSystemPrompt ||
    "أنت موظف خدمة عملاء ودود تجيب بالعربية بإيجاز واحترافية. إذا لم تكن المعلومة موجودة اعتذر بلطف.";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: String(userMessage).slice(0, 2000) }] }],
        generationConfig: { maxOutputTokens: 300 },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join(" ").trim() || null;
  } catch (e) {
    console.error("[ai][gemini]", e.message);
    return null;
  }
}

// ===== الأوامر النصية داخل واتساب =====
// تحميل محتوى وسائط (صورة/فيديو) وتحويله إلى Buffer
async function downloadMediaBuffer(msg, mediaType) {
  const stream = await downloadContentFromMessage(msg, mediaType);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// تحويل صورة/فيديو إلى ملصق (WebP) — يُرسل كملصق واتساب
async function makeSticker(input, isVideo) {
  try {
    if (isVideo) {
      const tmpIn = `/tmp/stk_${Date.now()}_in.mp4`;
      const tmpOut = `/tmp/stk_${Date.now()}_out.webp`;
      writeFileSync(tmpIn, input);
      try {
        await execFileAsync("ffmpeg", [
          "-y", "-i", tmpIn, "-an",
          "-vf", "fps=15,scale=-2:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0,format=rgba",
          "-c:v", "libwebp_anim", "-loop", "0", "-preset", "picture",
          "-compression_level", "6", tmpOut,
        ], { timeout: 60000, maxBuffer: 1e8 });
        return readFileSync(tmpOut);
      } finally {
        try { rmSync(tmpIn, { force: true }); } catch {}
        try { rmSync(tmpOut, { force: true }); } catch {}
      }
    }
    // صورة ثابتة → ملصق WebP عبر sharp
    const img = sharp(input);
    const meta = await img.metadata();
    const w = meta.width, h = meta.height;
    let sw = w, sh = h;
    if (w !== h) {
      const max = 512;
      if (Math.max(w, h) > max) {
        const r = max / Math.max(w, h);
        sw = Math.round(w * r);
        sh = Math.round(h * r);
      } else { sw = w; sh = h; }
    } else { sw = 512; sh = 512; }
    if (sw % 2) sw += 1;
    if (sh % 2) sh += 1;
    return await sharp(input)
      .resize({ width: sw, height: sh, fit: "cover" })
      .webp({ quality: 90 })
      .toBuffer();
  } catch (e) {
    console.error("[sticker] convert failed:", e.message);
    return null;
  }
}

// يستخرج رسالة الوسائط المستهدفة: إما ردّ على رسالة (quoted) أو رسالة حالية تحمل وسائط
function stickerTarget(m) {
  const ctx = m.message?.extendedTextMessage?.contextInfo;
  if (ctx?.quotedMessage) {
    const q = ctx.quotedMessage;
    if (q.imageMessage) return { msg: q.imageMessage, type: "image" };
    if (q.videoMessage) return { msg: q.videoMessage, type: "video" };
  }
  if (m.message?.imageMessage) return { msg: m.message.imageMessage, type: "image" };
  if (m.message?.videoMessage) return { msg: m.message.videoMessage, type: "video" };
  return null;
}

async function handleCommand(sock, bot, m, raw) {
  const chat = m.key.remoteJid;
  const cmd = raw.trim().split(/\s+/)[0];
  const reply = (t) => sock.sendMessage(chat, { text: t });

  try {
    switch (cmd) {
      case ".menu":
      case ".مساعدة":
      case ".اوامر":
      case ".الأوامر":
        await reply(
          "🤖 *أوامر البوت*\n" +
            "• .menu — هذه القائمة\n" +
            "• .ping — فحص الحيوية\n" +
            "• .وقت — الوقت والتاريخ الآن\n" +
            "• .sticker — حوّل صورة/فيديو إلى ملصق"
        );
        break;
      case ".ping":
        await reply("pong ⚡");
        break;
      case ".وقت":
      case ".time":
        await reply(
          `🕐 ${new Date().toLocaleString("ar", { dateStyle: "full", timeStyle: "short" })}`
        );
        break;
      case ".sticker":
      case ".ملصق":
        {
          const target = stickerTarget(m);
          if (!target) {
            await reply("⚠️ أرسل صورة أو فيديو ثم اكتب .sticker (أو ردّ على الوسائط بكلمة .sticker)");
            break;
          }
          await reply("🔄 جارٍ صناعة الملصق...");
          try {
            const buf = await downloadMediaBuffer(target.msg, target.type);
            const sticker = await makeSticker(buf, target.type === "video");
            if (!sticker) {
              await reply("❌ تعذّر تحويل الوسائط إلى ملصق");
              break;
            }
            await sock.sendMessage(chat, {
              sticker,
              mimetype: "image/webp",
              stickerPackId: "maknoon_" + bot.id.slice(0, 8),
              stickerPackName: "M aknoon",
              stickerAuthor: `M aknoon bot`,
            });
            await addLog(bot.id, "sticker_made", { type: target.type });
          } catch (e) {
            console.error("[sticker] failed:", e.message);
            await reply("❌ فشل صناعة الملصق (قد تكون الوسائط كبيرة جداً)");
          }
        }
        break;
      case ".رصيد":
        // للأمان: يظهر الرصيد فقط في محادثة "مراسلة نفسك"
        if (chat.split(":")[0] === String(sock.user?.id || "").split(":")[0]) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("wallet_balance")
            .eq("id", bot.user_id)
            .single();
          await reply(`💰 رصيدك: ${prof?.wallet_balance ?? 0} كريدت`);
        }
        break;
      default:
        await reply("أمر غير معروف — اكتب .menu للقائمة");
    }
    await addLog(bot.id, "command_used", { cmd, chat });
  } catch (e) {
    console.error("[command]", e.message);
  }
}

// ===== جدار الحماية والكلمات المحظورة: فحص الرسائل في المجموعات =====
function extractDomains(text) {
  const found = new Set();
  const re = /(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?:\/\S*)?/gi;
  let hit;
  while ((hit = re.exec(text))) {
    const host = hit[1].toLowerCase().replace(/^\.+|\.+$/g, "");
    if (/\./.test(host)) found.add(host);
  }
  return [...found];
}

// يعيد { blockedDomains, bannedWords } للمجموعة الواردة (يستخدم إعدادات عامة للبوت الآن)
function getEnforcement(cfg, settingsOwner) {
  return {
    domains: Array.isArray(cfg.firewallDomains) ? cfg.firewallDomains : [],
    words: Array.isArray(cfg.bannedWords) ? cfg.bannedWords : [],
    enabledDomains: !!cfg.firewallOn,
    enabledWords: !!cfg.dictionaryOn,
    ownerJid: settingsOwner,
  };
}

function isOwnerJid(jid, ownerJid) {
  if (!ownerJid) return false;
  const digits = String(jid || "").split(":")[0].split("@")[0].replace(/\D/g, "");
  const owner = String(ownerJid || "").split(":")[0].split("@")[0].replace(/\D/g, "");
  return !!digits && digits === owner;
}

// فحص رسالة مجموعة: إذا خالفت جدار الحماية أو القاموس تُحذف (+ يكون أدير مسؤولاً)
async function enforceSecurity(sock, bot, m, cfg) {
  try {
    const chat = m.key.remoteJid || "";
    const text = extractText(m) || "";
    if (!chat.endsWith("@g.us")) return false;

    const sender = m.key.participant || m.participant || "";
    if (isOwnerJid(sender, bot.linked_number)) return false; // لا نمسّ مالك البوت

    const enforcement = getEnforcement(cfg, bot.linked_number);
    let violated = false;
    let reason = "";

    // 0) مكافحة الإشارة: منع الإشارة (لأي شخص أو لكل @) في المجموعات
    if (cfg.antiMention) {
      const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      const hasAt =
        /\B@\d{7,}/.test(text) || (Array.isArray(mentions) && mentions.length > 0);
      if (hasAt) {
        violated = true;
        reason = "إشارة محظورة";
      }
    }

    // 1) دومينات محظورة في الروابط
    if (!violated && enforcement.enabledDomains && enforcement.domains.length) {
      const domains = extractDomains(text);
      for (const d of domains) {
        if (enforcement.domains.includes(d)) {
          violated = true;
          reason = `رابط محظور (${d})`;
          break;
        }
      }
    }

    // 2) كلمات محظورة
    if (!violated && enforcement.enabledWords && enforcement.words.length) {
      for (const w of enforcement.words) {
        if (text.includes(w)) {
          violated = true;
          reason = `كلمة محظورة`;
          break;
        }
      }
    }

    if (!violated) return false;

    // إزالة الرسالة المخالفة
    await sock.sendMessage(chat, { delete: m.key });
    await sock.sendMessage(
      chat,
      { text: `🚫 ${reason} — الرسالة حُذفت أتوماتيكياً.` },
      { ephemeralExpiration: 60 }
    );
    console.log(`[security] blocked ${reason} from ${sender} in ${chat}`);
    await addLog(bot.id, "security_blocked", { jid: chat, reason, from: sender });
    return true;
  } catch (e) {
    console.error("[security]", e.message);
    return false;
  }
}

async function startSession(bot, version) {
  if (sessions.has(bot.id)) return;
  console.log(`[session] starting ${bot.name} (${bot.id})`);
  const { state, saveCreds } = await createSupabaseAuthStore(bot.id);

  const sock = makeWASocket({
    version,
    auth: state,
    logger: log,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
  });

  sessions.set(bot.id, { sock, botPhone: bot.phone });

  // توليد كلا الطريقين معاً: QR + كود الاقتران، ويظهران معاً في الصفحة.
  // أيّهما ينجح به المستخدم يُكمل الربط؛ والقيمان يبقيا محفوظين حتى لا يختفي أحدهما.
  let pairCodeSent = false;
  let qrSaved = false;

  sock.ev.on("creds.update", saveCreds);

  // طلب كود الاقتران مرة واحدة فقط (لا تكرار يسبب حظر واتساب)
  if (bot.phone && !state.creds.registered && !bot.pair_code) {
    setTimeout(async () => {
      try {
        if (!pairCodeSent) {
          pairCodeSent = true;
          const digits = String(bot.phone).replace(/\D/g, "");
          console.log(`[session] requesting pairing code for ${bot.name} (+${digits})...`);
          const code = await sock.requestPairingCode(digits);
          await updateBot(bot.id, { pair_code: code, status: "pending" });
          console.log(`[session] pair code for ${bot.name}: ${code}`);
        }
      } catch (err) {
        console.error(`[session] pair code error for ${bot.name}:`, err.message);
        pairCodeSent = false;
      }
    }, 2000);
  }

  sock.ev.on("connection.update", async (u) => {
    try {
      if (u.qr && !qrSaved) {
        qrSaved = true;
        const dataUrl = await QRCode.toDataURL(u.qr, { width: 320 });
        await updateBot(bot.id, { qr: dataUrl, status: "pending" });
        console.log(`[session] QR generated for ${bot.name}`);
      }

      if (u.connection === "open") {
        const number = sock.user?.id?.split(":")[0]?.split("@")[0];
        await updateBot(bot.id, {
          status: "connected",
          qr: null,
          pair_code: null,
          linked_number: number ?? bot.phone,
        });
        await addLog(bot.id, "connected");
        console.log(`[session] ${bot.name} connected as +${number}`);
        // جاهزية الجلسة: لا ننفذ مهام (متابعة قنوات) قبل اكتمال الاتصال
        const entry = sessions.get(bot.id);
        if (entry) entry.ready = true;

        // إبقاء البوت "متصل" — تحديث الحالة الذاتية كل 20 ثانية
        const keepOnline = () => {
          const cur = latestBots.get(bot.id)?.settings || {};
          if (cur.showOnline) {
            sock
              .sendPresenceUpdate("available", "s.whatsapp.net")
              .catch(() => {});
          }
        };
        keepOnline();
        setInterval(keepOnline, 20000);

        // الاشتراك في الحالات: يجلب الستوري الحالي ويضمن وصول الجديد
        // مع 3 محاولات إعادة لأن الشبكة أحياناً بطيئة عند الاتصال
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await sock.query({
              tag: "iq",
              attrs: { to: "status@broadcast", type: "get", xmlns: "status" },
              content: [{ tag: "status", attrs: {} }],
            });
            console.log("[session] subscribed to status broadcasts");
            break;
          } catch (e) {
            console.warn(
              `[session] status subscribe failed (attempt ${attempt}/3):`,
              e.message
            );
            if (attempt < 3) await new Promise((r) => setTimeout(r, 3000));
          }
        }

        // ===== رسالة الربط والخصائص (الخطوة الحرجة): تُرسل للرابط بعد نجاح الربط =====
        try {
          // كلمة سر فريدة تُخزَّن في settings (بدون تعديل مخطط قاعدة البيانات)
          const cur = latestBots.get(bot.id)?.settings || {};
          let secret = cur.secret;
          if (!secret) {
            secret =
              "KPX-" +
              Array.from({ length: 4 }, () => "0123456789"[Math.floor(Math.random() * 10)]).join("");
            await updateBot(bot.id, {
              settings: { ...cur, secret },
            });
            console.log(`[session] generated secret for ${bot.name}: ${secret}`);
          }
          const appUrl =
            (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "") + "/setting";
          const self = sock.user?.id;
          if (self) {
            await sock.sendMessage(self, {
              text:
                `🛡️ *تم ربط البوت بنجاح!*\n\n` +
                `رقمك متصل: +${number}\n\n` +
                `🔑 كلمة السر الخاصة بك:\n` +
                `_${secret}_\n\n` +
                `🔗 رابط الخصائص والإعدادات:\n` +
                `${appUrl}\n\n` +
                `استخدم رقمك وكلمة السر للدخول إلى إعداداتك.`,
            });
            console.log(`[session] sent settings secret message to +${number}`);
          }
        } catch (e) {
          console.error("[session][secret-msg]", e.message);
        }
      }

      if (u.connection === "close") {
        const code = u.lastDisconnect?.error?.output?.statusCode;
        const reasonTag = u.lastDisconnect?.error?.output?.payload?.tag
          || u.lastDisconnect?.error?.message
          || code;
        sessions.delete(bot.id);
        console.log(`[session] ${bot.name} closed (code=${code}) ${reasonTag}`);
        if (code === DisconnectReason.loggedOut) {
          await saveCreds({});
          await updateBot(bot.id, {
            status: "disconnected",
            command: "stop",
            qr: null,
            linked_number: null,
          });
          await addLog(bot.id, "logged_out");
          console.log(`[session] ${bot.name} logged out`);
        } else {
          // transient drop — keep the QR visible so the user can still scan it.
          // main loop will restart while command=start and a fresh QR will overwrite it.
          await updateBot(bot.id, { status: "disconnected" });
        }
      }
    } catch (e) {
      console.error("[conn handler]", e.message);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    for (const m of messages) {
      try {
        const isStatus = m.key.remoteJid === "status@broadcast";

        // تسجيل تشخيصي مؤقت: يظهر كل حالة تصل بتفاصيلها
        if (isStatus) {
          console.log(
            `[status] event (${type}) from=${m.key.participant || "?"} id=${(m.key.id || "").slice(0, 8)} fromMe=${m.key.fromMe} msgKeys=${Object.keys(m.message || {}).join(",") || "EMPTY"}`
          );
        }

        if (!m.message && !isStatus) continue;

        // ===== مضاد الحذف: تخزين الرسائل الواردة ذات المحتوى =====
        const pmsg = m.message?.protocolMessage;
        if (!isStatus && m.message && !pmsg) {
          const contentKeys = [
            "imageMessage", "videoMessage", "audioMessage",
            "conversation", "extendedTextMessage",
            "documentMessage", "stickerMessage",
            "contactMessage", "locationMessage",
          ];
          const contentKey = contentKeys.find((k) => m.message[k]);
          if (contentKey) {
            messageCache.set(m.key.id, {
              m,
              chat: m.key.remoteJid,
              sender: m.key.participant || m.key.remoteJid,
              name: m.pushName || "",
              ts: Date.now(),
            });
            console.log(`[cache] stored ${(m.key.id || "").slice(0, 10)} (${contentKey})`);
            if (messageCache.size > 1500) {
              const oldest = messageCache.keys().next().value;
              messageCache.delete(oldest);
            }
          }
        }

        // ===== استرجاع رسالة حُذفت عند الكل وإرسالها لمراسلة نفسك =====
        if (!isStatus && pmsg) {
          // تشخيص: كل رسالة بروتوكول تُطبع لنرى نوعها الفعلي
          console.log(
            `[antidelete] protocol type=${pmsg.type} (${typeof pmsg.type}) target=${(pmsg.key?.id || "").slice(0, 10)} fromMe=${m.key.fromMe}`
          );
          const isRevoke = pmsg.type === 0 || pmsg.type === "REVOKE";
          if (isRevoke && !m.key.fromMe) {
            const cfgAD = latestBots.get(bot.id)?.settings || {};
            if (cfgAD.antiDelete !== false) {
              const orig = pmsg.key?.id ? messageCache.get(pmsg.key.id) : null;
              if (orig) {
                try {
                  const label = orig.chat.endsWith("@g.us")
                    ? "مجموعة"
                    : `محادثة ${orig.chat.split("@")[0]}`;
                  await sock.sendMessage(sock.user.id, {
                    text: `🗑️ *رسالة محذوفة*\nمن: ${orig.name || orig.sender}\nفي: ${label}`,
                  });
                  await sock.sendMessage(sock.user.id, { forward: orig.m });
                  console.log(`[antidelete] recovered ${pmsg.key.id}`);
                  await addLog(bot.id, "message_recovered", { sender: orig.sender });
                } catch (e) {
                  console.error("[antidelete] failed:", e.message);
                }
                messageCache.delete(pmsg.key.id);
              } else {
                console.warn("[antidelete] original NOT in cache — was it sent before restart?");
              }
            } else {
              console.log("[antidelete] disabled in settings");
            }
          }
          continue;
        }

        // ===== كشف النظرة الواحدة: حفظ نسخة دائمة في مراسلة نفسك =====
        if (!isStatus && !m.key.fromMe) {
          const inner =
            m.message?.viewOnceMessage?.message ||
            m.message?.viewOnceMessageV2?.message ||
            m.message?.viewOnceMessageV2Extension?.message ||
            m.message?.ephemeralMessage?.message?.viewOnceMessageV2?.message;

          if (
            inner &&
            latestBots.get(bot.id)?.settings?.antiViewOnce === false
          ) {
            console.log("[viewonce] received but DISABLED in settings");
          }

          if (
            inner &&
            latestBots.get(bot.id)?.settings?.antiViewOnce !== false
          ) {
            try {
              const type = Object.keys(inner).find((k) =>
                ["imageMessage", "videoMessage", "audioMessage"].includes(k)
              );
              if (type) {
                const mediaType = type.replace("Message", "");
                const stream = await downloadContentFromMessage(
                  inner[type],
                  mediaType
                );
                const chunks = [];
                for await (const chunk of stream) chunks.push(chunk);
                const buffer = Buffer.concat(chunks);

                const senderName =
                  m.pushName || m.key.participant || m.key.remoteJid;
                const header = `👁️ *نظرة واحدة* من ${senderName}`;

                if (mediaType === "image") {
                  await sock.sendMessage(sock.user.id, {
                    image: buffer,
                    caption: inner[type].caption
                      ? `${header}\n\n${inner[type].caption}`
                      : header,
                  });
                } else if (mediaType === "video") {
                  await sock.sendMessage(sock.user.id, { text: header });
                  await sock.sendMessage(sock.user.id, {
                    video: buffer,
                    caption: inner[type].caption || undefined,
                  });
                } else {
                  await sock.sendMessage(sock.user.id, { text: header });
                  await sock.sendMessage(sock.user.id, {
                    audio: buffer,
                    ptt: !!inner[type].ptt,
                    mimetype: inner[type].mimetype,
                  });
                }

                console.log(`[viewonce] saved ${mediaType} from ${senderName}`);
                await addLog(bot.id, "view_once_saved", {
                  from: String(senderName),
                  type: mediaType,
                });
              }
            } catch (e) {
              console.error("[viewonce] failed:", e.message);
            }
          }
        }

        // ===== معالجة الحالات / الستوري =====
        if (isStatus) {
          const cfg = latestBots.get(bot.id)?.settings || {};

          // 1) تجاهل حالات البوت نفسه تماماً (يمنع حلقة التفاعل اللانهائية)
          //    نطابق كل هوياتنا الممكنة: رقم PN + رقم LID + الرقم المسجل في البوت
          const selfIds = new Set();
          for (const src of [
            sock.user?.id,
            sock.user?.lid,
            bot.linked_number ? `${bot.linked_number}@s.whatsapp.net` : null,
            bot.phone ? `${String(bot.phone).replace(/\D/g, "")}` : null,
          ]) {
            if (!src) continue;
            const digits = String(src).split(":")[0].split("@")[0].replace(/\D/g, "");
            if (digits) selfIds.add(digits);
          }
          const actor =
            m.key.participant || m.participant || "";
          const actorDigits = actor.split("@")[0].replace(/\D/g, "");

          if (
            m.key.fromMe ||
            (actorDigits && selfIds.has(actorDigits)) ||
            (m.key.id && [...selfIds].some((d) => m.key.id.startsWith(d)))
          ) {
            console.log(`[status] skip: own status (${actor})`);
            continue;
          }

          if (!actor) {
            console.log(`[status] skip: no actor, keys=${Object.keys(m.message || {}).join(",") || "EMPTY"}`);
            continue;
          }

          // 2) نريد حالات فيها محتوى فعلي (صورة/فيديو/نص/صوت)
          const msg = m.message || {};
          const contentKey = Object.keys(msg).find((k) =>
            [
              "imageMessage", "videoMessage", "audioMessage",
              "conversation", "extendedTextMessage",
              "documentMessage", "stickerMessage", "viewOnceMessage",
            ].includes(k)
          );
          if (!contentKey) {
            console.log(
              `[status] skip: no content from ${actor} | messageKeys=${Object.keys(msg).join(",") || "EMPTY"} | stub=${m.messageStubType ?? "-"}`
            );
            continue;
          }

          // 3) منع المعالجة المكررة لنفس الحالة
          const sig = `${bot.id}:${actor}:${m.key.id}`;
          if (seenStatuses.has(sig)) continue;
          seenStatuses.add(sig);
          if (seenStatuses.size > 800) {
            const first = seenStatuses.values().next().value;
            seenStatuses.delete(first);
          }

          // 4) حد زمني: تفاعل واحد كل ثانيتين كحد أقصى لكل بوت
          const now = Date.now();
          const last = lastStatusAction.get(bot.id) || 0;
          if (now - last < 2000) {
            console.log(`[status] skip: rate-limit (${actor})`);
            continue;
          }
          lastStatusAction.set(bot.id, now);

          console.log(
            `[status] processing from ${actor} type=${contentKey} view=${!!cfg.autoViewStatus} react=${cfg.autoReactStatus ? cfg.reactEmoji : "off"}`
          );

          let acted = false;

          // مشاهدة الحالة
          if (cfg.autoViewStatus) {
            try {
              await sock.readMessages([m.key]);
              acted = true;
            } catch (e) {
              console.error("[status] read failed:", e.message);
            }
          }

          // تفاعل على الحالة (قلب أو غيره)
          // نجرب الصيغ بالترتيب حتى تظهر: الرقم المعروف أولاً ثم هوية LID
          if (cfg.autoReactStatus && cfg.reactEmoji) {
            const pn = resolvePn(actor);
            const variants = [];
            if (pn) {
              variants.push({
                label: `pn-broadcast (+${pn.split("@")[0]})`,
                to: "status@broadcast",
                key: {
                  remoteJid: m.key.remoteJid,
                  id: m.key.id,
                  fromMe: false,
                  participant: pn,
                },
              });
              variants.push({
                label: `pn-direct (+${pn.split("@")[0]})`,
                to: pn,
                key: {
                  remoteJid: m.key.remoteJid,
                  id: m.key.id,
                  fromMe: false,
                  participant: pn,
                },
              });
            }
            variants.push({
              label: "lid-direct",
              to: actor,
              key: {
                remoteJid: m.key.remoteJid,
                id: m.key.id,
                fromMe: false,
                participant: actor,
              },
            });
            variants.push({
              label: "lid-broadcast",
              to: "status@broadcast",
              key: {
                remoteJid: m.key.remoteJid,
                id: m.key.id,
                fromMe: false,
                participant: actor,
              },
            });

            let sentAny = false;
            for (const v of variants) {
              try {
                await sock.sendMessage(v.to, { react: { text: cfg.reactEmoji, key: v.key } });
                sentAny = true;
                console.log(`[status] reacted (${v.label}) ${cfg.reactEmoji}`);
                break; // أول صيغة ناجحة تكفي
              } catch (e) {
                console.warn(`[status] react ${v.label} failed: ${e.message}`);
              }
            }
            if (!sentAny) console.error("[status] كل محاولات التفاعل فشلت");
            acted = sentAny;
          }

          if (acted) {
            await addLog(bot.id, "status_handled", {
              from: actor,
              viewed: !!cfg.autoViewStatus,
              reacted: cfg.autoReactStatus ? cfg.reactEmoji : null,
            });
          }
          continue;
        }

        const cfg = latestBots.get(bot.id)?.settings || {};

        if (m.key.fromMe) continue;

        // ===== تطبيق جدار الحماية والكلمات المحظورة على المجموعات =====
        if (m.key.remoteJid.endsWith("@g.us")) {
          const blocked = await enforceSecurity(sock, bot, m, cfg);
          if (blocked) continue;
        }

        // تعلم ربط LID ↔ رقم الهاتف من كل رسالة واردة
        learnLidMapping(m);

        // ===== إعادة النشر التلقائي: من قناة مصدر إلى مجموعات =====
        if (cfg.autoForward && cfg.forwardSource && cfg.forwardTargets) {
          try {
            let sourceJid = String(cfg.forwardSource).trim();
            if (/whatsapp\.com\/channel\//.test(sourceJid)) {
              const code = sourceJid.split("/").filter(Boolean).pop();
              if (!forwardSourceCache.has(code)) {
                const meta = await sock.newsletterMetadata("invite", code);
                if (meta?.id) forwardSourceCache.set(code, meta.id);
              }
              sourceJid = forwardSourceCache.get(code) || sourceJid;
            }
            if (m.key.remoteJid === sourceJid) {
              const text = extractText(m);
              if (text) {
                const targets = String(cfg.forwardTargets)
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                for (const t of targets) {
                  await sock.sendMessage(t, { text });
                }
                console.log(`[forward] reposted to ${targets.length} target(s)`);
                await addLog(bot.id, "auto_forwarded", { to: targets });
              }
              continue;
            }
          } catch (e) {
            console.error("[forward]", e.message);
          }
        }

        // ===== الأوامر النصية =====
        const incomingText = extractText(m).trim();
        if (incomingText.startsWith(".")) {
          await handleCommand(sock, bot, m, incomingText);
          continue;
        }

        // Auto react
        if (cfg.autoReact && cfg.reactEmoji) {
          await sock.sendMessage(m.key.remoteJid, {
            react: { text: cfg.reactEmoji, key: m.key },
          });
        }

        // ===== الردود: الذكي أولاً ثم الثابت — للمحادثات الخاصة فقط =====
        const isPrivateChat =
          m.key.remoteJid.endsWith("@s.whatsapp.net") ||
          m.key.remoteJid.endsWith("@lid");
        if (incomingText && isPrivateChat && !m.key.remoteJid.includes("-")) {
          // وضع العمل: تحديد من يمكنه تفعيل الردود
          const senderDigits = String(m.key.participant || m.key.remoteJid)
            .split(":")[0].split("@")[0].replace(/\D/g, "");
          const ownerDigits = String(bot.linked_number)
            .split(":")[0].split("@")[0].replace(/\D/g, "");
          let canReply = true;
          if (cfg.workMode === "restricted") {
            canReply = !!senderDigits && senderDigits === ownerDigits;
          } else if (cfg.workMode === "inbox") {
            canReply = !m.key.remoteJid.endsWith("@lid");
          }
          if (canReply) {
            if (cfg.smartReply) {
              const answer = await askAI(cfg, incomingText);
              if (answer) {
                await sock.sendMessage(m.key.remoteJid, { text: answer });
                await addLog(bot.id, "smart_replied", { to: m.key.remoteJid });
                console.log(`[ai] smart reply sent to ${m.key.remoteJid}`);
              }
            } else if (cfg.autoReply && cfg.autoReplyMessage) {
              await sock.sendMessage(m.key.remoteJid, {
                text: cfg.autoReplyMessage,
              });
              await addLog(bot.id, "auto_replied", { to: m.key.remoteJid });
            }
          }
        }

        // Contact auto-save (log new contacts)
        if (cfg.contactAutoSave) {
          await addLog(bot.id, "contact_seen", { jid: m.key.remoteJid });
        }
      } catch (e) {
        console.error("[msg handler]", e.message);
      }
    }
  });

  sock.ev.on("messages.update", async (updates) => {
    for (const u of updates) {
      try {
        const cfg = latestBots.get(bot.id)?.settings || {};
        const stub = u.update?.messageStubType;

        // مكافحة التعديل: رسالة غُيّرت نصها في مجموعة → تُحذف
        if (u.update?.editedMessage && u.key.remoteJid?.endsWith("@g.us") && cfg.antiEdit) {
          const sender = u.key.participant || u.key.fromMe ? sock.user?.id : "";
          const selfDigits = String(sock.user?.id || "").split(":")[0].split("@")[0];
          const sDigits = String(sender || "").split(":")[0].split("@")[0];
          if (sDigits !== selfDigits) {
            await sock.sendMessage(u.key.remoteJid, { delete: u.key });
            console.log(`[antiEdit] deleted edited msg in ${u.key.remoteJid}`);
            await addLog(bot.id, "edited_message_deleted", { jid: u.key.remoteJid });
          }
        }

        // 2 = REVOKE (message deleted for everyone)
        // Baileys يحوّل أي حذف للجميع إلى messages.update وليس إلى protocolMessage،
        // لذلك الاسترجاع الفعلي من كاش الرسائل يجب أن يتم هنا وليس في مسار upsert.
        if (stub === 2 && cfg.antiDelete !== false) {
          const orig = u.key?.id ? messageCache.get(u.key.id) : null;
          if (orig) {
            try {
              const label = orig.chat.endsWith("@g.us")
                ? "مجموعة"
                : `محادثة ${orig.chat.split("@")[0]}`;
              await sock.sendMessage(sock.user.id, {
                text: `🗑️ *رسالة محذوفة*\nمن: ${orig.name || orig.sender}\nفي: ${label}`,
              });
              await sock.sendMessage(sock.user.id, { forward: orig.m });
              messageCache.delete(u.key.id);
              console.log(`[antidelete] recovered ${u.key.id} (update path)`);
              await addLog(bot.id, "message_recovered", { id: u.key.id });
            } catch (e) {
              console.error("[antidelete] update recover failed:", e.message);
            }
          } else {
            console.log(
              `[antidelete] update REVOKE orig NOT in cache for ${(u.key.id || "").slice(0, 10)}`
            );
          }
          await addLog(bot.id, "message_deleted", {
            jid: u.key.remoteJid,
            id: u.key.id,
          });
        }
      } catch (e) {
        console.error("[update handler]", e.message);
      }
    }
  });

  // ===== رفض المكالمات تلقائياً (حسب الإعداد) =====
  sock.ev.on("call", async (calls) => {
    try {
      const cfg = latestBots.get(bot.id)?.settings || {};
      if (!cfg.rejectCalls) return;
      for (const c of calls) {
        if (c.status === "offer") {
          await sock.rejectCall(c.id, c.from);
          await addLog(bot.id, "call_rejected", { from: c.from });
          console.log(`[call] rejected from ${c.from}`);
        }
      }
    } catch (e) {
      console.error("[call handler]", e.message);
    }
  });

  // ===== الترحيب والوداع في المجموعات =====
  sock.ev.on("group-participants.update", async ({ id, action, participants }) => {
    try {
      if (!Array.isArray(participants) || !participants.length) return;
      const cfg = latestBots.get(bot.id)?.settings || {};
      const isAdd = action === "add";
      const isRemove = action === "remove";
      if (!isAdd && !isRemove) return;
      if (isAdd && !cfg.welcomeGroups) return;
      if (isRemove && !cfg.farewellGroups) return;

      for (const p of participants) {
        const template = isAdd
          ? cfg.welcomeMessage || "أهلاً بك {user} في المجموعة 👋"
          : cfg.farewellMessage || "وداعاً {user} 👋";
        const text = String(template).replaceAll("{user}", `@${p.split("@")[0]}`);
        await sock.sendMessage(id, { text, mentions: [p] });
      }
      console.log(`[group] ${action} x${participants.length} in ${id}`);
      await addLog(bot.id, isAdd ? "member_welcomed" : "member_farewell", {
        group: id,
        count: participants.length,
      });
    } catch (e) {
      console.error("[group handler]", e.message);
    }
  });
}

async function stopSession(botId, unlink = false) {
  const entry = sessions.get(botId);
  if (!entry) {
    if (unlink) await updateBot(botId, { command: "stop", status: "disconnected", linked_number: null, qr: null });
    return;
  }
  sessions.delete(botId);
  try {
    if (unlink) {
      await entry.sock.logout();
      await updateBot(botId, { command: "stop", status: "disconnected", linked_number: null, qr: null });
    } else {
      entry.sock.end(undefined);
      await updateBot(botId, { status: "disconnected", linked_number: null, qr: null });
    }
  } catch {
    /* already closed */
  }
}

let version;
try {
  ({ version } = await fetchLatestBaileysVersion());
} catch {
  console.warn("[engine] using default WA version");
}

console.log("[engine] running — polling every 3s");

setInterval(async () => {
  try {
    const { data: bots, error } = await supabase
      .from("bots")
      .select("*");
    if (error) {
      console.error("[poll]", error.message);
      return;
    }

    // تحديث الكاش حتى ترى المعالجات الجارية الإعدادات الجديدة فوراً
    for (const b of bots) latestBots.set(b.id, b);

    for (const bot of bots) {
      if (bot.command === "unlink" && !sessions.has(bot.id)) {
        await updateBot(bot.id, {
          command: "stop",
          status: "disconnected",
          linked_number: null,
          qr: null,
        });
        continue;
      }
      if (bot.command === "start" && !sessions.has(bot.id)) {
        await startSession(bot, version);
      }
      if (bot.command === "stop" && sessions.has(bot.id)) {
        await stopSession(bot.id);
        await updateBot(bot.id, { status: "disconnected", qr: null });
      }
    }

    // ===== المنشورات المجدولة المستحقة الآن =====
    const { data: duePosts } = await supabase
      .from("scheduled_posts")
      .select("*")
      .eq("status", "pending")
      .lte("run_at", new Date().toISOString())
      .limit(10);

    for (const post of duePosts ?? []) {
      const pEntry = sessions.get(post.bot_id);
      const psock = pEntry?.sock;
      if (!psock?.user || !pEntry.ready) continue; // ننتظر اتصالاً كاملاً
      try {
        if (post.kind === "message" && post.target) {
          await psock.sendMessage(post.target, { text: post.body });
        } else {
          await psock.sendMessage("status@broadcast", { text: post.body });
        }
        await supabase
          .from("scheduled_posts")
          .update({ status: "sent" })
          .eq("id", post.id);
        console.log(`[schedule] sent ${post.kind} (${post.id.slice(0, 8)})`);
        await addLog(post.bot_id, "scheduled_sent", { kind: post.kind });
      } catch (e) {
        const transient = /connection closed|timed out|stream errored/i.test(
          e.message
        );
        if (!transient) {
          await supabase
            .from("scheduled_posts")
            .update({ status: "failed", error: e.message })
            .eq("id", post.id);
        }
        console.error(`[schedule] ${transient ? "retry later" : "failed"}:`, e.message);
      }
    }

    // ===== مهام متابعة القنوات عبر الرابط =====
    const { data: follows } = await supabase
      .from("channel_follows")
      .select("*")
      .eq("status", "pending")
      .limit(10);

    for (const f of follows ?? []) {
      const sessionEntry = sessions.get(f.bot_id);
      const sock = sessionEntry?.sock;
      // ننتظر اتصالاً مكتمل فعلياً — وإلا تبقى المهمة معلقة للمحاولة لاحقاً
      if (!sock?.user || !sessionEntry.ready) continue;
      try {
        const code = String(f.link).trim().split("/").filter(Boolean).pop();
        const meta = await sock.newsletterMetadata("invite", code);
        if (!meta?.id) throw new Error("لم يتم العثور على القناة");
        await sock.newsletterFollow(meta.id);
        const subs =
          meta.subscribers != null ? parseInt(meta.subscribers, 10) || null : null;
        await supabase
          .from("channel_follows")
          .update({
            status: "done",
            channel_jid: meta.id,
            channel_name: meta.name,
            subscribers: subs,
            error: null,
          })
          .eq("id", f.id);
        console.log(`[follow] done: ${meta.name} (${meta.id})`);
        await addLog(f.bot_id, "channel_followed", { name: meta.name, jid: meta.id });
      } catch (e) {
        // الأخطاء العابرة (اتصال ضعيف/مهلة) → نبقها معلقة لإعادة المحاولة تلقائياً
        const transient = /connection closed|timed out|stream errored|connection replaced/i.test(
          e.message
        );
        await supabase
          .from("channel_follows")
          .update({ status: transient ? "pending" : "failed", error: e.message })
          .eq("id", f.id);
        console.error(`[follow] ${transient ? "retry later" : "failed"}:`, e.message);
      }
    }

    // ===== رموز التحقق (OTP) — إرسالها من جلسة بوت النظام (MOH) =====
    const { data: otps, error: otpErr } = await supabase
      .from("notify_queue")
      .select("*")
      .eq("status", "pending")
      .limit(10);
    if (otpErr) {
      // الجدول قد لا يكون موجوداً بعد — نتجاهل بهدوء
      if (!/does not exist/i.test(otpErr.message))
        console.error("[otp] poll", otpErr.message);
    } else {
      const MOH_NUMBER = (process.env.OTP_SENDER_NUMBER || "967712343137").replace(/\D/g, "");
      for (const q of otps ?? []) {
        let sender = null;

        // 1) البوت المبين في queue (إن وجد ومتصل)
        if (q.bot_id) {
          const entry = sessions.get(q.bot_id);
          if (entry?.sock?.user && entry.ready) sender = { botId: q.bot_id, sock: entry.sock };
        }

        // 2) بوت النظام MOH (الرقم الثاني) إن متصل — هو المرسل الأساسي
        if (!sender) {
          for (const [botId, entry] of sessions.entries()) {
            const nums = [entry.sock?.user?.id, entry.botPhone].filter(Boolean).join(" ");
            if ((entry?.sock?.user && entry.ready) && (entry.botPhone || "").replace(/\D/g, "") === MOH_NUMBER) {
              sender = { botId, sock: entry.sock };
              break;
            }
          }
        }

        // 3) أي بوت متصل
        if (!sender) {
          for (const [botId, entry] of sessions.entries()) {
            if (entry?.sock?.user && entry.ready) {
              sender = { botId, sock: entry.sock };
              break;
            }
          }
        }

        if (!sender) continue; // ننتظر اتصالاً كاملاً
        try {
          const digits = String(q.to_number ?? "").replace(/\D/g, "");
          const jid = digits.includes("@") ? digits : `${digits}@s.whatsapp.net`;
          await sender.sock.sendMessage(jid, { text: q.message });
          await supabase
            .from("notify_queue")
            .update({ status: "sent", bot_id: sender.botId })
            .eq("id", q.id);
          console.log(`[otp] sent to ${digits}`);
        } catch (e) {
          const transient = /connection closed|timed out|stream errored/i.test(e.message);
          await supabase
            .from("notify_queue")
            .update({ status: transient ? "pending" : "failed", error: e.message })
            .eq("id", q.id);
          console.error(`[otp] ${transient ? "retry later" : "failed"}:`, e.message);
        }
      }
    }
  } catch (e) {
    console.error("[loop]", e.message);
  }
}, 3000);
