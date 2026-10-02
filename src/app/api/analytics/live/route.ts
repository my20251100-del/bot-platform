import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const startMs = Date.now();
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const admin = createAdmin();

    // 1. Fetch user's bots
    const { data: userBots, error: botsErr } = await admin
      .from("bots")
      .select("id, name, status, linked_number, phone")
      .eq("user_id", user.id);

    if (botsErr) throw botsErr;

    const botIds = (userBots || []).map((b) => b.id);
    if (botIds.length === 0) {
      return NextResponse.json({
        ok: true,
        stats: {
          todayRecovered: 0,
          todayStatusViews: 0,
          todayStatusReactions: 0,
          todayAiReplies: 0,
          totalLogs: 0,
        },
        chartData: getEmpty24hChart(),
        liveEvents: [],
        latencyMs: Date.now() - startMs,
      });
    }

    // 2. Compute timestamp for start of today (UTC midnight or 24h ago)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 3. Query logs for user's bots in the past 24 hours
    const { data: recentLogs, error: logsErr } = await admin
      .from("bot_logs")
      .select("id, bot_id, event, payload, created_at")
      .in("bot_id", botIds)
      .gte("created_at", twentyFourHoursAgo)
      .order("created_at", { ascending: false })
      .limit(300);

    if (logsErr) throw logsErr;

    const allLogs = recentLogs || [];

    // Filter today's logs
    const todayLogs = allLogs.filter((l) => l.created_at >= startOfToday);

    let todayRecovered = 0;
    let todayStatusViews = 0;
    let todayStatusReactions = 0;
    let todayAiReplies = 0;

    for (const log of todayLogs) {
      if (log.event === "message_recovered" || log.event === "viewonce_saved" || log.event === "anti_delete") {
        todayRecovered++;
      } else if (log.event === "status_viewed" || log.event === "status_handled") {
        todayStatusViews++;
      } else if (log.event === "status_reacted") {
        todayStatusReactions++;
      } else if (log.event === "smart_replied" || log.event === "ai_replied" || log.event === "keyword_replied") {
        todayAiReplies++;
      }
    }

    // 4. Generate 24-hour timeline buckets for chart
    const hourlyMap: Record<number, { statusViews: number; recovered: number; aiReplies: number }> = {};
    for (let h = 0; h < 24; h++) {
      hourlyMap[h] = { statusViews: 0, recovered: 0, aiReplies: 0 };
    }

    for (const log of allLogs) {
      const logHour = new Date(log.created_at).getHours();
      if (hourlyMap[logHour]) {
        if (log.event === "status_viewed" || log.event === "status_handled" || log.event === "status_reacted") {
          hourlyMap[logHour].statusViews++;
        } else if (log.event === "message_recovered" || log.event === "viewonce_saved" || log.event === "anti_delete") {
          hourlyMap[logHour].recovered++;
        } else if (log.event === "smart_replied" || log.event === "ai_replied" || log.event === "keyword_replied") {
          hourlyMap[logHour].aiReplies++;
        }
      }
    }

    const currentHour = now.getHours();
    const chartData = [];
    for (let i = 23; i >= 0; i--) {
      const h = (currentHour - i + 24) % 24;
      const hourLabel = `${String(h).padStart(2, "0")}:00`;
      chartData.push({
        hour: hourLabel,
        status: hourlyMap[h].statusViews,
        recovered: hourlyMap[h].recovered,
        ai: hourlyMap[h].aiReplies,
        total: hourlyMap[h].statusViews + hourlyMap[h].recovered + hourlyMap[h].aiReplies,
      });
    }

    // 5. Format Live Events for Feed
    const botMap = new Map(userBots.map((b) => [b.id, b.name]));
    const liveEvents = allLogs.slice(0, 30).map((l) => {
      const p = l.payload || {};
      let title = "نشاط جديد";
      let desc = "";
      let icon = "⚡";
      let color = "text-accent border-accent/30 bg-accent/10";

      if (l.event === "message_recovered") {
        title = "إنقاذ رسالة محذوفة 🗑️";
        desc = p.sender ? `من: ${p.sender.split("@")[0]}` : "تم استرجاع المحتوى بنجاح";
        icon = "🗑️";
        color = "text-rose-400 border-rose-500/30 bg-rose-500/10";
      } else if (l.event === "viewonce_saved") {
        title = "حفظ وسائط عرض مرة واحدة 👁️";
        desc = p.from ? `من: ${p.from.split("@")[0]}` : "تم حفظ الصورة قبل الحذف";
        icon = "📸";
        color = "text-amber-400 border-amber-500/30 bg-amber-500/10";
      } else if (l.event === "status_viewed" || l.event === "status_handled") {
        title = "مشاهدة حالة تلقائية 👁️";
        desc = p.name ? `${p.name} (${p.type || "حالة"})` : `${p.phone || "جهة اتصال"} (${p.type || "حالة"})`;
        icon = "👁️";
        color = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
      } else if (l.event === "status_reacted") {
        title = `تفاعل مع حالة (${p.emoji || "❤️"})`;
        desc = `لجهة الاتصال: +${p.phone || p.author?.split("@")[0] || ""}`;
        icon = p.emoji || "❤️";
        color = "text-pink-400 border-pink-500/30 bg-pink-500/10";
      } else if (l.event === "smart_replied" || l.event === "ai_replied") {
        title = "رد ذكي من الذكاء الاصطناعي 🧠";
        desc = p.reply ? `« ${p.reply.slice(0, 45)}... »` : "تم الرد على العميل";
        icon = "🧠";
        color = "text-purple-400 border-purple-500/30 bg-purple-500/10";
      } else if (l.event === "connected") {
        title = "اتصال البوت بنجاح ✅";
        desc = `البوت متصل وجاهز للعمل سحابياً`;
        icon = "⚡";
        color = "text-matrix border-matrix/30 bg-matrix/10";
      }

      return {
        id: l.id,
        botName: botMap.get(l.bot_id) || "البوت",
        title,
        desc,
        icon,
        color,
        createdAt: l.created_at,
      };
    });

    return NextResponse.json({
      ok: true,
      stats: {
        todayRecovered,
        todayStatusViews,
        todayStatusReactions,
        todayAiReplies,
        totalLogs: allLogs.length,
      },
      chartData,
      liveEvents,
      latencyMs: Date.now() - startMs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "خطأ أثناء معالجة الإحصائيات" }, { status: 500 });
  }
}

function getEmpty24hChart() {
  const currentHour = new Date().getHours();
  const arr = [];
  for (let i = 23; i >= 0; i--) {
    const h = (currentHour - i + 24) % 24;
    arr.push({
      hour: `${String(h).padStart(2, "0")}:00`,
      status: 0,
      recovered: 0,
      ai: 0,
      total: 0,
    });
  }
  return arr;
}
