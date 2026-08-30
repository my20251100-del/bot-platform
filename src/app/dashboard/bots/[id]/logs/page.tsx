import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const eventLabels: Record<string, string> = {
  connected: "🔗 اتصال",
  logged_out: "🚪 خروج",
  status_handled: "👁️ حالة شوُهدت",
  message_recovered: "🗑️ محذوفة مسترجعة",
  message_deleted: "حذف مرصود",
  view_once_saved: "🙈 نظرة واحدة محفوظة",
  channel_followed: "📡 متابعة قناة",
  scheduled_sent: "⏰ منشور مجدول أُرسل",
  auto_replied: "💬 رد تلقائي",
  smart_replied: "🤖 رد ذكي",
  command_used: "⌨️ أمر",
  member_welcomed: "👋 ترحيب عضو",
  member_farewell: "🚶 وداع عضو",
  auto_forwarded: "🔁 إعادة نشر",
  contact_seen: "📇 رقم جديد",
};

function summarize(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
    if (v == null) continue;
    parts.push(`${k}: ${String(v).slice(0, 60)}`);
  }
  return parts.join(" · ");
}

export default async function LogsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: bot }, { data: logs }] = await Promise.all([
    supabase.from("bots").select("name").eq("id", id).single(),
    supabase
      .from("bot_logs")
      .select("*")
      .eq("bot_id", id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (!bot) notFound();

  const counts: Record<string, number> = {};
  for (const l of logs ?? []) counts[l.event] = (counts[l.event] ?? 0) + 1;

  const highlights = [
    "status_handled",
    "message_recovered",
    "view_once_saved",
    "smart_replied",
    "auto_replied",
    "channel_followed",
    "member_welcomed",
    "scheduled_sent",
  ].filter((e) => counts[e]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/dashboard/bots/${id}`}
        className="mb-4 inline-block text-sm text-muted hover:text-white"
      >
        ← رجوع إلى البوت
      </Link>
      <h1 className="mb-8 text-2xl font-bold">سجل وإحصائيات {bot.name}</h1>

      {!logs?.length ? (
        <div className="card p-10 text-center text-muted">
          لا توجد أحداث بعد — شغّل المحرك وستتجمع الإحصائيات هنا تلقائياً.
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-lg font-semibold">الإحصائيات (آخر 500 حدث)</h2>
          <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-accent">{logs.length}</p>
              <p className="mt-1 text-xs text-muted">إجمالي الأحداث</p>
            </div>
            {highlights.map((e) => (
              <div key={e} className="card p-4 text-center">
                <p className="text-3xl font-bold">{counts[e]}</p>
                <p className="mt-1 text-xs text-muted">{eventLabels[e] ?? e}</p>
              </div>
            ))}
          </div>

          <h2 className="mb-3 text-lg font-semibold">آخر الأحداث</h2>
          <div className="card divide-y divide-border/60">
            {logs.slice(0, 80).map((l) => (
              <div key={l.id} className="flex items-start justify-between gap-4 p-3.5">
                <div className="min-w-0">
                  <p className="font-medium">{eventLabels[l.event] ?? l.event}</p>
                  <p dir="ltr" className="truncate text-right text-xs text-muted">
                    {summarize(l.payload)}
                  </p>
                </div>
                <time className="flex-shrink-0 text-xs text-muted">
                  {new Date(l.created_at).toLocaleString("ar", {
                    day: "numeric",
                    month: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
