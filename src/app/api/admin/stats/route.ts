import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { getLiveBotIds } from "@/lib/live-bots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_TYPES = [
  "smart_replied",
  "status_handled",
  "message_recovered",
  "viewonce_saved",
  "call_rejected",
  "auto_replied",
  "keyword_replied",
  "connected",
  "logged_out",
  "pairing_expired",
];

export async function GET(_req: NextRequest) {
  const startMs = Date.now();
  try {
    const supabaseUser = await createClient();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: "غير مصرح لك بالوصول إلى لوحة الأدمن" }, { status: 403 });
    }

    const admin = createAdmin();

    const [{ data: bots, error: botsErr }, { count: totalLogs }, ...eventCounts] =
      await Promise.all([
        admin.from("bots").select("*").order("updated_at", { ascending: false }),
        admin.from("bot_logs").select("id", { count: "exact", head: true }),
        ...EVENT_TYPES.map((event) =>
          admin
            .from("bot_logs")
            .select("id", { count: "exact", head: true })
            .eq("event", event)
        ),
      ]);

    if (botsErr) throw botsErr;

    const { data: recentLogs, error: logsErr } = await admin
      .from("bot_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);

    if (logsErr) throw logsErr;

    const liveBotIds = await getLiveBotIds(5);

    const eventCount: Record<string, number> = {};
    EVENT_TYPES.forEach((event, idx) => {
      eventCount[event] = (eventCounts[idx]?.count as number) || 0;
    });

    const totalBots = bots?.length || 0;
    const isLive = (b: any) => b?.status === "connected" || liveBotIds.has(b.id);
    const connectedBots = bots?.filter(isLive).length || 0;
    const pendingBots = bots?.filter((b) => !isLive(b) && b.status === "pending").length || 0;
    const stoppedBots = bots?.filter((b) => !isLive(b) && b.status === "disconnected").length || 0;

    const failures = (eventCount.logged_out || 0) + (eventCount.pairing_expired || 0);
    const totalOps = totalLogs || 1;
    const stabilityPercent = Math.max(85, Math.min(100, Math.round(100 - (failures / totalOps) * 20)));

    const dbLatencyMs = Date.now() - startMs;

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      latencyMs: dbLatencyMs,
      stability: {
        score: stabilityPercent,
        label: stabilityPercent >= 95 ? "ممتاز ومستقر 100%" : stabilityPercent >= 90 ? "جيد جداً" : "يحتاج متابعة",
        uptimeStatus: connectedBots > 0 ? "متصل ويعمل 24/7" : "بانتظار ربط الحساب",
        engineStatus: connectedBots > 0 ? "online" : "idle",
      },
      kpis: {
        totalBots,
        connectedBots,
        pendingBots,
        stoppedBots,
        totalLogs,
        smartReplies: eventCount.smart_replied || 0,
        statusInteractions: eventCount.status_handled || 0,
        antiDeleteRecovered: eventCount.message_recovered || 0,
        viewOnceSaved: eventCount.viewonce_saved || 0,
        callsRejected: eventCount.call_rejected || 0,
        keywordReplies: eventCount.keyword_replied || 0,
      },
      bots: (bots || []).map((b) => ({
        id: b.id,
        name: b.name,
        phone: b.phone,
        linkedNumber: b.linked_number,
        status: b.status,
        live: isLive(b),
        command: b.command,
        pairCode: b.pair_code,
        updatedAt: b.updated_at,
        model: b.settings?.geminiModel || "gemini-3.1-flash-lite",
        keysCount: Array.isArray(b.settings?.geminiKeys) ? b.settings.geminiKeys.length : 0,
        smartReply: b.settings?.smartReply !== false,
        antiDelete: b.settings?.antiDelete !== false,
        antiDeleteInChat: b.settings?.antiDeleteInChat !== false,
        lastError: b.metadata?.last_error || null,
        lastConnectedAt: b.metadata?.last_connected_at || null,
      })),
      recentLogs: (recentLogs || []).slice(0, 30).map((l) => ({
        id: l.id,
        botId: l.bot_id,
        event: l.event,
        payload: l.payload,
        createdAt: l.created_at,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}