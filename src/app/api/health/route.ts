import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const admin = createAdmin();

    // 1. Database Health Check & Latency
    const [botCount, botsStatus] = await Promise.all([
      admin.from("bots").select("id", { count: "exact", head: true }),
      admin.from("bots").select("status, command"),
    ]);

    const dbLatencyMs = Date.now() - startTime;
    const databaseStatus = botCount.error ? "down" : "healthy";

    // 2. Metrics from Database
    const totalBots = botCount.count || 0;
    const list = botsStatus.data || [];
    const connectedBots = list.filter((b) => b.status === "connected").length;
    const pendingBots = list.filter((b) => b.status === "pending").length;
    const activeCommandBots = list.filter((b) => b.command === "start").length;

    // 3. Process & Memory Metrics
    const memUsage = process.memoryUsage();
    const memory = {
      rssMb: Math.round(memUsage.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memUsage.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(memUsage.heapTotal / (1024 * 1024)),
    };

    const overallStatus = databaseStatus === "healthy" ? "healthy" : "degraded";

    return NextResponse.json({
      status: overallStatus,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        status: databaseStatus,
        latencyMs: dbLatencyMs,
        error: botCount.error ? botCount.error.message : null,
      },
      bots: {
        total: totalBots,
        connected: connectedBots,
        pending: pendingBots,
        activeWanted: activeCommandBots,
      },
      system: {
        memory,
        nodeVersion: process.version,
        platform: process.platform,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: err.message || "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}