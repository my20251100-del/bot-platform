import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BotDetailView from "./bot-detail-view";

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
      <div className="mb-6">
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

      <BotDetailView bot={bot} isLinked={isLinked} />
    </div>
  );
}

