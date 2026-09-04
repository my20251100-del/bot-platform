import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const admin = createAdmin();

    // 1. Database Health Check & Latency
    const { data: bots, error: dbErr } = await admin
      .from("bots")
      .select("id, status, command, updated_at")
      .limit(100);

    const dbLatencyMs = Date.now() - startTime;
    const databaseStatus = dbErr ? "down" : "healthy";

    // 2. Metrics from Database
    const totalBots = bots?.length || 0;
    const connectedBots = bots?.filter((b) => b.status === "connected").length || 0;
    const pendingBots = bots?.filter((b) => b.status === "pending").length || 0;
    const activeCommandBots = bots?.filter((b) => b.command === "start").length || 0;

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
        error: dbErr ? dbErr.message : null,
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