import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import MediaVaultClient from "./media-vault-client";

export const dynamic = "force-dynamic";

export default async function MediaVaultPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdmin();

  // 1. Fetch user bots
  const { data: userBots } = await admin
    .from("bots")
    .select("id, name, phone, linked_number")
    .eq("user_id", user.id);

  const botIds = (userBots || []).map((b) => b.id);
  const botNames: Record<string, string> = {};
  for (const b of userBots || []) {
    botNames[b.id] = b.name || "البوت";
  }

  if (botIds.length === 0) {
    return <MediaVaultClient initialItems={[]} botNames={botNames} />;
  }

  // 2. Fetch logs related to recovered messages and saved view-once media
  const { data: logs } = await admin
    .from("bot_logs")
    .select("id, bot_id, event, payload, created_at")
    .in("bot_id", botIds)
    .in("event", ["message_recovered", "viewonce_saved", "anti_delete", "viewonce_bypassed"])
    .order("created_at", { ascending: false })
    .limit(100);

  const formattedItems = (logs || []).map((l) => {
    const p = l.payload || {};
    const sender = p.sender || p.from || "";
    const senderPhone = (sender.split("@")[0] || "").replace(/\D/g, "");
    const senderName = p.name || senderPhone || "";
    const chatType = p.chat && p.chat.includes("@g.us") ? "مجموعة 👥" : "محادثة خاصة 👤";
    const messageText = p.text || p.content || p.caption || "";

    let mediaType = "نص";
    if (l.event === "viewonce_saved") {
      mediaType = "عرض لمرة واحدة (View Once) 👁️";
    } else if (p.mediaType) {
      mediaType = p.mediaType;
    } else if (p.hasMedia || !messageText) {
      mediaType = "صورة / وسائط / صوت 📎";
    }

    return {
      id: l.id,
      botId: l.bot_id,
      botName: botNames[l.bot_id] || "البوت",
      event: l.event,
      sender,
      senderPhone,
      senderName,
      chatType,
      messageText,
      mediaType,
      createdAt: l.created_at,
    };
  });

  return <MediaVaultClient initialItems={formattedItems} botNames={botNames} />;
}
