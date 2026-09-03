import { createClient } from "@/lib/supabase/server";
import StatusClient from "./status-client";

export const dynamic = "force-dynamic";

export default async function StatusHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: bots } = await supabase
    .from("bots")
    .select("id, name, status, settings, linked_number, phone")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const activeBot = bots && bots.length > 0 ? bots[0] : null;

  let initialStatusLogs: any[] = [];
  if (activeBot) {
    const { data: logs } = await supabase
      .from("bot_logs")
      .select("*")
      .eq("bot_id", activeBot.id)
      .in("event", ["status_handled", "message_recovered", "view_once_saved"])
      .order("created_at", { ascending: false })
      .limit(100);
    initialStatusLogs = logs ?? [];
  }

  return (
    <StatusClient
      bots={bots ?? []}
      activeBot={activeBot}
      initialLogs={initialStatusLogs}
    />
  );
}
