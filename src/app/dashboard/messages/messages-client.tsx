"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { maskPhone } from "@/lib/phone";

export default function MessagesClient({
  bots,
  activeBot,
  initialLogs,
}: {
  bots: any[];
  activeBot: any;
  initialLogs: any[];
}) {
  const router = useRouter();
  const [selectedBotId, setSelectedBotId] = useState(activeBot?.id || "");
  const [logs, setLogs] = useState(initialLogs);
  const [search, setSearch] = useState("");
  const [autoReplyText, setAutoReplyText] = useState(
    activeBot?.settings?.autoReplyMessage ||
      "مرحباً بك! 👋 تم استلام رسالتك وسنقوم بالرد عليك في أقرب وقت. تم الرد تلقائياً بواسطة hatem X ⚡"
  );
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(
    activeBot?.settings?.autoReply !== false
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currentBot = bots.find((b) => b.id === selectedBotId) || activeBot;

  async function handleRefresh() {
    if (!currentBot) return;
    setRefreshing(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("bot_logs")
      .select("*")
      .eq("bot_id", currentBot.id)
      .in("event", ["incoming_message", "auto_replied", "smart_replied", "message_recovered"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setLogs(data);
    setRefreshing(false);
  }

  async function handleSaveAutoReply(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBot) return;
    setSavingSettings(true);
    const supabase = createClient();
    const newSettings = {
      ...(currentBot.settings || {}),
      autoReply: autoReplyEnabled,
      autoReplyMessage: autoReplyText,
    };
    await supabase.from("bots").update({ settings: newSettings }).eq("id", currentBot.id);
    setSavingSettings(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    router.refresh();
  }

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const p = log.payload || {};
    const from = String(p.from || p.to || "").toLowerCase();
    const name = String(p.name || "").toLowerCase();
    const text = String(p.text || p.incoming || p.question || p.reply || "").toLowerCase();
    return from.includes(s) || name.includes(s) || text.includes(s);
  });

  const incomingCount = logs.filter((l) => l.event === "incoming_message").length;
  const repliedCount = logs.filter((l) => l.event === "auto_replied" || l.event === "smart_replied").length;
  const recoveredCount = logs.filter((l) => l.event === "message_recovered").length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* الرأس */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <span>💬</span>
            <span>مركز رسائل العملاء والردود</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            متابعة كل الرسائل الواردة من العملاء والردود الآلية المستمرة 24/7.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {bots.length > 1 && (
            <select
              value={selectedBotId}
              onChange={(e) => setSelectedBotId(e.target.value)}
              className="rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-fg"
            >
              {bots.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.linked_number ? maskPhone(b.linked_number) : "غير متصل"})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-muted transition hover:border-accent hover:text-white"
          >
            {refreshing ? "جارٍ التحديث..." : "🔄 تحديث الرسائل"}
          </button>
        </div>
      </div>

      {/* شريط الإحصائيات */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card glass p-4 text-center">
          <div className="text-2xl font-bold text-accent font-mono">{logs.length}</div>
          <p className="text-xs text-muted mt-1">إجمالي النشاطات</p>
        </div>
        <div className="card glass p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400 font-mono">{incomingCount}</div>
          <p className="text-xs text-muted mt-1">رسائل واردة من عملاء</p>
        </div>
        <div className="card glass p-4 text-center">
          <div className="text-2xl font-bold text-neon font-mono">{repliedCount}</div>
          <p className="text-xs text-muted mt-1">ردود آلية تم تسليمها</p>
        </div>
        <div className="card glass p-4 text-center">
          <div className="text-2xl font-bold text-matrix font-mono">{recoveredCount}</div>
          <p className="text-xs text-muted mt-1">رسائل محذوفة مسترجعة</p>
        </div>
      </div>

      {/* صندوق تخصيص الرد التلقائي السريع */}
      <div className="card glass p-6 border-accent/40 shadow-xl shadow-accent/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h2 className="font-bold text-lg">الرد التلقائي على رسائل العملاء</h2>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <span className={autoReplyEnabled ? "text-accent font-semibold" : "text-muted"}>
              {autoReplyEnabled ? "مفعّل 🟢" : "معطّل ⚪"}
            </span>
            <input
              type="checkbox"
              checked={autoReplyEnabled}
              onChange={(e) => setAutoReplyEnabled(e.target.checked)}
              className="h-4 w-4 rounded accent-accent"
            />
          </label>
        </div>

        <form onSubmit={handleSaveAutoReply} className="space-y-3">
          <textarea
            rows={3}
            value={autoReplyText}
            onChange={(e) => setAutoReplyText(e.target.value)}
            placeholder="اكتب نص الرد التلقائي الذي سيرسله البوت فوراً لأي عميل..."
            className="w-full rounded-xl border border-border/80 bg-elevated/70 p-3 text-sm text-fg outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">
              💡 يرسل البوت هذا الرد فور وصول أي رسالة من أي عميل على واتساب.
            </span>
            <button
              type="submit"
              disabled={savingSettings}
              className="btn-primary text-xs sm:text-sm py-2 px-5"
            >
              {savingSettings ? "جارٍ الحفظ..." : savedSuccess ? "✓ تم الحفظ بنجاح" : "حفظ نص الرد 💾"}
            </button>
          </div>
        </form>
      </div>

      {/* البحث وفلترة السجل */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <span>📨</span>
          <span>سجل المحادثات والرسائل الأخيرة</span>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted border border-border">
            {filteredLogs.length}
          </span>
        </h2>

        <input
          type="text"
          placeholder="بحث برقم العميل أو نص الرسالة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-border bg-elevated px-3.5 py-1.5 text-sm text-fg placeholder:text-muted/60 outline-none focus:border-accent"
        />
      </div>

      {/* قائمة الرسائل والمحادثات */}
      {!currentBot ? (
        <div className="card glass p-10 text-center text-muted">
          لا يوجد بوت مرتبط حالياً. أنشئ بوتاً واربطه لتبدأ بتلقي الرسائل والردود.
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card glass p-12 text-center text-muted space-y-2">
          <div className="text-4xl mb-2">📬</div>
          <p className="text-base font-medium text-fg">لا توجد رسائل مسجلة حتى الآن</p>
          <p className="text-sm">
            بمجرد أن يرسل لك أي شخص رسالة على واتساب، ستظهر هنا فوراً مع تفاصيل الرد التلقائي!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const p = log.payload || {};
            const isIncoming = log.event === "incoming_message";
            const isAutoReply = log.event === "auto_replied";
            const isSmartReply = log.event === "smart_replied";
            const isRecovered = log.event === "message_recovered";

            const sender = p.from ? String(p.from).split("@")[0] : p.to ? String(p.to).split("@")[0] : "عميل";
            const name = p.name ? `(${p.name})` : "";
            const timeStr = log.created_at
              ? new Date(log.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
              : "";

            return (
              <div
                key={log.id}
                className={`card p-4 transition border ${
                  isIncoming
                    ? "border-accent/40 bg-surface/80"
                    : isAutoReply || isSmartReply
                    ? "border-matrix/40 bg-surface/60"
                    : "border-red-500/40 bg-surface/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                  <div className="flex items-center gap-2">
                    {isIncoming && (
                      <span className="rounded-md bg-accent/15 px-2 py-0.5 font-bold text-accent">
                        📥 رسالة واردة من عميل
                      </span>
                    )}
                    {isAutoReply && (
                      <span className="rounded-md bg-matrix/15 px-2 py-0.5 font-bold text-matrix">
                        ⚡ رد تلقائي من البوت
                      </span>
                    )}
                    {isSmartReply && (
                      <span className="rounded-md bg-cyber/15 px-2 py-0.5 font-bold text-cyber">
                        🧠 رد ذكي بالذكاء الاصطناعي
                      </span>
                    )}
                    {isRecovered && (
                      <span className="rounded-md bg-red-500/15 px-2 py-0.5 font-bold text-red-400">
                        🛡️ رسالة محذوفة تم التقاطها
                      </span>
                    )}

                    <span dir="ltr" className="font-mono text-muted font-semibold">
                      +{sender} {name}
                    </span>
                  </div>

                  <span className="text-muted text-[11px] font-mono">{timeStr}</span>
                </div>

                <div className="text-sm leading-relaxed text-fg bg-elevated/50 rounded-xl p-3 border border-border/50">
                  {p.text && <p>{p.text}</p>}
                  {p.question && (
                    <div className="mb-2 text-xs text-muted border-b border-border/40 pb-1.5">
                      <strong>سؤال العميل:</strong> {p.question}
                    </div>
                  )}
                  {p.reply && (
                    <div className="text-emerald-300 font-medium">
                      <strong>رد البوت:</strong> {p.reply}
                    </div>
                  )}
                  {p.recoveredText && (
                    <div className="text-amber-300">
                      <strong>المحتوى المسترجع:</strong> {p.recoveredText}
                    </div>
                  )}
                  {!p.text && !p.reply && !p.recoveredText && (
                    <pre className="text-xs text-muted overflow-x-auto">{JSON.stringify(p, null, 2)}</pre>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
