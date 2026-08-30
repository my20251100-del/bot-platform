import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BotSettings from "./bot-settings";
import BotConnect from "./bot-connect";

export const dynamic = "force-dynamic";

export default async function BotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: bot } = await supabase
    .from("bots")
    .select("*")
    .eq("id", id)
    .single();

  if (!bot) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{bot.name}</h1>
        {bot.phone && (
          <p dir="ltr" className="mt-1 text-right text-sm text-muted">{bot.phone}</p>
        )}
      </div>

      <BotConnect
        initial={{
          id: bot.id,
          status: bot.status,
          command: bot.command,
          link_method: bot.link_method,
          pair_code: bot.pair_code,
          qr: bot.qr,
          linked_number: bot.linked_number,
        }}
      />

      <BotSettings
        botId={bot.id}
        initial={{
          autoReply: bot.settings?.autoReply ?? false,
          autoReplyMessage: bot.settings?.autoReplyMessage ?? "",
          antiDelete: bot.settings?.antiDelete ?? false,
          autoViewStatus: bot.settings?.autoViewStatus ?? false,
          autoReactStatus: bot.settings?.autoReactStatus ?? false,
          antiViewOnce: bot.settings?.antiViewOnce ?? false,
          autoReact: bot.settings?.autoReact ?? false,
          reactEmoji: bot.settings?.reactEmoji ?? "❤️",
          privacyMode: bot.settings?.privacyMode ?? false,
          contactAutoSave: bot.settings?.contactAutoSave ?? false,
          welcomeGroups: bot.settings?.welcomeGroups ?? false,
          welcomeMessage: bot.settings?.welcomeMessage ?? "",
          farewellGroups: bot.settings?.farewellGroups ?? false,
          farewellMessage: bot.settings?.farewellMessage ?? "",
          smartReply: bot.settings?.smartReply ?? false,
          businessInfo: bot.settings?.businessInfo ?? "",
          autoForward: bot.settings?.autoForward ?? false,
          forwardSource: bot.settings?.forwardSource ?? "",
          forwardTargets: bot.settings?.forwardTargets ?? "",
          firewallOn: bot.settings?.firewallOn ?? false,
          firewallDomains: Array.isArray(bot.settings?.firewallDomains) ? bot.settings.firewallDomains : [],
          dictionaryOn: bot.settings?.dictionaryOn ?? false,
          bannedWords: Array.isArray(bot.settings?.bannedWords) ? bot.settings.bannedWords : [],
          rejectCalls: bot.settings?.rejectCalls ?? false,
          showOnline: bot.settings?.showOnline ?? false,
          antiEdit: bot.settings?.antiEdit ?? false,
          antiMention: bot.settings?.antiMention ?? false,
          workMode: bot.settings?.workMode ?? "public",
        }}
      />

      <div className="mt-8 flex items-center gap-3">
        <a href={`/dashboard/bots/${bot.id}/logs`} className="btn-primary">
          📜 السجل والإحصائيات
        </a>
      </div>
    </div>
  );
}
