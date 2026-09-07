"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface StatData {
  ok: boolean;
  timestamp: string;
  latencyMs: number;
  stability: {
    score: number;
    label: string;
    uptimeStatus: string;
    engineStatus: string;
  };
  kpis: {
    totalBots: number;
    connectedBots: number;
    pendingBots: number;
    stoppedBots: number;
    totalLogs: number;
    smartReplies: number;
    statusInteractions: number;
    antiDeleteRecovered: number;
    viewOnceSaved: number;
    callsRejected: number;
    keywordReplies: number;
  };
  bots: Array<{
    id: string;
    name: string;
    phone: string | null;
    linkedNumber: string | null;
    status: string;
    command: string;
    live: boolean;
    pairCode: string | null;
    updatedAt: string;
    model: string;
    keysCount: number;
    smartReply: boolean;
    antiDelete: boolean;
    antiDeleteInChat: boolean;
    lastError: string | null;
    lastConnectedAt: string | null;
  }>;
  recentLogs: Array<{
    id: number;
    botId: string;
    event: string;
    payload: any;
    createdAt: string;
  }>;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<StatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/stats`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "تعذر جلب البيانات");
      }
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchData, 0);
    if (!autoRefresh) return () => clearTimeout(timer);
    const interval = setInterval(fetchData, 4000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchData, autoRefresh]);

  const runAction = async (botId: string, action: "start" | "stop") => {
    setBusyId(botId);
    try {
      const res = await fetch(`/api/bot/${botId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: action }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "فشل تنفيذ الإجراء");
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const removeBot = async (botId: string, botName: string) => {
    if (!window.confirm(`حذف البوت «${botName}» نهائياً؟ لا يمكن التراجع.`)) return;
    setBusyId(botId);
    try {
      const res = await fetch(`/api/bot/${botId}`, { method: "DELETE" });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "فشل حذف البوت");
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const eventBadge = (event: string) => {
    switch (event) {
      case "smart_replied":
        return { label: "رد ذكي (AI)", bg: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" };
      case "status_handled":
        return { label: "تفاعل حالة 💚", bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" };
      case "message_recovered":
        return { label: "مكافح الحذف 🛡️", bg: "bg-amber-500/20 text-amber-400 border-amber-500/40" };
      case "viewonce_saved":
        return { label: "كشف لمرة واحدة 👁️", bg: "bg-purple-500/20 text-purple-400 border-purple-500/40" };
      case "call_rejected":
        return { label: "رفض مكالمة 📵", bg: "bg-red-500/20 text-red-400 border-red-500/40" };
      case "connected":
        return { label: "اتصال ناجح ✅", bg: "bg-emerald-500/30 text-emerald-300 border-emerald-500/60 font-bold" };
      default:
        return { label: event, bg: "bg-zinc-800 text-zinc-400 border-zinc-700" };
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header Room & Controls */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-surface via-surface/90 to-elevated/80 p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/20 text-accent border border-accent/40 shadow-inner">
                ⚡
              </span>
              <div>
                <h1 className="text-2xl font-black cyber-title tracking-wide">
                  غرفة عمليات الأدمن والمراقبة الحية
                </h1>
                <p className="text-xs text-muted mt-0.5">
                  مؤشرات استقرار المحرك، إحصائيات البوتات، وسجل التفاعلات اللحظي 24/7
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Auto-refresh indicator */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                autoRefresh
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/20"
                  : "border-border bg-surface text-muted"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-ping" : "bg-zinc-500"}`} />
              {autoRefresh ? "تحديث تلقائي (حي)" : "تحديث متوقف"}
            </button>

            {/* Manual refresh */}
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-elevated hover:bg-border/60 px-3 py-1.5 text-xs font-semibold transition"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={loading ? "animate-spin" : ""}
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              تحديث
            </button>

            {/* Admin authenticated badge */}
            <span className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-[11px] font-mono text-zinc-300">
              🔒 صلاحيات الأدمن (خادم)
            </span>
          </div>
        </div>

        {/* Live Sub-bar */}
        <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
              <span className="font-semibold text-emerald-400">
                {data?.stability?.uptimeStatus || "متصل ومستقر"}
              </span>
            </span>
            <span className="text-border">|</span>
            <span className="text-muted">
              سرعة الاستجابة: <span className="tech text-accent font-bold">{data?.latencyMs ?? "--"}ms</span>
            </span>
            <span className="text-border">|</span>
            <span className="text-muted">
              آخر فحص: <span className="font-mono text-zinc-300">{lastRefreshed.toLocaleTimeString("ar-EG")}</span>
            </span>
          </div>

          <Link href="/dashboard" className="text-accent hover:underline font-medium">
            ← العودة لإدارة البوتات
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-400 flex items-center justify-between">
          <span>⚠️ حدث خطأ أثناء جلب البيانات: {error}</span>
          <button onClick={() => fetchData()} className="underline font-bold">إعادة المحاولة</button>
        </div>
      )}

      {/* Stability Score Banner */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Metric 1: System Stability */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-surface/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">مؤشر استقرار المنظومة</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              🛡️
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black tech text-emerald-400">
              {data?.stability?.score ?? 100}%
            </span>
            <span className="text-xs font-bold text-emerald-400/90">
              {data?.stability?.label ?? "مستقر 100%"}
            </span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-accent transition-all duration-700"
              style={{ width: `${data?.stability?.score ?? 100}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted">
            يعمل المحرك على Termux بدون كراش مع إدارة ذكية للجلسات
          </p>
        </div>

        {/* Metric 2: Connected Bots vs Total */}
        <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-surface/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">حالة البوتات المتصلة</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-accent/20 text-accent">
              📱
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black tech text-accent">
              {data?.kpis?.connectedBots ?? 0}
            </span>
            <span className="text-sm text-muted">
              من إجمالي <span className="font-bold text-white">{data?.kpis?.totalBots ?? 0}</span> بوتات
            </span>
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-emerald-400 font-bold">
              {data?.kpis?.connectedBots ?? 0} متصل الآن
            </span>
            <span className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-amber-400 font-bold">
              {data?.kpis?.pendingBots ?? 0} بانتظار الاقتران
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            إجمالي الأحداث المسجلة: <span className="font-bold text-white">{data?.kpis?.totalLogs ?? 0}</span>
          </p>
        </div>

        {/* Metric 3: AI Engine Health */}
        <div className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-surface/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">محرك الذكاء الاصطناعي (Gemini)</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              🧠
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black tech text-purple-400">
              {data?.kpis?.smartReplies ?? 0}
            </span>
            <span className="text-xs font-bold text-purple-300">
              ردود ذكية منفذة
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="rounded-lg bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 font-mono text-purple-300">
              gemini-3.1-flash-lite
            </span>
            <span className="rounded-lg bg-zinc-800 px-2 py-0.5 text-muted">
              {data?.bots?.reduce((a, b) => a + (b.keysCount || 0), 0) ?? 0} مفاتيح مفعّلة إجمالاً
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            نظام التتالي الذكي (Cascade) مفعل مع دعم كامل لمفاتيح AQ
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-border/80 bg-surface/60 p-4">
          <div className="flex items-center gap-2 text-muted text-xs">
            <span>👁️</span> الحالات المشاهدة
          </div>
          <div className="mt-2 text-2xl font-black tech text-emerald-400">
            {data?.kpis?.statusInteractions ?? 0}
          </div>
          <div className="text-[10px] text-muted mt-1">تفاعل تلقائي بالقلب 💚</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface/60 p-4">
          <div className="flex items-center gap-2 text-muted text-xs">
            <span>🛡️</span> مكافح الحذف
          </div>
          <div className="mt-2 text-2xl font-black tech text-amber-400">
            {data?.kpis?.antiDeleteRecovered ?? 0}
          </div>
          <div className="text-[10px] text-muted mt-1">رسائل مسترجعة فوراً</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface/60 p-4">
          <div className="flex items-center gap-2 text-muted text-xs">
            <span>📸</span> كشف النظرة الواحدة
          </div>
          <div className="mt-2 text-2xl font-black tech text-purple-400">
            {data?.kpis?.viewOnceSaved ?? 0}
          </div>
          <div className="text-[10px] text-muted mt-1">صور وفيديوهات محفوظة</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface/60 p-4">
          <div className="flex items-center gap-2 text-muted text-xs">
            <span>📵</span> حظر المكالمات
          </div>
          <div className="mt-2 text-2xl font-black tech text-rose-400">
            {data?.kpis?.callsRejected ?? 0}
          </div>
          <div className="text-[10px] text-muted mt-1">مكالمات مرفوضة آلياً</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface/60 p-4 col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="flex items-center gap-2 text-muted text-xs">
            <span>⚡</span> الكلمات المفتاحية
          </div>
          <div className="mt-2 text-2xl font-black tech text-cyan-400">
            {data?.kpis?.keywordReplies ?? 0}
          </div>
          <div className="text-[10px] text-muted mt-1">ردود مخصصة مطابقة</div>
        </div>
      </div>

      {/* Bots Live Table */}
      <div className="rounded-3xl border border-border/80 bg-surface/70 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>🤖</span> جدول البوتات وحالة كل جهاز
          </h2>
          <span className="text-xs text-muted">
            إجمالي البوتات المدارة: {data?.bots?.length ?? 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted">
                <th className="py-3 px-3 font-semibold">البوت</th>
                <th className="py-3 px-3 font-semibold">الرقم</th>
                <th className="py-3 px-3 font-semibold">الحالة</th>
                <th className="py-3 px-3 font-semibold">الموديل</th>
                <th className="py-3 px-3 font-semibold">المفاتيح</th>
                <th className="py-3 px-3 font-semibold">مكافح الحذف</th>
                <th className="py-3 px-3 font-semibold">كود الاقتران</th>
                <th className="py-3 px-3 font-semibold">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {(data?.bots || []).map((b) => (
                <tr key={b.id} className="hover:bg-elevated/40 transition">
                  <td className="py-3.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${b.live ? "bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse" : "bg-amber-400"}`} />
                    {b.name}
                  </td>
                  <td className="py-3.5 px-3 font-mono" dir="ltr">
                    {b.linkedNumber ? `+${b.linkedNumber}` : b.phone ? `+${b.phone}` : "--"}
                  </td>
                  <td className="py-3.5 px-3">
                    {b.live ? (
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                        متصل الآن ✓
                      </span>
                    ) : b.status === "pending" ? (
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-bold text-amber-400">
                        بانتظار الاقتران
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-400">
                        متوقف
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-purple-300">
                    {b.model}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="font-bold text-accent">{b.keysCount}</span> مفاتيح
                  </td>
                  <td className="py-3.5 px-3">
                    {b.antiDelete ? (
                      <span className="text-emerald-400 font-bold">مفعل (شات+نفسك)</span>
                    ) : (
                      <span className="text-muted">معطل</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-amber-300 tracking-wider">
                    {b.pairCode ? b.pairCode : "--"}
                  </td>
                  <td className="py-3.5 px-3">
  <div className="flex items-center gap-1.5">
    <Link
      href={`/dashboard/bots/${b.id}`}
      className="rounded-lg border border-border bg-elevated hover:bg-border px-2.5 py-1 text-xs font-semibold transition"
    >
      ⚙️
    </Link>
    <button
      type="button"
      disabled={busyId === b.id}
      onClick={() => runAction(b.id, b.live ? "stop" : "start")}
      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
        b.live
          ? "border-red-500/40 bg-red-500/15 text-red-400 hover:bg-red-500/25"
          : "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
      }`}
    >
      {b.live ? "⏹ إيقاف" : "▶️ تشغيل"}
    </button>
    <button
      type="button"
      disabled={busyId === b.id}
      onClick={() => removeBot(b.id, b.name)}
      className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
    >
      🗑️ حذف
    </button>
  </div>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Event Stream Feed */}
      <div className="rounded-3xl border border-border/80 bg-surface/70 p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-lg font-bold">بث العمليات الحية (Live Event Log)</h2>
          </div>
          <span className="text-xs text-muted">آخر 30 عملية تفاعلية مسجلة</span>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {(data?.recentLogs || []).length === 0 ? (
            <div className="text-center py-8 text-muted text-xs">لا توجد عمليات مسجلة حديثاً</div>
          ) : (
            (data?.recentLogs || []).map((l) => {
              const badge = eventBadge(l.event);
              const payloadStr = typeof l.payload === "object" ? l.payload : {};
              const sender = payloadStr.from || payloadStr.to || payloadStr.number || "";
              const replyText = payloadStr.reply || payloadStr.text || "";

              return (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-elevated/40 p-3 text-xs hover:border-border transition"
                >
                  <div className="flex items-center gap-3">
                    <span className={`rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${badge.bg}`}>
                      {badge.label}
                    </span>
                    {sender && (
                      <span className="font-mono text-zinc-300" dir="ltr">
                        {String(sender).slice(0, 24)}
                      </span>
                    )}
                    {replyText && (
<span className="text-muted line-clamp-1 max-w-md italic">
  &ldquo;{replyText}&rdquo;
</span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-muted">
                    {new Date(l.createdAt).toLocaleTimeString("ar-EG")}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
