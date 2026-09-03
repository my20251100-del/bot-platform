import { createClient } from "@/lib/supabase/server";
import MessagesClient from "./messages-client";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // جلب بوتات المستخدم
  const { data: bots } = await supabase
    .from("bots")
    .select("id, name, status, settings, linked_number, phone")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const activeBot = bots && bots.length > 0 ? bots[0] : null;

  let initialLogs: any[] = [];
  if (activeBot) {
    const { data: logs } = await supabase
      .from("bot_logs")
      .select("*")
      .eq("bot_id", activeBot.id)
      .in("event", ["incoming_message", "auto_replied", "smart_replied", "message_recovered"])
      .order("created_at", { ascending: false })
      .limit(100);
    initialLogs = logs ?? [];
  }

  return (
    <MessagesClient
      bots={bots ?? []}
      activeBot={activeBot}
      initialLogs={initialLogs}
    />
  );
}
