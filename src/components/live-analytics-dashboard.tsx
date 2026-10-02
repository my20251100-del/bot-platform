"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatedNumber, Reveal } from "@/components/ui/motion";

interface ChartPoint {
  hour: string;
  status: number;
  recovered: number;
  ai: number;
  total: number;
}

interface LiveEvent {
  id: number;
  botName: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
  createdAt: string;
}

interface LiveAnalyticsResponse {
  ok: boolean;
  stats: {
    todayRecovered: number;
    todayStatusViews: number;
    todayStatusReactions: number;
    todayAiReplies: number;
    totalLogs: number;
  };
  chartData: ChartPoint[];
  liveEvents: LiveEvent[];
  latencyMs: number;
}

export default function LiveAnalyticsDashboard() {
  const [data, setData] = useState<LiveAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [filterType, setFilterType] = useState<"all" | "status" | "recovered" | "ai">("all");
  const [isLiveActive, setIsLiveActive] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/live");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    if (!isLiveActive) return;
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, [fetchStats, isLiveActive]);

  const stats = data?.stats || {
    todayRecovered: 0,
    todayStatusViews: 0,
    todayStatusReactions: 0,
    todayAiReplies: 0,
    totalLogs: 0,
  };

  const chartData = data?.chartData || [];
  const maxVal = Math.max(1, ...chartData.map((d) => (filterType === "all" ? d.total : d[filterType])));

  // Helper for relative Arabic time
  const formatTimeAgo = (isoDate: string) => {
    const diffSec = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (diffSec < 15) return "الآن ⚡";
    if (diffSec < 60) return `منذ ${diffSec} ثانية`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    const diffHours = Math.floor(diffMin / 60);
    return `منذ ${diffHours} ساعة`;
  };

  return (
    <div className="my-8 rounded-3xl border border-accent/40 bg-gradient-to-b from-surface/95 via-surface/80 to-surface/40 p-5 sm:p-7 shadow-[0_12px_45px_rgba(0,0,0,0.6),0_0_35px_rgba(0,212,255,0.12)] backdrop-blur-2xl relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-accent/10 blur-[100px] pointer-events-none" />
      <div className="absolute -right-32 -bottom-32 h-72 w-72 rounded-full bg-matrix/10 blur-[100px] pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-accent/30 to-matrix/30 text-accent border border-accent/40 text-xl shadow-[0_0_15px_rgba(0,212,255,0.25)]">
              📊
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
                لوحة الإحصائيات التفاعلية الحية
                <span className="flex items-center gap-1.5 rounded-full bg-matrix/15 border border-matrix/40 px-2.5 py-0.5 text-[11px] font-bold text-matrix animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-matrix inline-block" />
                  مباشر 24/7
                </span>
              </h2>
              <p className="text-xs text-muted mt-0.5">
                تتبع فوري ومباشر لرسائل المحذوفات المسترجعة، تفاعل الحالات، والردود الذكية اليوم
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLiveActive(!isLiveActive)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              isLiveActive
                ? "border-accent/40 bg-accent/15 text-accent shadow-[0_0_12px_rgba(0,212,255,0.2)]"
                : "border-border text-muted hover:text-white"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isLiveActive ? "bg-accent animate-ping" : "bg-muted"}`} />
            {isLiveActive ? "التحديث التلقائي نشط" : "موقوف مؤقتاً"}
          </button>
          <button
            onClick={() => fetchStats()}
            className="rounded-xl border border-border/60 bg-elevated/60 p-2 text-muted hover:text-accent hover:border-accent/40 transition-all active:scale-95"
            title="تحديث فوري الآن"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}>
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 21h5v-5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* العدادات الإحصائية الـ 4 الحية */}
      <div className="relative z-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 my-6">
        {/* 1. رسائل محذوفة مسترجعة */}
        <div className="group rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-surface/90 to-surface/40 p-4 transition-all duration-300 hover:border-rose-400 hover:shadow-[0_0_25px_rgba(244,63,94,0.25)] hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300/90">محذوفات تم إنقاذها اليوم</span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/20 text-rose-400 text-lg border border-rose-500/30 group-hover:scale-110 transition-transform">
              🗑️
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="tech text-3xl font-extrabold text-white">
              <AnimatedNumber value={stats.todayRecovered} />
            </span>
            <span className="text-xs text-rose-400 font-semibold">رسالة / وسائط</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">استرجاع فوري للصور والنصوص المحذوفة</p>
        </div>

        {/* 2. حالات تمت مشاهدتها */}
        <div className="group rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-surface/90 to-surface/40 p-4 transition-all duration-300 hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300/90">حالات تمت مشاهدتها اليوم</span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 text-lg border border-emerald-500/30 group-hover:scale-110 transition-transform">
              👁️
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="tech text-3xl font-extrabold text-white">
              <AnimatedNumber value={stats.todayStatusViews} />
            </span>
            <span className="text-xs text-emerald-400 font-semibold">حالة رُصدت</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">تأكيد الرؤية وإشعار خاص فوري</p>
        </div>

        {/* 3. تفاعلات القلوب مع الحالات */}
        <div className="group rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/10 via-surface/90 to-surface/40 p-4 transition-all duration-300 hover:border-pink-400 hover:shadow-[0_0_25px_rgba(236,72,153,0.25)] hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-pink-300/90">تفاعلات مع الحالات</span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-pink-500/20 text-pink-400 text-lg border border-pink-500/30 group-hover:scale-110 transition-transform">
              ❤️
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="tech text-3xl font-extrabold text-white">
              <AnimatedNumber value={stats.todayStatusReactions} />
            </span>
            <span className="text-xs text-pink-400 font-semibold">تفاعل حقيقي</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">إعجاب فوري كـ Like بروتوكولي رسمي</p>
        </div>

        {/* 4. ردود الذكاء الاصطناعي */}
        <div className="group rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-surface/90 to-surface/40 p-4 transition-all duration-300 hover:border-purple-400 hover:shadow-[0_0_25px_rgba(168,85,247,0.25)] hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-300/90">ردود الذكاء الاصطناعي</span>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-500/20 text-purple-400 text-lg border border-purple-500/30 group-hover:scale-110 transition-transform">
              🧠
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="tech text-3xl font-extrabold text-white">
              <AnimatedNumber value={stats.todayAiReplies} />
            </span>
            <span className="text-xs text-purple-400 font-semibold">محادثة أوتوماتيكية</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">تحليل سياق الرسائل والرد بذكاء</p>
        </div>
      </div>

      {/* الرسم البياني التفاعلي الزمني (24 ساعة) */}
      <div className="relative z-10 rounded-2xl border border-border/70 bg-elevated/40 p-5 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📈 نشاط المحرك التراكمي خلال الـ 24 ساعة الماضية</span>
              {hoveredPoint && (
                <span className="text-xs text-accent font-mono bg-accent/15 px-2.5 py-0.5 rounded-full border border-accent/30">
                  الساعة {hoveredPoint.hour}: {hoveredPoint.total} عملية
                </span>
              )}
            </h3>
            <p className="text-xs text-muted mt-0.5">مرر الفأرة أو المس الأعمدة لمعاينة تفاصيل كل ساعة</p>
          </div>

          <div className="flex items-center gap-1.5 bg-surface/90 p-1 rounded-xl border border-border/60 text-xs">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === "all" ? "bg-accent text-bg font-bold shadow-[0_0_10px_rgba(0,212,255,0.4)]" : "text-muted hover:text-white"
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterType("status")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === "status" ? "bg-emerald-500 text-bg font-bold shadow-[0_0_10px_rgba(16,185,129,0.4)]" : "text-muted hover:text-white"
              }`}
            >
              👁️ الحالات
            </button>
            <button
              onClick={() => setFilterType("recovered")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === "recovered" ? "bg-rose-500 text-bg font-bold shadow-[0_0_10px_rgba(244,63,94,0.4)]" : "text-muted hover:text-white"
              }`}
            >
              🗑️ المحذوفات
            </button>
            <button
              onClick={() => setFilterType("ai")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === "ai" ? "bg-purple-500 text-bg font-bold shadow-[0_0_10px_rgba(168,85,247,0.4)]" : "text-muted hover:text-white"
              }`}
            >
              🧠 الذكاء
            </button>
          </div>
        </div>

        {/* SVG Dynamic Bar & Wave Chart */}
        <div className="relative h-44 w-full pt-4">
          <div className="absolute inset-x-0 bottom-6 top-2 flex items-end justify-between gap-1 sm:gap-2 px-1">
            {chartData.map((pt, idx) => {
              const currentVal = filterType === "all" ? pt.total : pt[filterType];
              const heightPct = Math.max(6, Math.round((currentVal / maxVal) * 100));
              const isHovered = hoveredPoint?.hour === pt.hour;

              let barColor = "from-accent/70 to-accent/20 border-accent/50";
              if (filterType === "status") barColor = "from-emerald-400/80 to-emerald-600/30 border-emerald-400/60";
              else if (filterType === "recovered") barColor = "from-rose-400/80 to-rose-600/30 border-rose-400/60";
              else if (filterType === "ai") barColor = "from-purple-400/80 to-purple-600/30 border-purple-400/60";

              return (
                <div
                  key={idx}
                  className="group relative flex-1 h-full flex flex-col justify-end items-center cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onClick={() => setHoveredPoint(pt)}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="absolute -top-16 z-30 whitespace-nowrap rounded-xl border border-accent/60 bg-surface p-2 shadow-2xl text-[11px] pointer-events-none">
                      <div className="font-bold text-accent">{pt.hour}</div>
                      <div className="text-white flex items-center gap-2 mt-0.5">
                        <span>👁️ {pt.status}</span>
                        <span>🗑️ {pt.recovered}</span>
                        <span>🧠 {pt.ai}</span>
                      </div>
                    </div>
                  )}

                  {/* Column Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[14px] rounded-t-lg bg-gradient-to-t border-t ${barColor} transition-all duration-300 ${
                      isHovered ? "brightness-125 scale-x-125 shadow-[0_0_15px_rgba(0,212,255,0.6)]" : "opacity-80 group-hover:opacity-100"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* X Axis Time Labels */}
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-muted font-mono px-2 border-t border-border/50 pt-1">
            <span>منذ 24 ساعة</span>
            <span>منذ 18 ساعة</span>
            <span>منذ 12 ساعة</span>
            <span>منذ 6 ساعات</span>
            <span className="text-accent font-bold">الآن ⚡</span>
          </div>
        </div>
      </div>

      {/* النبض الحي (Live Event Feed Ticker) */}
      <div className="relative z-10 mt-6 rounded-2xl border border-border/60 bg-elevated/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-matrix opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-matrix"></span>
            </span>
            <span>سجل العمليات والنبض الحي (Live Feed)</span>
          </h3>
          <span className="text-[11px] text-muted font-mono">آخر 30 حدث ملتقط</span>
        </div>

        {(!data?.liveEvents || data.liveEvents.length === 0) ? (
          <div className="text-center py-6 text-xs text-muted">
            لا توجد أحداث مسجلة بعد — المحرك متصل وبانتظار وصول الحالات أو الرسائل المسترجعة.
          </div>
        ) : (
          <div className="grid gap-2.5 max-h-72 overflow-y-auto pr-1">
            {data.liveEvents.slice(0, 10).map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-surface/70 px-3.5 py-2.5 transition-colors hover:border-accent/40 hover:bg-surface"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl border text-sm ${ev.color}`}>
                    {ev.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{ev.title}</span>
                      <span className="rounded bg-elevated px-1.5 py-0.2 text-[10px] text-accent/80 font-mono">
                        {ev.botName}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted truncate mt-0.5">{ev.desc}</p>
                  </div>
                </div>

                <span className="flex-shrink-0 text-[10px] text-muted/80 font-mono">
                  {formatTimeAgo(ev.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
