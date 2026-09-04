"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";

export type LogItem = {
  id: number;
  bot_id: string;
  event: string;
  payload: any;
  created_at: string;
  bot_name?: string;
};

const categoryMap: Record<string, "connect" | "ai" | "status" | "security" | "error" | "other"> = {
  connected: "connect",
  logged_out: "connect",
  reconnecting: "connect",
  connection_failed: "error",
  pairing_expired: "connect",
  invalid_session: "error",
  smart_replied: "ai",
  auto_replied: "ai",
  status_handled: "status",
  view_once_saved: "security",
  message_recovered: "security",
  message_deleted: "security",
  security_blocked: "security",
  call_rejected: "security",
  command_used: "other",
  channel_followed: "other",
  scheduled_sent: "other",
};

const eventBadgeStyles: Record<string, string> = {
  connected: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  logged_out: "bg-red-500/15 text-red-400 border-red-500/30",
  reconnecting: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  connection_failed: "bg-red-500/15 text-red-400 border-red-500/30",
  pairing_expired: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  smart_replied: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  auto_replied: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  status_handled: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  view_once_saved: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  message_recovered: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  security_blocked: "bg-red-500/15 text-red-400 border-red-500/30",
  call_rejected: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

export default function LogsClient({
  initialLogs,
  bots,
}: {
  initialLogs: LogItem[];
  bots: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBotId, setSelectedBotId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, router]);

  const botNameMap = useMemo(() => {
    const map = new Map<string, string>();
    bots.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [bots]);

  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      // Category filter
      if (selectedCategory !== "all") {
        const cat = categoryMap[log.event] || "other";
        if (cat !== selectedCategory) return false;
      }

      // Bot filter
      if (selectedBotId !== "all" && log.bot_id !== selectedBotId) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const payloadStr = JSON.stringify(log.payload || {}).toLowerCase();
        const eventStr = log.event.toLowerCase();
        const botName = (botNameMap.get(log.bot_id) || "").toLowerCase();
        return payloadStr.includes(q) || eventStr.includes(q) || botName.includes(q);
      }

      return true;
    });
  }, [initialLogs, selectedCategory, selectedBotId, searchQuery, botNameMap]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>📜</span>
            <span>سجل العمليات المركزي (System Logs)</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            مراقبة وتتبع أحداث وتفاعلات جميع بوتاتك المربوطة لحظة بلحظة مع عزل أمني تام
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              autoRefresh
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-border bg-surface text-muted"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-muted"}`} />
            {autoRefresh ? "تحديث تلقائي (شغال)" : "تحديث تلقائي (متوقف)"}
          </button>

          <button
            onClick={() => router.refresh()}
            className="rounded-xl border border-border bg-elevated px-3 py-1.5 text-xs text-muted hover:text-white transition"
          >
            🔄 تحديث الآن
          </button>
        </div>
      </div>

      {/* Categories & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex overflow-x-auto gap-2 p-1 bg-surface/50 border border-border/80 rounded-xl">
          {[
            { id: "all", label: "الجميع", icon: "🌐" },
            { id: "connect", label: "الاتصال والربط", icon: "🔗" },
            { id: "ai", label: "الذكاء والردود", icon: "🤖" },
            { id: "status", label: "الحالات والتفاعل", icon: "👁️" },
            { id: "security", label: "الأمان والمحذوفات", icon: "🛡️" },
            { id: "error", label: "الأخطاء", icon: "⚠️" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedCategory === c.id
                  ? "bg-accent text-accent-fg shadow-[0_0_10px_rgba(0,212,255,0.3)]"
                  : "text-muted hover:text-white"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Bot selector */}
        {bots.length > 1 && (
          <select
            value={selectedBotId}
            onChange={(e) => setSelectedBotId(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-muted focus:border-accent focus:outline-none"
          >
            <option value="all">جميع البوتات ({bots.length})</option>
            {bots.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        {/* Search input */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="بحث في الرسائل أو الأحداث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-fg placeholder:text-muted/60 focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Logs Table / Stream */}
      <div className="card overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted">
            <span className="text-3xl">📭</span>
            <p className="mt-2 font-medium">لا توجد سجلات تطابق الفلتر الحالي</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filteredLogs.map((log) => {
              const badgeClass = eventBadgeStyles[log.event] || "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
              const botName = botNameMap.get(log.bot_id) || "بوتي";
              const time = new Date(log.created_at).toLocaleTimeString("ar-EG", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              const date = new Date(log.created_at).toLocaleDateString("ar-EG", {
                month: "short",
                day: "numeric",
              });

              return (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-elevated/30 transition">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`rounded-lg border px-2.5 py-1 text-xs font-mono font-bold whitespace-nowrap ${badgeClass}`}>
                      {log.event}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-accent">{botName}</span>
                        <span className="text-[11px] text-muted">·</span>
                        <span className="text-[11px] text-muted" dir="ltr">{date} {time}</span>
                      </div>

                      <div className="mt-1 text-xs text-muted/90 break-words font-mono">
                        {log.payload ? (
                          <span>
                            {Object.entries(log.payload)
                              .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                              .join(" · ")}
                          </span>
                        ) : (
                          <span className="italic text-muted/50">بدون بيانات إضافية</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
