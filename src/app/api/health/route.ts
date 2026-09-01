import { NextRequest, NextResponse } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const admin = createAdmin();
    const { error } = await admin.from("bots").select("id").limit(1);
    const database = error ? "disconnected" : "connected";
    // يمكن إضافة فحص ENGINE URL إن وُجد متغير ENGINE_URL
    const engineConfigured = !!process.env.ENGINE_URL;
    const engine = engineConfigured ? "configured" : "not_configured";

    return NextResponse.json({
      status: database === "connected" ? "ok" : "degraded",
      database,
      engine,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { status: "error", database: "disconnected", engine: "unknown", error: e.message },
      { status: 500 }
    );
  }
}