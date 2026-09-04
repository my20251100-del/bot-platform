import { createClient } from "@/lib/supabase/server";
import LogsClient, { LogItem } from "./logs-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "سجل العمليات | بوت برو",
  description: "سجل العمليات الموحد لجميع بوتات واتساب الخاصة بك",
};

export default async function DashboardLogsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch user's bots
  const { data: bots } = await supabase
    .from("bots")
    .select("id, name")
    .eq("user_id", user.id);

  const userBotIds = (bots || []).map((b) => b.id);

  if (userBotIds.length === 0) {
    return (
      <div className="card p-12 text-center text-muted">
        <span className="text-4xl">🤖</span>
        <h2 className="mt-3 text-lg font-bold text-fg">لم تقم بإنشاء أي بوت بعد</h2>
        <p className="mt-1 text-sm">أنشئ بوتاً جديداً أولاً لتشاهد سجل العمليات والتفاعلات.</p>
      </div>
    );
  }

  // 2. Fetch logs for user's bots
  const { data: logs } = await supabase
    .from("bot_logs")
    .select("id, bot_id, event, payload, created_at")
    .in("bot_id", userBotIds)
    .order("created_at", { ascending: false })
    .limit(200);

  return <LogsClient initialLogs={(logs as LogItem[]) || []} bots={bots || []} />;
}
