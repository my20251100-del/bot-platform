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

  const isLinked = !!bot.linked_number;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{bot.name}</h1>
        {isLinked ? (
          <p className="mt-1 flex items-center gap-2 text-sm text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span dir="ltr">+{bot.linked_number}</span>
            <span className="text-xs text-muted">(الرقم المتصل)</span>
          </p>
        ) : (
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span className="h-2 w-2 rounded-full bg-amber-400/80" />
            <span>غير مربوط بحساب واتساب بعد</span>
            {bot.phone && <span dir="ltr" className="text-xs text-muted/70">({bot.phone})</span>}
          </p>
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
          phone: bot.phone,
        }}
      />

      {!isLinked && (
        <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <p className="font-bold">تنبيه: البوت غير مربوط بواتساب حتى الآن</p>
            <p className="mt-0.5 text-xs text-amber-200/80">
              خيارات الأتمتة أدناه جاهزة للإعداد مسبقاً، وستبدأ بالعمل التلقائي فور ربط البوت في الأعلى بنجاح.
            </p>
          </div>
        </div>
      )}

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
