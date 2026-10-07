import { NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || "hatem_x_token_940870";

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
          if (messageText.trim() === "940870" || messageText.includes("رمز التفعيل")) {
            console.log(`[Instagram DM] Passcode detected from ${senderId}`);
          }

          // تسجيل الحدث في سجلات المنصة
          try {
            const admin = createAdmin();
            await admin.from("bot_logs").insert({
              event_type: "instagram_dm",
              details: {
                senderId,
                recipientId,
                text: messageText,
                platform: "instagram",
              },
            });
          } catch {}
        }

        // تفاعلات ومشاركات الستوري (Story Mentions / Replies)
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === "story_insights" || change.field === "mentions") {
            console.log("[Instagram Story Event]:", change);
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
