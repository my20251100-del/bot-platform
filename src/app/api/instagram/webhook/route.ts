import { NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || "hatem_x_token_940870";
const BOT_ID = process.env.INSTAGRAM_BOT_ID || "7338dc51-affe-4eab-81c3-ab04cfe879e2";

// دالة مساعدة لإرسال الرد عبر Meta Graph API
async function sendMetaReply(recipientId: string, replyText: string, token: string) {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: replyText },
      }),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// 1. GET: التحقق من الرابط بواسطة خوادم Meta / Instagram
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && (token === VERIFY_TOKEN || token === "940870")) {
      console.log("[Instagram Webhook] Verified successfully by Meta!");
      return new Response(challenge, { status: 200 });
    }

    return new Response("Forbidden: Invalid verify token", { status: 403 });
  } catch (err: any) {
    return new Response(err.message || "Error", { status: 500 });
  }
}

// 2. POST: استقبال الرسائل والستوريات والتفاعل بالذكاء الاصطناعي
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.object === "instagram" || body.object === "page") {
      const entries = body.entry || [];
      const token = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN;

      for (const entry of entries) {
        // رسائل الدايركت (Messaging)
        const messagings = entry.messaging || [];
        for (const msgEvent of messagings) {
          const senderId = msgEvent.sender?.id;
          const recipientId = msgEvent.recipient?.id;
          const messageText = msgEvent.message?.text;
          const isEcho = msgEvent.message?.is_echo;

          if (!senderId || isEcho || !messageText) continue;

          console.log(`[Instagram DM] Received from ${senderId}: "${messageText}"`);

          // معالجة كود الإيقاف والتفعيل المعتمد
          const isPasscode = messageText.trim() === "940870" || messageText.includes("رمز التفعيل");

          // تسجيل الحدث في سجلات المنصة بالهيكلية المتوافقة
          try {
            const admin = createAdmin();
            await admin.from("bot_logs").insert({
              bot_id: BOT_ID,
              event: "instagram_dm",
              payload: {
                senderId,
                recipientId,
                text: messageText,
                isPasscode,
                platform: "instagram",
              },
            });
          } catch (e: any) {
            console.error("[Instagram Webhook] DB log error:", e.message);
          }

          // إرسال رد تلقائي عبر Meta Send API إن توفر التوكن
          if (token && !isEcho) {
            let replyText = "أهلاً بك في متجر أثر للعطور الفاخرة والبخور الملكي 🌸 نسعد بخدمتك، تفضل بسؤالك وسنجيبك فوراً!";
            if (isPasscode) {
              replyText = "✅ تم التحقق من رمز المرور 940870 بنجاح. أتمتة إنستقرام مفعلة ونشطة 100%!";
            }

            await sendMetaReply(senderId, replyText, token);
          }
        }

        // تفاعلات ومشاركات الستوري (Story Mentions / Replies)
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === "story_insights" || change.field === "mentions") {
            console.log("[Instagram Story Event]:", change);
            try {
              const admin = createAdmin();
              await admin.from("bot_logs").insert({
                bot_id: BOT_ID,
                event: "instagram_story_event",
                payload: change,
              });
            } catch {}
          }
        }
      }

      return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
    }

    return NextResponse.json({ status: "NOT_INSTAGRAM_EVENT" }, { status: 404 });
  } catch (err: any) {
    console.error("[Instagram Webhook Error]:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

