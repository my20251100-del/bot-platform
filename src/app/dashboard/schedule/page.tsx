import { createClient } from "@/lib/supabase/server";
import ScheduleForm from "./schedule-form";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  sent: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
};

const statusLabels: Record<string, string> = {
  pending: "بانتظار الوقت",
  sent: "أُرسل ✓",
  failed: "فشل",
};

export default async function SchedulePage() {
  const supabase = await createClient();

  const [{ data: posts }, { data: bots }] = await Promise.all([
    supabase
      .from("scheduled_posts")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(50),
    supabase.from("bots").select("id,name,linked_number"),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold">مجدول النشر</h1>
      <p className="mb-8 text-sm text-muted">
        اكتب حالتك أو رسالتك الآن وحدد الموعد — سيرسلها البوت تلقائياً حتى لو كنت نائماً.
      </p>

      <ScheduleForm bots={bots ?? []} />

      <h2 className="mb-4 mt-10 text-lg font-semibold">منشوراتك</h2>
      {!posts?.length ? (
        <div className="card p-10 text-center text-muted">لا توجد منشورات مجدولة بعد.</div>
      ) : (
        <div className="card divide-y divide-border/60">
          {posts.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="font-medium">{p.kind === "message" ? `💬 رسالة إلى ${p.target?.split("@")[0]}` : "📸 حالة"}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{p.body}</p>
                {p.error && <p dir="ltr" className="text-xs text-red-400">{p.error}</p>}
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[p.status] ?? statusStyles.pending}`}>
                  {statusLabels[p.status] ?? p.status}
                </span>
                <time className="text-xs text-muted">
                  {new Date(p.run_at).toLocaleString("ar", {
                    day: "numeric",
                    month: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
