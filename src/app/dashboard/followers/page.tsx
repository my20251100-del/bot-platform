import { createClient } from "@/lib/supabase/server";
import FollowForm from "./follow-form";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
};

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  done: "تمت المتابعة ✓",
  failed: "فشلت",
};

export default async function FollowersPage() {
  const supabase = await createClient();

  const { data: myBots } = await supabase.from("bots").select("id");
  const botIds = (myBots ?? []).map((b) => b.id);

  const followsQuery = supabase
    .from("channel_follows")
    .select("*")
    .in("bot_id", botIds.length ? botIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })
    .limit(50);

  const [{ data: follows }, { data: bots }] = await Promise.all([
    followsQuery,
    supabase.from("bots").select("id,name,status"),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold">زيادة متابعين القنوات</h1>
      <p className="mb-8 text-sm text-muted">
        ألصق رابط قناتك وسيقوم رقم بوتك بمتابعتها تلقائياً وزيادة عدد المتابعين.
        يمكنك تكرار العملية مع أرقام متعددة لكل عملية متابعة إضافية.
      </p>

      <FollowForm bots={bots ?? []} />

      <h2 className="mb-4 mt-10 text-lg font-semibold">طلباتك</h2>
      {!follows?.length ? (
        <div className="card p-10 text-center text-muted">لا توجد طلبات بعد.</div>
      ) : (
        <div className="card divide-y divide-border/60">
          {follows.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <h3 className="font-medium">
                  {f.channel_name || "قناة غير معروفة"}
                </h3>
                <a
                  href={f.link}
                  target="_blank"
                  rel="noreferrer"
                  dir="ltr"
                  className="block truncate text-sm text-muted hover:text-accent"
                >
                  {f.link}
                </a>
                {f.status === "failed" && f.error && (
                  <p dir="ltr" className="mt-1 truncate text-xs text-red-400">{f.error}</p>
                )}
                {f.status === "done" && (
                  <p className="text-xs text-muted">
                    {f.subscribers != null ? `${f.subscribers} متابع` : ""}
                  </p>
                )}
              </div>
              <span
                className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[f.status] ?? statusStyles.pending}`}
              >
                {statusLabels[f.status] ?? f.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
