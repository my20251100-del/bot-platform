import { NextRequest, NextResponse } from "next/server";
import { createHash, createDecipheriv } from "crypto";
import { createAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { normalizePhoneNumber, isValidWhatsAppPhone } from "@/lib/phone";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { signConnectToken, verifyConnectToken } from "@/lib/connect-token";

export const runtime = "nodejs";

const L = (lang: string | undefined, ar: string, en: string) => (lang === "en" ? en : ar);

// مطابقة خوارزمية المحرك: فك تشفير settings.secret (AES-256-GCM) بقيمة at-rest من المحرك
const AT_REST_PREFIX = "enc:v1:";
function atRestKeyFrom(seed: string) {
  return createHash("sha256").update(`hatemx-bot-at-rest-v1:${seed}`).digest();
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
function atRestDecrypt(value: string | null | undefined): string {
  if (typeof value !== "string" || !value.startsWith(AT_REST_PREFIX)) return value || "";
  try {
    const raw = Buffer.from(value.slice(AT_REST_PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    for (const key of atRestCandidateKeys()) {
      try {
        const decipher = createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(tag);
        const plain = Buffer.concat([decipher.update(data), decipher.final()]);
        return plain.toString("utf8");
      } catch {
        // جرّب المفتاح التالي
      }
    }
    return "";
  } catch {
    return "";
  }
}

function maskPhone(phone: string | null | undefined): string {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length < 5) return "";
  return `•••• •••• ${d.slice(-4)}`;
}

function toBotPayload(b: any, digits: string) {
  const isPending =
    b.status === "pending" || !!b.qr || (!!b.pair_code && !b.linked_number && b.command === "start");
  return {
    id: b.id,
    name: b.name,
    status: b.status,
    linked_number: maskPhone(b.linked_number ?? (b.phone ? b.phone : null)),
    link_method: b.link_method,
    pair_code: b.pair_code ?? null,
    qr: b.qr ?? null,
    isPending,
    secret: b.settings?.secret ? atRestDecrypt(b.settings.secret) : null,
    last_error: b.metadata?.last_error ?? null,
    attempt: b.metadata?.attempt ?? 0,
  };
}

// هل يملك المتصل صلاحية التحكم بهذا البوت؟
// إما توكن موقع صادر من آخر طلب ناجح، أو جلسة تسجيل دخول (المالك أو أدمن المنصة).
async function canControlBot(token: string | null | undefined, digits: string, bot: any) {
  if (bot && verifyConnectToken(token, bot.id, bot.phone || bot.linked_number || digits)) return true;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && bot && (bot.user_id === user.id || isAdminUser(user))) return true;
  } catch {
    return false;
  }
  return false;
}

// استلام حالة الربط الحالية (QR / الكود / متصل). الاتصال الفعلي يقوم به المحرك.
export async function GET(req: NextRequest) {
  try {
    const number = (req.nextUrl.searchParams.get("number") || "").replace(/\D/g, "");
    if (!number) return NextResponse.json({ error: "رقم غير صالح" }, { status: 400 });

    const token = req.nextUrl.searchParams.get("token");
    const admin = createAdmin();
    const { data: bots, error } = await admin
      .from("bots")
      .select("id, user_id, name, status, command, link_method, pair_code, qr, linked_number, settings, phone, metadata")
      .or(`phone.eq.${number},linked_number.eq.${number}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const bot = bots?.[0];
    if (!bot) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // كود الاقتران سري — لا يُسلَّم إلا لمن يملك توكن صحيحاً أو جلسة مالك/أدمن.
    const authorized = await canControlBot(token, number, bot);
    if (!authorized) {
      return NextResponse.json({ error: "غير مصرح — هذا الطلب يحتاج توكن الربط الصادر عند إنشاء البوت" }, { status: 401 });
    }

    return NextResponse.json({ ok: true, bot: toBotPayload(bot, number) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function makeEmail(digits: string) {
  return `wa_${digits}@m-aknoon.local`;
}
function genPassword() {
  return "WPX" + Array.from({ length: 12 }, () => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 57)]).join("");
}

async function ensureSystemUser(admin: any, digits: string) {
  const email = makeEmail(digits);
  const { data: existing } = await admin.from("profiles").select("id,email").eq("email", email).maybeSingle();
  if (existing) return { user_id: existing.id, email, existing: true };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const password = genPassword();
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "عميل واتساب", phone: digits },
    }),
  });
  const usr = await res.json();
  if (!usr?.id) {
    const { data: again } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (again) return { user_id: again.id, email, existing: true };
    throw new Error((usr?.msg || "failed to create user") + " (" + res.status + ")");
  }

  let profileId = null;
  for (let i = 0; i < 10; i++) {
    const { data: profRow } = await admin.from("profiles").select("id").eq("id", usr.id).maybeSingle();
    if (profRow) {
      profileId = profRow.id;
      break;
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  if (!profileId) throw new Error("تعذّر إنشاء الحساب (لم يظهر البروفايل)");
  await admin.from("profiles").update({ phone: digits }).eq("id", profileId);
  return { user_id: profileId, email, existing: false };
}

// إنشاء بوت جديد / إعادة بدء الربط
// — يمنع إنشاء أكثر من بوت لنفس الرقم، ويترك الكود الحقيقي يولّده المحرك (Baileys).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lang: string | undefined = body?.lang;
    const ip = clientIp(req);
    const perIp = rateLimit({ key: `connect:ip:${ip}`, limit: 8, windowMs: 10 * 60 * 1000 });
    if (!perIp.ok) {
      return NextResponse.json(
        { error: L(lang, "طلبات كثيرة من هذا الجهاز، حاول بعد قليل", "Too many requests from this device, try again later"), retryAfterSec: perIp.retryAfterSec },
        { status: 429 }
      );
    }

    const rawNumber = body.number || body.phone;
    const action = body.action || "start";
    const botName = body.name || body.botName;
    const token = typeof body.token === "string" ? body.token : null;

    if (!rawNumber) return NextResponse.json({ error: L(lang, "أدخل رقم الواتساب", "Enter the WhatsApp number") }, { status: 400 });

    const digits = normalizePhoneNumber(rawNumber);
    if (!isValidWhatsAppPhone(digits))
      return NextResponse.json({ error: L(lang, "رقم واتساب غير صالح", "Invalid WhatsApp number") }, { status: 400 });

    const admin = createAdmin();

    const { data: bots, error } = await admin
      .from("bots")
      .select("id, user_id, name, status, command, link_method, pair_code, qr, linked_number, settings, phone, metadata")
      .or(`phone.eq.${digits},linked_number.eq.${digits}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let bot = bots?.[0];

    // لم يجد بوتاً لهذا الرقم — أنشئ حساباً وبوتاً واحداً فقط (إجراء عام بلا مصادقة + حدّ معدل)
    if (!bot) {
      const { user_id } = await ensureSystemUser(admin, digits);
      const name = (botName && String(botName).trim()) || "بوتي";
      const { data: created, error: insErr } = await admin
        .from("bots")
        .insert({
          user_id,
          name,
          phone: digits,
          link_method: "pair_code",
          status: "pending",
          pair_code: null,
          qr: null,
          command: "start",
          metadata: { request_restart: Date.now() },
        })
        .select("id, user_id, name, status, command, link_method, pair_code, qr, linked_number, settings, phone, metadata")
        .single();
      if (insErr || !created) {
        return NextResponse.json({ error: insErr?.message || L(lang, "تعذّر إنشاء البوت", "Failed to create the bot") }, { status: 500 });
      }
      bot = created;
    } else if (action === "start" || action === "reset") {
      // البوت موجود مسبقاً — لا يسمح لأي أحدٍ بالتحكم به إلا صاحبه/المصرّح له.
      const authorized = await canControlBot(token, digits, bot);
      if (!authorized) {
        return NextResponse.json(
          { error: L(lang, "غير مصرح — هذا البوت مسجّل لمالك آخر. سجّل الدخول كمالك البوت أو استخدم توكن الربط الصادر لك.", "Unauthorized — this bot belongs to another owner. Log in as the bot owner or use your pairing token.") },
          { status: 403 }
        );
      }

      // إعادة بدء الربط: نحذف المفاتيح فقط إذا طلب المستخدم إعادة التعيين الصريحة (reset) وكان البوت غير متصل
      if (action === "reset" && bot.status !== "connected") {
        const admin2 = createAdmin();
        await admin2.from("bot_auth").delete().eq("bot_id", bot.id);
        await admin2.from("bot_keys").delete().eq("bot_id", bot.id);
      }

      // إيقاف أي بوتات مكررة أخرى لنفس الرقم فوراً لمنع تضارب أكواد الاقتران في واتساب
      await admin
        .from("bots")
        .update({ command: "stop", status: "disconnected", pair_code: null, qr: null })
        .or(`phone.eq.${digits},linked_number.eq.${digits}`)
        .neq("id", bot.id);

      const { error: upErr } = await admin
        .from("bots")
        .update({
          command: "start",
          qr: null,
          pair_code: null,
          status: "pending",
          phone: digits,
          link_method: "pair_code",
          metadata: { last_error: null, error_at: null, attempt: 0, request_restart: Date.now() },
        })
        .eq("id", bot.id);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      bot.command = "start";
      bot.status = "pending";
      bot.phone = digits;
      bot.link_method = "pair_code";
      bot.qr = null;
      bot.pair_code = null;
      bot.metadata = { last_error: null, error_at: null, attempt: 0 };
    }

    // انتظر قليلاً (حتى 3.5 ثوانٍ) في حال قام محرك Baileys في Termux بتوليد الكود فوراً
    if (bot && !bot.pair_code && bot.status === "pending") {
      for (let i = 0; i < 7; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const { data: refreshed } = await admin
          .from("bots")
          .select("id, user_id, name, status, command, link_method, pair_code, qr, linked_number, settings, phone, metadata")
          .eq("id", bot.id)
          .maybeSingle();
        if (refreshed?.pair_code || refreshed?.status === "connected") {
          bot = refreshed;
          break;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      bot: toBotPayload(bot, digits),
      pairCode: bot.pair_code || null,
      connectToken: signConnectToken(bot.id, digits),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
