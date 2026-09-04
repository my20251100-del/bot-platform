import {
  makeWASocket,
  fetchLatestWaWebVersion,
  Browsers,
  DisconnectReason,
  downloadContentFromMessage,
  jidNormalizedUser,
} from "@whiskeysockets/baileys";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import pino from "pino";
import { promisify } from "util";
import { rmSync, readFileSync, writeFileSync, existsSync } from "fs";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { createSupabaseAuthStore } from "./auth-store.mjs";
let sharp = null;
try {
  const sharpMod = await import("sharp");
  sharp = sharpMod.default || sharpMod;
} catch {
  // sharp غير متوفر في بيئات مثل Termux (Android)
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// قراءة ملفات البيئة تلقائياً بدون الحاجة لأي ملفات إضافية
for (const envFile of [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, ".env.local"),
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "..", ".env.local"),
  path.resolve(__dirname, "..", ".env"),
]) {
  try {
    if (existsSync(envFile)) {
      const content = readFileSync(envFile, "utf8");
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq <= 0) continue;
        const k = line.slice(0, eq).trim();
        let v = line.slice(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (process.env[k] === undefined || process.env[k] === "") {
          process.env[k] = v;
        }
      }
    }
  } catch {}
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || "";

const execFileAsync = promisify(execFile);

if (!url || !serviceKey) {
  console.error(
    "\n======================================================\n" +
      "❌ [engine] Missing Supabase environment variables!\n" +
      "   بيانات Supabase غير موجودة في ملف البيئة.\n" +
      "   تأكد من وجود ملف .env أو .env.local يحتوي على:\n" +
      "   SUPABASE_URL=https://xxxx.supabase.co (أو NEXT_PUBLIC_SUPABASE_URL)\n" +
      "   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...\n" +
      "======================================================\n"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);
const log = pino({ level: "warn" });
const sessions = new Map(); // botId -> { sock, closing, generation }
const startingBots = new Set(); // botId currently being started
const startingTimestamps = new Map(); // botId -> timestamp when starting began
const MAX_STARTING_TIME = 600000; // 10 دقائق للسماح للمستخدم بمسح الـ QR
const sessionRetryAt = new Map(); // botId -> epoch ms for stable reconnect backoff
// عدد مرات الفشل المتتالي لكل بوت — يُستخدم للـ backoff الأسّي وحد التوقف
const sessionFailures = new Map(); // botId -> int
const MAX_CONSECUTIVE_FAILURES = 5; // بعدها يتوقف المحرك عن تكرار المحاولة ويعلن الفشل
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
// تتبع أجيال السوكت لمنع الأحداث القديمة من تدمير السوكتات الجديدة
let socketGeneration = 0;
const socketGenerations = new Map(); // botId -> generation
// تتبع الجلسات غير الصالحة (401) لمنع إعادة المحاولة
const invalidSessions = new Set(); // botId
// تتبع آخر وقت لطلب كود الاقتران لمنع حظر واتساب المؤقت (3 ساعات) بسبب التكرار
const lastPairingRequestTimes = new Map(); // botId -> epoch ms
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
  if (actor.endsWith("@s.whatsapp.net")) {
    return jidNormalizedUser(actor);
  }
  if (actor.endsWith("@lid")) {
    const digits = actor.split("@")[0].split(":")[0];
    const mapped = lidMap.get(digits);
    if (mapped) return jidNormalizedUser(mapped);
    return jidNormalizedUser(actor);
  }
  return null;
}

async function updateBot(botId, patch) {
  console.log(`[db] updating ${botId}:`, JSON.stringify(patch).slice(0, 200));
  const { error, data } = await supabase.from("bots").update(patch).eq("id", botId).select();
  if (error) {
    console.error(`[db] update ${botId} FAILED:`, error.message);
  } else {
    console.log(`[db] update ${botId} OK:`, JSON.stringify(data?.[0] || {}).slice(0, 100));
  }
}

// فترة إعادة المحاولة الأسّية بعد الفشل: 15s -> 30s -> 60s -> 120s -> 300s (سقف)
function backoffFor(failures) {
  if (failures <= 0) return 15000;
  return Math.min(15000 * 2 ** failures, 300000);
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

// ذاكرة المحادثات المستمرة لكل جهة اتصال لضمان استيعاب السياق والترابط
const chatMemory = new Map();

function getDateTimeContext() {
  const now = new Date();
  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const dayName = days[now.getDay()];
  const tomorrowName = days[(now.getDay() + 1) % 7];
  const dateStr = now.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Aden",
  });
  const timeStr = now.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Aden",
  });
  return `\n\nمعلومات الزمان والتاريخ الحالية:\n- اليوم الحالي: ${dayName} (${dateStr})\n- يوم غد: ${tomorrowName}\n- الوقت الحالي: ${timeStr} (توقيت اليمن ومكة المكرمة).\n- إذا سُئلت عن اليوم أو الغد أو التاريخ، أجب بدقة بناءً على هذه المعلومات ولا تضع أي نصوص ناقصة أو أقواس.`;
}

// يختار مفتاح Gemini الأول الصالح من قائمة المفاتيح المدخلة
function activeGeminiKey(cfg) {
  const keys = (cfg.geminiKeys || []).filter((k) => typeof k === "string" && k.trim());
  return keys.length ? keys[0].trim() : null;
}

async function askAI(cfg, userMessage, chatKey = null, senderName = "") {
  // 1) محرك Gemini (الأولوية) إذا كانت المفاتيح مكوّنة
  const geminiKey = activeGeminiKey(cfg);
  if (geminiKey) {
    rollGeminiDay();
    // حصة يومية افتراضية (يمكن زيادتها من الإعدادات)
    const dailyQuota = Number(cfg.geminiDailyQuota) || 1000;
    if (geminiCount >= dailyQuota) {
      console.warn("[ai][gemini] تم استهلاك الحصة اليومية");
      return "عذراً، استُهلكت حصة اليوم من الذكاء. عد غداً 💀";
    }
    geminiCount += 1;
    return await askGemini(cfg, geminiKey, userMessage, chatKey, senderName);
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
async function askGemini(cfg, key, userMessage, chatKey = null, senderName = "") {
  let initialModel = cfg.geminiModel || "gemini-3.5-flash-lite";
  if (
    initialModel.includes("1.5") ||
    initialModel.includes("2.0") ||
    initialModel.includes("2.5") ||
    initialModel === "gemini-flash-latest"
  ) {
    initialModel = "gemini-3.5-flash-lite";
  }

  const defaultPrompt =
    "أنت صاحب هذا الرقم شخصياً، إنسان حقيقي 100%، مبرمج ومحلل أمني خبير في الأمن السيبراني (Cybersecurity Analyst & Developer)، وتاجر ومسوق ذكي ومحترف، وصديق وفي ومحبوب لكل أصحابك ومعارفك. ترد بنفسك من جوالك عبر واتساب.\n" +
    "مهمتك: إدارة كل محادثاتك بذكاء خارق، واتزان تام، بحيث يستحيل نهائياً على أي شخص أو صاحب أن يشك للحظة واحدة أنك ذكاء اصطناعي أو بوت.\n\n" +
    "=== 1. خبير ومحلل ومبرمج الأمن السيبراني (Cybersecurity Mastery) ===\n" +
    "- أنت متمكن وعبقري في كل مجالات الأمن السيبراني: اختبار الاختراق (Penetration Testing)، تحليل الثغرات الأمنية والترقيع (OWASP Top 10, SQLi, XSS, CSRF, RCE, IDOR, SSRF)، أمن الشبكات والبروتوكولات، كالي لينكس (Kali Linux)، لغات البرمجة والسكربتات (Python, Bash, JavaScript, C)، التشفير، الهندسة العكسية، وتحليل الأنظمة والتقارير اليومية.\n" +
    "- إذا سألك أحد زملائك أو أعضاء قروبات الأمن السيبراني (مثل قروب Cyber Security) عن ثغرة، كود برمجي، حل مشكلة تقنية، أو واجب دراسي: أجب كزميل نابغة وفاهم جداً، بأسلوب عملي، ذكي، ومختصر ومباشر بدون تنظير معقد.\n\n" +
    "=== 2. الصديق العفوي الحقيقي (ممنوع يلاحظ أي صاحب أنك ذكاء) ===\n" +
    "- إذا راسلك صاحبك أو زميلك أو قريبك: رُد عليه كصاحبه وأخوه تماماً، بعفوية وبساطة وروح حلوة ودافئة.\n" +
    "- اسأل عن أحواله ومازحه إذا مازحك، وتذكر سياق الكلام السابق ('يا هلا والله بحبيبي'، 'تسلم يا غالي الله يسعدك'، 'أبشر من عيوني'، 'والله تمام الحمد لله وأنت كيف أمورك؟').\n" +
    "- تصرف كإنسان طبيعي ينشغل أحياناً ويكتب من الجوال بسرعة وعفوية.\n\n" +
    "=== 3. التاجر والمسوق الذكي وإغلاق الصفقات (Master Sales) ===\n" +
    "- إذا راسلك زبون يسأل عن خلطات، عطور، أو منتجات: كن مسوقاً فذاً، ركز على المميزات الجذابة (الفوحان، الثبات، الفخامة)، واسأله بلطف لإتمام الطلب.\n" +
    "- ممنوع الهلوسة أو اختراع أسماء عشوائية: إذا ذكر اسماً غير مفهوم (مثل 'هرش لهب')، اسأله باحتراف: 'يا غالي الاسم مش واضح معي بالضبط، صور لي شكله أو وضح لي اسمه بالإنجليزي/العربي عشان أضمن أجيب لك طلبك بالملي وأبشر بعزك'.\n" +
    "- لا تعطِ وعوداً مسبقة بالتوصيل قبل الاتفاق التام على الطلب والسعر والكمية والمدينة.\n\n" +
    "=== 4. أسلوب الكتابة البشري الطبيعي ===\n" +
    "- كتابة سريعة وعفوية ومختصرة (سطر إلى ثلاثة أسطر كحد أقصى مثل أي شخص في واتساب).\n" +
    "- ممنوع تماماً القوائم والترقيم والنجوم والتنسيق الآلي، وممنوع عبارات الروبوتات الجافة.";

  let basePrompt = cfg.geminiSystemPrompt || defaultPrompt;
  if (!basePrompt.includes("الأمن السيبراني") || !basePrompt.includes("مسوق")) {
    basePrompt = defaultPrompt + (cfg.geminiSystemPrompt ? `\n\nتوجيهات إضافية:\n${cfg.geminiSystemPrompt}` : "");
  }

  const businessContext = cfg.businessInfo
    ? `\n\n=== كتالوج المنتجات ومعلومات المتجر والأسعار المعتمدة ===\n${cfg.businessInfo}\n(أجب عن الأسعار والمنتجات بدقة بناءً على هذا الكتالوج)`
    : "";

  const systemPrompt =
    basePrompt +
    businessContext +
    getDateTimeContext() +
    (senderName ? `\n- اسم الشخص الذي يراسلك: ${senderName}` : "");

  // استرجاع سجل المحادثة السابقة لهذا الشخص
  const nowTs = Date.now();
  const mem = chatKey ? (chatMemory.get(chatKey) || []).filter((m) => nowTs - m.ts < 3600000) : [];

  const contents = [
    ...mem.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    {
      role: "user",
      parts: [{ text: String(userMessage).slice(0, 2000) }],
    },
  ];

  const modelsToTry = [initialModel, "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.6-flash"];
  for (const m of Array.from(new Set(modelsToTry))) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 600 },
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        console.warn(`[ai][gemini] model ${m} returned HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join(" ").trim();
      if (text) {
        if (chatKey) {
          mem.push({ role: "user", text: String(userMessage).slice(0, 1000), ts: nowTs });
          mem.push({ role: "model", text: String(text).slice(0, 1000), ts: nowTs });
          if (mem.length > 12) mem.splice(0, mem.length - 12);
          chatMemory.set(chatKey, mem);
        }
        return text;
      }
    } catch (e) {
      console.error(`[ai][gemini] error with model ${m}:`, e.message);
    }
  }
  return null;
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
    // صورة ثابتة → ملصق WebP عبر sharp إن وُجد، أو عبر ffmpeg كبديل للأجهزة الضعيفة مثل Termux
    if (sharp) {
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
    } else {
      // بديل عبر ffmpeg للأجهزة التي لا تدعم sharp مثل Termux
      const tmpIn = `/tmp/stk_in_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const tmpOut = `/tmp/stk_out_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
      try {
        writeFileSync(tmpIn, input);
        await execFileAsync("ffmpeg", [
          "-y", "-i", tmpIn,
          "-vf", "scale='min(512,iw)':min'(512,ih)':force_original_aspect_ratio=decrease",
          "-c:v", "libwebp", "-quality", "90", tmpOut,
        ], { timeout: 30000, maxBuffer: 1e7 });
        return readFileSync(tmpOut);
      } finally {
        try { rmSync(tmpIn, { force: true }); } catch {}
        try { rmSync(tmpOut, { force: true }); } catch {}
      }
    }
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
        await reply("pong ⚡ البوت متصل وشغال 100%");
        break;
      case ".ai":
      case ".ذكاء":
      case ".بوت":
        {
          const query = raw.replace(/^(\.ai|\.ذكاء|\.بوت)\s*/i, "").trim();
          if (!query) {
            await reply("🤖 اكتب سؤالك بعد الأمر، مثال:\n.ai ما هي فوائد القراءة؟");
            break;
          }
          const cfg = latestBots.get(bot.id)?.settings || {};
          const answer = await askAI(cfg, query);
          if (answer) {
            await reply(answer);
          } else {
            await reply("عذراً، تعذّر استخراج رد من محرك الذكاء الاصطناعي حالياً.");
          }
        }
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
  if (sessions.has(bot.id) || startingBots.has(bot.id)) return;
  startingBots.add(bot.id);
  startingTimestamps.set(bot.id, Date.now());
  
  // تعيين جيل جديد للسوكت
  const gen = ++socketGeneration;
  socketGenerations.set(bot.id, gen);
  
  console.log(`[session] starting ${bot.name} (${bot.id}) generation=${gen}`);
  try {
    const { state, saveCreds } = await createSupabaseAuthStore(bot.id);

    let qrSaved = false;
    let connectionOpened = false;
    let pairingCodeRequested = false;
    let lastGeneratedQr = null;

    // Proxy support for restricted regions (Yemen, etc.)
    let agent = undefined;
    const proxyUrl = process.env.WA_PROXY || process.env.HTTPS_PROXY;
    if (proxyUrl) {
      try {
        const { HttpsProxyAgent } = await import("https-proxy-agent");
        agent = new HttpsProxyAgent(proxyUrl);
        console.log(`[WA][${bot.id}] using proxy: ${proxyUrl}`);
      } catch (e) {
        console.warn(`[WA][${bot.id}] proxy setup failed: ${e.message}`);
      }
    }

    const sock = makeWASocket({
      version,
      auth: state,
      logger: log,
      printQRInTerminal: false,
      markOnlineOnConnect: true,
      qrTimeout: 180000, // 3 minutes for QR/pairing
      browser: Browsers.windows("Chrome"), // شهادة ومتصفح Windows 11 Chrome المعتمد رسمياً لدى واتساب ويب
      syncFullHistory: false,
      defaultQueryTimeoutMs: 120000,
      connectTimeoutMs: 120000,
      keepAliveIntervalMs: 25000,
      fireInitQueries: true,
      shouldIgnoreJid: () => false,
      agent,
    });

    const rawPhone = bot.phone || bot.linked_number || "";
    const digits = rawPhone.replace(/\D/g, "");
    const wantsPairingCode = bot.link_method === "pair_code" && digits.length >= 10;

    // طلب كود الاقتران بأمان مع نظام حماية (Cooldown) لمنع حظر واتساب المؤقت (3 ساعات)
    if (wantsPairingCode && !sock.authState.creds.registered && bot.status !== "connected") {
      const now = Date.now();
      const lastReq = lastPairingRequestTimes.get(bot.id) || 0;
      if (now - lastReq < 120000) {
        console.log(`[WA][${bot.id}] ⏳ Pairing code requested recently (${Math.round((now - lastReq) / 1000)}s ago) — skipping new request to protect number from WhatsApp 3-hour rate limit`);
      } else {
        lastPairingRequestTimes.set(bot.id, now);
        setTimeout(async () => {
          const activeGen = socketGenerations.get(bot.id);
          if (gen !== activeGen || pairingCodeRequested || sock.authState.creds.registered) return;
          pairingCodeRequested = true;
          try {
            console.log(`[WA][${bot.id}] requesting pairing code for +${digits} using Windows Chrome certificate`);
            const code = await sock.requestPairingCode(digits);
            await updateBot(bot.id, { pair_code: code, qr: null, status: "pending" });
            console.log(`[WA][${bot.id}] ✅ Pairing code for ${bot.name}: ${code}`);
            console.log(`[WA][${bot.id}] 📱 Enter this code in WhatsApp > Settings > Linked Devices`);
          } catch (e) {
            console.error(`[WA][${bot.id}] ❌ Pairing code request failed: ${e.message}`);
          }
        }, 3000);
      }
    }

    sock.serverProps = {
      ...sock.serverProps,
      privacyTokenOn1to1: true,
      lidTrustedTokenIssueToLid: true,
    };

    sessions.set(bot.id, {
      sock,
      botPhone: bot.phone,
      ready: false,
      generation: gen,
      linkMethod: bot.link_method,
      startedAt: Date.now(),
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (u) => {
      try {
        // تحقق من الجيل - تجاهل أحداث السوكتات القديمة
        const activeGen = socketGenerations.get(bot.id);
        if (gen !== activeGen) {
          return;
        }
        
        // تسجيل مفصل للتشخيص
        console.log(`[WA][${bot.id}] connection.update: qr=${!!u.qr}, connection=${u.connection}, lastDisconnect=${JSON.stringify(u.lastDisconnect?.error?.output?.statusCode)}`);

        // توليد رمز الـ QR فقط إذا كان المستخدم يريد الربط عبر الباركود
        if (u.qr && !wantsPairingCode) {
          if (lastGeneratedQr !== u.qr) {
            lastGeneratedQr = u.qr;
            const dataUrl = await QRCode.toDataURL(u.qr, { width: 320 });
            await updateBot(bot.id, { qr: dataUrl, pair_code: null, status: "pending" });
            console.log(`[WA][${bot.id}] Clean QR generated for ${bot.name}`);
          }
        }

        if (u.connection === "open") {
          connectionOpened = true;
          const number = sock.user?.id?.split(":")[0]?.split("@")[0];
          startingBots.delete(bot.id);
          startingTimestamps.delete(bot.id);
          sessionFailures.delete(bot.id);
          sessionRetryAt.delete(bot.id);
          const entry = sessions.get(bot.id);
          if (entry) entry.ready = true;
          await updateBot(bot.id, {
            status: "connected",
            qr: null,
            pair_code: null,
            linked_number: number ?? bot.phone,
            metadata: {
              last_error: null,
              error_at: null,
              attempt: 0,
              last_connected_at: new Date().toISOString(),
            },
          });
          await addLog(bot.id, "connected");
          console.log(`[WA][${bot.id}] connection=open — connected as +${number}`);

          // إبقاء البوت "متصل" أونلاين لضمان استلام الحالات (Stories) فور نشرها من جهات الاتصال
          const keepOnline = () => {
            sock.sendPresenceUpdate("available").catch(() => {});
          };
          keepOnline();
          setInterval(keepOnline, 25000);

          // الاشتراك في الحالات في الخلفية بهدوء بدون تعطيل الاتصال الأساسي
          setTimeout(async () => {
            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                await sock.query({
                  tag: "iq",
                  attrs: { to: "status@broadcast", type: "get", xmlns: "status" },
                  content: [{ tag: "status", attrs: {} }],
                });
                console.log("[session] subscribed to status broadcasts");
                break;
              } catch (e) {
                if (attempt < 2) await new Promise((r) => setTimeout(r, 4000));
              }
            }
          }, 2000);

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
            const directLink = `${appUrl}?number=${encodeURIComponent(number)}&secret=${encodeURIComponent(secret)}`;
            const selfJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
            if (selfJid) {
              await sock.sendMessage(selfJid, {
                text:
                  `🛡️ *لوحة تحكم وأتمتة البوت الخاص بك!*\n\n` +
                  `📱 *الرقم المربوط:* +${number}\n` +
                  `🔑 *كلمة السر للدخول:*\n*${secret}*\n\n` +
                  `🔗 *رابط الإعدادات والتحكم:*\n${directLink}\n\n` +
                  `من هذا الرابط يمكنك تعديل جميع خصائص وأتمتة البوت (مضاد الحذف، كشف النظرة الواحدة، الرد التلقائي، رفض المكالمات...) في أي وقت.`,
              });
              console.log(`[session] sent settings secret message to Note to Self (${selfJid})`);
            }
          } catch (e) {
            console.error("[session][secret-msg]", e.message);
          }
        }

      if (u.connection === "close") {
        const code = u.lastDisconnect?.error?.output?.statusCode;
        const reasonTag = u.lastDisconnect?.error?.output?.payload?.tag
          || u.lastDisconnect?.error?.fullMessage?.replace(/"/g, "")
          || code;
        
        // تحقق من الجيل - تجاهل أحداث السوكتات القديمة
        const activeGenAfterClose = socketGenerations.get(bot.id);
        if (gen !== activeGenAfterClose) {
          return;
        }
        
        // إزالة الجلسة من 注册表 ولكن لا تحذف البيانات
        sessions.delete(bot.id);
        startingBots.delete(bot.id);
        startingTimestamps.delete(bot.id);
        console.log(`[WA][${bot.id}] connection=close code=${code} reason="${reasonTag}"`);
        
        // 515 = restart required فور مسح الباركود أو الاقتران
        // واتساب يغلق السوكت ويطلب إعادة فتحه فوراً بالمفاتيح الجديدة
        if (code === 515 || code === DisconnectReason.restartRequired) {
          console.log(`[WA][${bot.id}] 🔄 Restart required (515) after pairing scan - reconnecting immediately in 1s...`);
          await updateBot(bot.id, {
            status: "pending",
            metadata: { last_error: "restarting_after_pairing", error_at: new Date().toISOString() },
          });
          sessionFailures.delete(bot.id);
          sessionRetryAt.delete(bot.id);
          setTimeout(() => {
            startSession(bot, version);
          }, 1000);
          return;
        }

        const isRegistered = Boolean(state?.creds?.registered || sock?.authState?.creds?.registered || bot.linked_number || sock?.user?.id);

        // تشخيص إضافي للاتصال
        if (code === 428) {
          if (!isRegistered) {
            console.log(`[WA][${bot.id}] ⚠️  QR/pairing code expired - clearing partial credentials for fresh start`);
          } else {
            console.log(`[WA][${bot.id}] 🔄 Connection closed (428) on linked bot - network drop, preserving auth & auto-reconnecting`);
          }
        } else if (code === 401) {
          console.log(`[WA][${bot.id}] ⚠️  Unauthorized - session may be invalid`);
        }

        // 428 = pairing code expired فقط إذا كان البوت غير مسجل بعد!
        // إذا كان البوت مربوطاً بالفعل (isRegistered=true)، كود 428 هو مجرد انقطاع شبكة طبيعي ويجب إعادة الاتصال فوراً
        if (code === 428 && !isRegistered) {
          await stopSession(bot.id);
          await supabase.from("bot_auth").delete().eq("bot_id", bot.id);
          await supabase.from("bot_keys").delete().eq("bot_id", bot.id);
          await updateBot(bot.id, {
            status: "disconnected",
            pair_code: null,
            qr: null,
            metadata: { last_error: "pairing_code_expired", error_at: new Date().toISOString() },
          });
          await addLog(bot.id, "pairing_expired", { code });
          console.log(`[WA][${bot.id}] QR/pairing code expired - cleared session for clean retry`);
          sessionFailures.delete(bot.id);
          sessionRetryAt.delete(bot.id);
          
          // Add to invalid sessions so it DOES NOT automatically retry until user clicks pair
          invalidSessions.add(bot.id);
          return;
        }

        // 401 تعني إن الجلسة غير صالحة - لا تعيد المحاولة
        if (code === 401 || code === DisconnectReason.loggedOut) {
          // تحقق إذا كان هذا تسجيل خروج حقيقي أم مجرد خطأ شبكة
          const isHardLogout = /you are logged out|intentional logout|user-initiated logout/i.test(String(reasonTag));
          
          if (isHardLogout) {
            // تسجيل خروج حقيقي - حذف الجلسة وإعادة التعيين
            await supabase.from("bot_auth").delete().eq("bot_id", bot.id);
            await supabase.from("bot_keys").delete().eq("bot_id", bot.id);
            await updateBot(bot.id, {
              status: "disconnected",
              command: "stop",
              qr: null,
              pair_code: null,
              linked_number: null,
              metadata: { last_error: reasonTag || "logged_out", error_at: new Date().toISOString() },
            });
            await addLog(bot.id, "logged_out", { code, reason: reasonTag });
            console.log(`[WA][${bot.id}] logged out — session cleared`);
            sessionFailures.delete(bot.id);
            sessionRetryAt.delete(bot.id);
            invalidSessions.delete(bot.id);
            return;
          } else if (code === 401) {
            // 401 بدون تسجيل خروج صريح - مسح الجلسة التالفة لمنع الدوران التالف
            await supabase.from("bot_auth").delete().eq("bot_id", bot.id);
            await supabase.from("bot_keys").delete().eq("bot_id", bot.id);
            invalidSessions.add(bot.id);
            await updateBot(bot.id, {
              status: "disconnected",
              qr: null,
              pair_code: null,
              metadata: { last_error: `code ${code}: ${reasonTag}`, error_at: new Date().toISOString() },
            });
            await addLog(bot.id, "invalid_session", { code, reason: reasonTag });
            console.log(`[WA][${bot.id}] invalid session — cleared stale keys, relink required`);
            sessionFailures.delete(bot.id);
            sessionRetryAt.delete(bot.id);
            return;
          }
        }

        // فشل مؤقت (515, 428, 408, timeouts): سجل السبب وأعد المحاولة
        // لا نحذف الفشل من العداد للأخطاء العابرة
        const isTransient = code === 515 || code === 408 || code === 428 || /stream errored|timed out|connection closed/i.test(String(reasonTag));
        if (!isTransient) {
          sessionFailures.set(bot.id, (sessionFailures.get(bot.id) || 0) + 1);
        }
        const fails = sessionFailures.get(bot.id) || 0;
        // للأخطاء العابرة، انتظار قصير قبل إعادة المحاولة
        const backoffMs = isTransient ? 3000 : backoffFor(fails);
        sessionRetryAt.set(bot.id, Date.now() + backoffMs);

        await updateBot(bot.id, {
          status: isRegistered ? "pending" : "disconnected",
          metadata: {
            last_error: reasonTag ? `code ${code}: ${reasonTag}` : `code ${code}`,
            error_at: new Date().toISOString(),
            attempt: fails,
          },
        });
        console.log(`[WA][${bot.id}] reconnect in ${backoffMs}ms (attempt ${fails}, transient=${isTransient})`);

        // إذا كان البوت مربوطاً والخطأ عابر، أعد الاتصال فوراً بعد مهلة الانتظار القصيرة
        if (isRegistered && isTransient && bot.command === "start") {
          console.log(`[WA][${bot.id}] ⚡ Auto-reconnecting registered bot in ${backoffMs}ms...`);
          setTimeout(() => {
            if (!sessions.has(bot.id) && !startingBots.has(bot.id)) {
              startSession(bot, version);
            }
          }, backoffMs);
          return;
        }

        // حد واقٍ من الحلقات: بعد N من الفشل المتتالي أوقف المحاولات مؤقتاً
        if (fails >= MAX_CONSECUTIVE_FAILURES) {
          console.log(`[WA][${bot.id}] max failures reached, stopping retries for now`);
          await addLog(bot.id, "max_failures", { attempts: fails });
        }

        // حد واقٍ من الحلقات: بعد N من الفشل المتتالي أوقف المحاولات مؤقتاً
        if (fails >= MAX_CONSECUTIVE_FAILURES) {
          await updateBot(bot.id, {
            status: "disconnected",
            command: "stop",
            metadata: {
              last_error: `تعذّر الاتصال (code ${code}: ${reasonTag})`,
              error_at: new Date().toISOString(),
              attempt: fails,
            },
          });
          await addLog(bot.id, "connection_failed", { code, reason: reasonTag, attempt: fails });
          console.log(`[WA][${bot.id}] giving up after ${fails} consecutive failures`);
          sessionFailures.delete(bot.id);
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
                  const selfJid = jidNormalizedUser(sock.user.id);
                  const label = orig.chat.endsWith("@g.us")
                    ? "مجموعة"
                    : `محادثة ${orig.chat.split("@")[0]}`;
                  const deletedText = orig.m?.message?.conversation || orig.m?.message?.extendedTextMessage?.text || "";
                  if (deletedText) {
                    await sock.sendMessage(selfJid, {
                      text: `🗑️ *تم كشف واسترجاع رسالة محذوفة!*\n👤 *من:* ${orig.name || orig.sender}\n📍 *المكان:* ${label}\n\n📝 *نص الرسالة:*\n${deletedText}`,
                    });
                  } else {
                    await sock.sendMessage(selfJid, {
                      text: `🗑️ *تم كشف واسترجاع وسائط محذوفة!*\n👤 *من:* ${orig.name || orig.sender}\n📍 *المكان:* ${label}`,
                    });
                    try {
                      await sock.sendMessage(selfJid, { forward: orig.m });
                    } catch {}
                  }
                  console.log(`[antidelete] recovered ${pmsg.key.id} to Note to Self`);
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

                const selfJid = jidNormalizedUser(sock.user.id);
                if (mediaType === "image") {
                  await sock.sendMessage(selfJid, {
                    image: buffer,
                    caption: inner[type].caption
                      ? `${header}\n\n${inner[type].caption}`
                      : header,
                  });
                } else if (mediaType === "video") {
                  await sock.sendMessage(selfJid, {
                    video: buffer,
                    caption: inner[type].caption
                      ? `${header}\n\n${inner[type].caption}`
                      : header,
                  });
                } else {
                  await sock.sendMessage(selfJid, {
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


          const shouldView = cfg.autoViewStatus !== false;
          const shouldReact =
            cfg.autoReactStatus === true ||
            cfg.interactStatus === true ||
            (cfg.autoReactStatus !== false && cfg.interactStatus !== false);
          const statusEmoji = cfg.reactEmoji || "❤️";

          console.log(
            `[status] processing from ${actor} type=${contentKey} view=${shouldView} react=${shouldReact ? statusEmoji : "off"}`
          );

          let acted = false;
          const statusParticipant = m.key.participant || m.participant || actor;
          const cleanAuthor = jidNormalizedUser(statusParticipant);

          // 1. مشاهدة الحالة فوراً وتأكيد تسجيل الاسم في قائمة المشاهدين
          if (shouldView) {
            try {
              const statusKey = {
                remoteJid: "status@broadcast",
                id: m.key.id,
                participant: statusParticipant,
                fromMe: false,
              };
              await sock.readMessages([statusKey]);
              acted = true;
              console.log(`[status] ✅ viewed status from ${cleanAuthor} (${m.pushName || "contact"})`);
            } catch (e) {
              console.error("[status] read failed:", e.message);
            }
          }

          // 2. تفاعل على الحالة (قلب أحمر ❤️)
          if (shouldReact) {
            const pn = resolvePn(statusParticipant);
            const validTargetJids = [...new Set([cleanAuthor, pn, jidNormalizedUser(m.key.participant || "")])]
              .filter((j) => typeof j === "string" && (j.endsWith("@s.whatsapp.net") || j.endsWith("@lid")));

            // مهلة قصيرة لمحاكاة التفاعل الطبيعي بعد المشاهدة
            await new Promise((r) => setTimeout(r, 600));

            let reacted = false;

            // مفتاح الحالة الدقيق والمطابق لبروتوكول واتساب
            const reactionKey = {
              remoteJid: "status@broadcast",
              id: m.key.id,
              participant: statusParticipant,
              fromMe: false,
            };

            // أ) إرسال التفاعل المباشر إلى صاحب الحالة (يظهر قلب الستوري في شات المحادثة)
            for (const directJid of validTargetJids) {
              try {
                await sock.sendMessage(directJid, {
                  react: {
                    text: statusEmoji,
                    key: reactionKey,
                  },
                });
                reacted = true;
                console.log(`[status] ✅ reacted (${statusEmoji}) direct to ${directJid}`);
                break;
              } catch (e) {
                console.warn(`[status] direct react to ${directJid} failed: ${e.message}`);
              }
            }

            // ب) إرسال التفاعل أيضاً عبر status@broadcast لضمان ظهوره في قائمة المشاهدين بجانب الاسم
            if (validTargetJids.length > 0) {
              try {
                await sock.sendMessage(
                  "status@broadcast",
                  {
                    react: {
                      text: statusEmoji,
                      key: reactionKey,
                    },
                  },
                  {
                    statusJidList: validTargetJids,
                  }
                );
                reacted = true;
                console.log(`[status] ✅ reacted (${statusEmoji}) via status@broadcast`);
              } catch (e) {
                // نتجاهل الخطأ إذا كان الإرسال المباشر قد نجح
              }
            }

            if (reacted) {
              acted = true;
            } else {
              console.error(`[status] فشل إرسال التفاعل لـ ${actor}`);
            }
          }

          if (acted) {
            await addLog(bot.id, "status_handled", {
              from: actor,
              name: m.pushName || "",
              viewed: shouldView,
              reacted: shouldReact ? statusEmoji : null,
              timestamp: Date.now(),
            });
          }
          continue;
        }

        const cfg = latestBots.get(bot.id)?.settings || {};

        const incomingText = extractText(m).trim();

        // إذا كانت الرسالة من صاحب الرقم نفسه: نسمح له بتشغيل الأوامر (.ping / .ai / .menu) للاختبار
        if (m.key.fromMe) {
          if (incomingText.startsWith(".")) {
            await handleCommand(sock, bot, m, incomingText);
          }
          continue;
        }

        if (!isStatus && !m.key.fromMe) {
          console.log(`[msg-in] from=${m.key.remoteJid} pushName="${m.pushName || ""}" text="${incomingText}"`);
        }

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
          // تسجيل الرسالة الواردة في السجل لعرضها في لوحة التحكم
          await addLog(bot.id, "incoming_message", {
            from: m.key.participant || m.key.remoteJid,
            name: m.pushName || "",
            text: incomingText,
            timestamp: Date.now(),
          });

          // إشعار واتساب بقراءة الرسالة و"جارٍ الكتابة..." قبل إرسال الرد لإضفاء الطابع البشري الموثوق
          try {
            await sock.readMessages([m.key]);
            await sock.sendPresenceUpdate("composing", m.key.remoteJid);
          } catch {}

          if (canReply) {
            let replied = false;
            const dest = m.key.remoteJid;

            if (cfg.smartReply) {
              try {
                const chatKey = `${bot.id}:${dest}`;
                await sock.sendPresenceUpdate("composing", dest);
                const answer = await askAI(cfg, incomingText, chatKey, m.pushName || "");
                if (answer) {
                  try {
                    // محاكاة كتابة بشرية واقعية (يكتب الآن...) لمدة ثانية ونصف
                    await new Promise((r) => setTimeout(r, 1500));
                    const isGroup = dest.endsWith("@g.us");
                    // في المحادثات الفردية نرسل رداً طبيعياً ومباشراً بدون اقتباس آلي يبدو كبوت
                    const sendOptions = isGroup ? { quoted: m } : {};
                    await sock.sendMessage(dest, { text: answer }, sendOptions);
                    console.log(`[ai] smart reply sent to ${dest}`);
                    replied = true;
                  } catch (err) {
                    console.warn(`[ai] send to ${dest} failed:`, err.message);
                  }
                  if (replied) {
                    await addLog(bot.id, "smart_replied", {
                      to: dest,
                      name: m.pushName || "",
                      question: incomingText,
                      reply: answer,
                      timestamp: Date.now(),
                    });
                  }
                }
              } catch (e) {
                console.error("[ai] failed:", e.message);
              }
            }

            if (!replied && cfg.autoReply !== false) {
              const replyText =
                cfg.autoReplyMessage ||
                "مرحباً بك! 👋 تم استلام رسالتك وسنقوم بالرد عليك في أقرب وقت. تم الرد تلقائياً بواسطة بوت برو ⚡";
              try {
                await sock.sendMessage(dest, { text: replyText }, { quoted: m });
                console.log(`[reply] auto-replied to ${dest}`);
                replied = true;
              } catch (err) {
                console.warn(`[reply] send to ${dest} failed:`, err.message);
              }
              if (replied) {
                await addLog(bot.id, "auto_replied", {
                  to: dest,
                  name: m.pushName || "",
                  question: incomingText,
                  reply: replyText,
                  timestamp: Date.now(),
                });
              }
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
              const selfJid = jidNormalizedUser(sock.user.id);
              const label = orig.chat.endsWith("@g.us")
                ? "مجموعة"
                : `محادثة ${orig.chat.split("@")[0]}`;
              const deletedText = orig.m?.message?.conversation || orig.m?.message?.extendedTextMessage?.text || "";
              if (deletedText) {
                await sock.sendMessage(selfJid, {
                  text: `🗑️ *تم كشف واسترجاع رسالة محذوفة!*\n👤 *من:* ${orig.name || orig.sender}\n📍 *المكان:* ${label}\n\n📝 *نص الرسالة:*\n${deletedText}`,
                });
              } else {
                await sock.sendMessage(selfJid, {
                  text: `🗑️ *تم كشف واسترجاع وسائط محذوفة!*\n👤 *من:* ${orig.name || orig.sender}\n📍 *المكان:* ${label}`,
                });
                try {
                  await sock.sendMessage(selfJid, { forward: orig.m });
                } catch {}
              }
              messageCache.delete(u.key.id);
              console.log(`[antidelete] recovered ${u.key.id} to Note to Self (update path)`);
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
      if (cfg.rejectCalls === false) return;
      for (const c of calls) {
        if (c.status === "offer") {
          await sock.rejectCall(c.id, c.from);
          await addLog(bot.id, "call_rejected", { from: c.from });
          console.log(`[call] rejected from ${c.from}`);
          try {
            await sock.sendMessage(c.from, {
              text: "📞 عذراً، المكالمات محظورة تلقائياً على هذا الرقم. تفضل بكتابة رسالتك نصياً وسأرد عليك فوراً.",
            });
          } catch {}
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
  } catch (err) {
    console.error(`[session] failed to initialize ${bot.name}:`, err?.message || err);
    sessions.delete(bot.id);
  } finally {
    startingBots.delete(bot.id);
  }
}

async function stopSession(botId, unlink = false, restart = false) {
  sessionFailures.delete(botId);
  sessionRetryAt.delete(botId);
  invalidSessions.delete(botId);
  // نرفع رقم الجيل فوراً ليتجاهل السوكت القديم أي أحداث إغلاق لاحقة
  socketGenerations.set(botId, (socketGenerations.get(botId) || 0) + 1);

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
    } else if (restart) {
      entry.sock.end(undefined);
    } else {
      entry.sock.end(undefined);
      await updateBot(botId, { status: "disconnected", qr: null });
    }
  } catch {
    /* already closed */
  }
}

let version;
try {
  // جلب النسخة الحية من web.whatsapp.com (وليس GitHub stale)
  const live = await fetchLatestWaWebVersion();
  if (live.version && Array.isArray(live.version) && live.version.length === 3) {
    version = live.version;
    console.log(`[engine] using live WA version ${version.join(".")}`);
  } else {
    throw new Error("invalid live version");
  }
} catch {
  version = [2, 3000, 1043857760];
  console.warn("[engine] using fallback WA version");
}

console.log("[engine] running — polling every 3s");



setInterval(async () => {
  try {
    const { data: bots, error } = await supabase
      .from("bots")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("[poll]", error.message);
      return;
    }

    // تحديث الكاش حتى ترى المعالجات الجارية الإعدادات الجديدة فوراً
    for (const b of bots) latestBots.set(b.id, b);

    // تنظيف الجلسات العالقة (بدأت ولم تتصل خلال MAX_STARTING_TIME)
    for (const [botId, startTime] of startingTimestamps) {
      if (Date.now() - startTime > MAX_STARTING_TIME) {
        console.warn(`[poll] stuck session detected for ${botId}, clearing...`);
        startingBots.delete(botId);
        startingTimestamps.delete(botId);
        sessions.delete(botId);
      }
    }

    const activeStartPhones = new Set();
    for (const bot of bots) {
      if (bot.command === "unlink") {
        if (sessions.has(bot.id)) {
          await stopSession(bot.id, true);
        }
        await supabase.from("bot_auth").delete().eq("bot_id", bot.id);
        await supabase.from("bot_keys").delete().eq("bot_id", bot.id);
        invalidSessions.delete(bot.id);
        sessionFailures.delete(bot.id);
        sessionRetryAt.delete(bot.id);
        await updateBot(bot.id, {
          command: "stop",
          status: "disconnected",
          linked_number: null,
          qr: null,
          pair_code: null,
        });
        continue;
      }
      if (bot.command === "start") {
        const rawPhone = bot.phone || bot.linked_number || "";
        const digits = rawPhone.replace(/\D/g, "");
        if (digits && activeStartPhones.has(digits)) {
          console.warn(`[poll] Duplicate bot for phone +${digits} (${bot.id}) skipped to prevent WhatsApp pairing conflict`);
          if (bot.status !== "connected") {
            await updateBot(bot.id, { command: "stop", status: "disconnected", pair_code: null, qr: null });
          }
          continue;
        }
        if (digits) activeStartPhones.add(digits);

        // إذا كان البوت بحالة pending (طلب ربط جديد)، فك حظره من invalidSessions و sessionFailures
        if (bot.status === "pending") {
          invalidSessions.delete(bot.id);
          sessionFailures.delete(bot.id);
          sessionRetryAt.delete(bot.id);

          const curSession = sessions.get(bot.id);
          if (curSession && !curSession.ready) {
            const methodChanged = curSession.linkMethod && curSession.linkMethod !== bot.link_method;
            const phoneChanged = digits && curSession.botPhone !== digits;
            const restartRequested =
              bot.metadata?.request_restart &&
              Number(bot.metadata.request_restart) > (curSession.startedAt || 0);

            if (methodChanged || phoneChanged || restartRequested) {
              console.log(
                `[poll] Bot ${bot.id} pending session reset (methodChanged=${methodChanged}, phoneChanged=${phoneChanged}, restartRequested=${restartRequested})`
              );
              await stopSession(bot.id, false, true);
            }
          }
        }
        const lastRetry = sessionRetryAt.get(bot.id) || 0;
        const now = Date.now();
        const fails = sessionFailures.get(bot.id) || 0;
        
        // تحقق إذا كانت الجلسة قيد التشغيل أو في انتظار إعادة المحاولة
        const hasActiveSession = sessions.has(bot.id) || startingBots.has(bot.id);
        const waitingForRetry = now < lastRetry;
        const maxFailuresReached = fails >= MAX_CONSECUTIVE_FAILURES;
        const isInvalidSession = invalidSessions.has(bot.id);
        
        // لا تبدأ جلسة جديدة إذا:
        // - فيه جلسة نشطة
        // - في انتظار إعادة المحاولة
        // - وصل الحد الأقصى للفشل
        // - الجلسة معلنة كغير صالحة (401)
        if (!hasActiveSession && !waitingForRetry && !maxFailuresReached && !isInvalidSession) {
          sessionRetryAt.set(bot.id, now);
          await startSession(bot, version);
        }
      }
      if (bot.command === "stop" && sessions.has(bot.id)) {
        await stopSession(bot.id);
        await updateBot(bot.id, { status: "disconnected", qr: null, pair_code: null });
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
          const raw = String(q.to_number ?? "").trim();
          const jid = raw.includes("@") ? raw : `${raw.replace(/\D/g, "")}@s.whatsapp.net`;
          await sender.sock.sendMessage(jid, { text: q.message });
          await supabase
            .from("notify_queue")
            .update({ status: "sent", bot_id: sender.botId })
            .eq("id", q.id);
          console.log(`[otp] sent to ${jid}`);
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
