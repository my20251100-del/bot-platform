import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

const getAdmin = () => createAdmin();

async function updateBot(botId: string, patch: Record<string, any>) {
  const { error } = await getAdmin().from("bots").update(patch).eq("id", botId);
  if (error) console.error(`[cron] updateBot ${botId}:`, error.message);
}

async function addLog(botId: string, event: string, payload: any = null) {
  await getAdmin().from("bot_logs").insert({ bot_id: botId, event, payload });
}

async function sendMessageViaSupabase(botId: string, toNumber: string, message: string) {
  const digits = String(toNumber).replace(/\D/g, "").replace(/^0+/, "");
  const { error } = await getAdmin().from("notify_queue").insert({
    to_number: digits,
    message,
    bot_id: botId,
    status: "pending",
  });
  if (error) console.error("[cron] notify_queue insert:", error.message);
}

async function processNotifyQueue() {
  // تنظيف السجلات القديمة المنتهية بدلاً من وضع "sent" زائفاً
  const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  try {
    await getAdmin()
      .from("notify_queue")
      .delete()
      .eq("status", "sent")
      .lte("claimed_at", oneDayAgo);
  } catch {}
}

async function processScheduledPosts() {
  const now = new Date().toISOString();
  const { data: posts, error } = await getAdmin()
    .from("scheduled_posts")
    .select("*")
    .eq("status", "pending")
    .lte("run_at", now)
    .limit(10);

  if (error) {
    console.error("[cron] scheduled_posts:", error.message);
    return;
  }

  for (const post of posts ?? []) {
    try {
      const targetNumber = post.target || post.to_number || "";
      const messageBody = post.body || post.message || "";
      if (targetNumber && messageBody) {
        await sendMessageViaSupabase(post.bot_id, targetNumber, messageBody);
      }
      await getAdmin()
        .from("scheduled_posts")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", post.id);
      await addLog(post.bot_id, "scheduled_sent", { kind: post.kind });
    } catch (e: any) {
      await getAdmin()
        .from("scheduled_posts")
        .update({ status: "failed", error: e.message })
        .eq("id", post.id);
      console.error("[cron] scheduled_posts failed:", e.message);
    }
  }
}

async function processChannelFollows() {
  const { data: follows, error } = await getAdmin()
    .from("channel_follows")
    .select("*")
    .eq("status", "pending")
    .limit(10);

  if (error) {
    console.error("[cron] channel_follows:", error.message);
    return;
  }

  for (const f of follows ?? []) {
    try {
      await getAdmin()
        .from("channel_follows")
        .update({ status: "processing" })
        .eq("id", f.id);

      await addLog(f.bot_id, "channel_follow_queued", {
        link: f.link,
        note: "follow queued for engine",
      });

      await getAdmin()
        .from("channel_follows")
        .update({ status: "queued", queued_at: new Date().toISOString() })
        .eq("id", f.id);
    } catch (e: any) {
      await getAdmin()
        .from("channel_follows")
        .update({ status: "failed", error: e.message })
        .eq("id", f.id);
      console.error("[cron] channel_follows failed:", e.message);
    }
  }
}

async function processBotCommands() {
  const { data: bots, error } = await getAdmin().from("bots").select("*");
  if (error) {
    console.error("[cron] bots poll:", error.message);
    return;
  }

  for (const bot of bots ?? []) {
    if (bot.command === "unlink" && bot.status !== "disconnected") {
      await updateBot(bot.id, {
        command: "stop",
        status: "disconnected",
        linked_number: null,
        qr: null,
        pair_code: null,
      });
      await addLog(bot.id, "unlink_queued");
    }
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isVercelCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  try {
    await Promise.all([
      processNotifyQueue(),
      processScheduledPosts(),
      processChannelFollows(),
      processBotCommands(),
    ]);

    return NextResponse.json({
      ok: true,
      duration_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("[cron] fatal:", e.message);
    return NextResponse.json(
      { ok: false, error: e.message, duration_ms: Date.now() - start },
      { status: 500 }
    );
  }
}