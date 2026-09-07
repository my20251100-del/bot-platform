"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { maskPhone } from "@/lib/phone";

const emojis = ["❤️", "🔥", "👍", "😍", "👏", "🌟", "🌹", "⚡"];

export default function StatusClient({
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
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const currentBot = bots.find((b) => b.id === selectedBotId) || activeBot;
  const cfg = currentBot?.settings || {};

  const [autoViewStatus, setAutoViewStatus] = useState<boolean>(
    cfg.autoViewStatus !== false
  );
  const [autoReactStatus, setAutoReactStatus] = useState<boolean>(
    cfg.autoReactStatus !== false
  );
  const [reactEmoji, setReactEmoji] = useState<string>(cfg.reactEmoji || "❤️");
  const [antiDelete, setAntiDelete] = useState<boolean>(cfg.antiDelete !== false);
  const [antiViewOnce, setAntiViewOnce] = useState<boolean>(cfg.antiViewOnce !== false);
  const [rejectCalls, setRejectCalls] = useState<boolean>(cfg.rejectCalls ?? false);

  async function handleRefresh() {
    if (!currentBot) return;
    setRefreshing(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("bot_logs")
      .select("*")
      .eq("bot_id", currentBot.id)
      .in("event", ["status_handled", "message_recovered", "view_once_saved"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setLogs(data);
    setRefreshing(false);
  }

  async function handleSaveSettings() {
    if (!currentBot) return;
    setSaving(true);
    const supabase = createClient();
    const nextSettings = {
      ...(currentBot.settings || {}),
      autoViewStatus,
      autoReactStatus,
      reactEmoji,
      antiDelete,
      antiViewOnce,
      rejectCalls,
    };
    await supabase.from("bots").update({ settings: nextSettings }).eq("id", currentBot.id);
    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    router.refresh();
  }

  const viewedCount = logs.filter((l) => l.event === "status_handled" && l.payload?.viewed).length;
  const reactedCount = logs.filter((l) => l.event === "status_handled" && l.payload?.reacted).length;
  const recoveredCount = logs.filter((l) => l.event === "message_recovered").length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* الرأس */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <span>👁️</span>
            <span>مركز مشاهدة الحالات والخصوصية</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            تحكم كامل في مشاهدة الحالات التلقائية، تفاعلات الإيموجي، ومضاد الحذف السحابي.
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
            {refreshing ? "جارٍ التحديث..." : "🔄 تحديث السجل"}
          </button>
        </div>
      </div>

      {/* العدادات الحية */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card glass p-4 text-center">
          <div className="text-2xl font-bold text-accent font-mono">{viewedCount}</div>
          <p className="text-xs text-muted mt-1">حالات تمت مشاهدتها</p>
        </div>
        <div className="card glass p-4 text-center">
          <div className="text-2xl font-bold text-pink-400 font-mono">{reactedCount}</div>
          <p className="text-xs text-muted mt-1">تفاعلات إيموجي أُرسلت</p>
        </div>
        <div className="card glass p-4 text-center">
          <div className="text-2xl font-bold text-matrix font-mono">{recoveredCount}</div>
          <p className="text-xs text-muted mt-1">رسائل محذوفة مسترجعة</p>
        </div>
        <div className="card glass p-4 text-center">
          <div className="text-2xl font-bold text-neon font-mono">&lt; 0.2s</div>
          <p className="text-xs text-muted mt-1">سرعة المشاهدة السحابية</p>
        </div>
      </div>

      {/* لوحة خيارات وتفعيل الميزات الفورية */}
      <div className="card glass p-6 border-accent/40 shadow-xl shadow-accent/5 space-y-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <h2 className="font-bold text-lg">الميزات الفورية النشطة</h2>
              <p className="text-xs text-muted">اضبط خياراتك ثم اضغط حفظ لتطبيقها على السيرفر فوراً.</p>
            </div>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn-primary text-xs sm:text-sm py-2 px-6 shadow-md shadow-accent/20"
          >
            {saving ? "جارٍ الحفظ..." : savedSuccess ? "✓ تم التحديث بنجاح" : "حفظ التغييرات 💾"}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* خيار 1: مشاهدة الحالات تلقائياً */}
          <div className="rounded-2xl border border-border/70 bg-elevated/40 p-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-fg">
                <span>👁️</span>
                <span>مشاهدة الحالات تلقائياً (Auto View)</span>
              </div>
              <p className="text-xs text-muted mt-1">
                يشاهد البوت كل حالات جهات اتصالك فور نشرها دون فتح تطبيق واتساب.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoViewStatus}
                onChange={(e) => setAutoViewStatus(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          {/* خيار 2: التفاعل مع الحالات بالإيموجي */}
          <div className="rounded-2xl border border-border/70 bg-elevated/40 p-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-fg">
                <span>❤️</span>
                <span>التفاعل مع الحالات (Auto React)</span>
              </div>
              <p className="text-xs text-muted mt-1">
                يضع تفاعلاً تلقائياً (إيموجي) على كل حالة يشاهدها البوت.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoReactStatus}
                onChange={(e) => setAutoReactStatus(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          {/* خيار 3: مضاد حذف الرسائل */}
          <div className="rounded-2xl border border-border/70 bg-elevated/40 p-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-fg">
                <span>🛡️</span>
                <span>مضاد الحذف (Anti-Delete)</span>
              </div>
              <p className="text-xs text-muted mt-1">
                يلتقط أي رسالة يحذفها المرسل ويرسلها لمحادثة مراسلة نفسك.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={antiDelete}
                onChange={(e) => setAntiDelete(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-matrix"></div>
            </label>
          </div>

          {/* خيار 4: كشف النظرة الواحدة */}
          <div className="rounded-2xl border border-border/70 bg-elevated/40 p-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-fg">
                <span>🔒</span>
                <span>كاشف النظرة الواحدة (Anti-ViewOnce)</span>
              </div>
              <p className="text-xs text-muted mt-1">
                يحفظ صور وفيديوهات (العرض لمرة واحدة) بشكل دائم في رسائلك.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={antiViewOnce}
                onChange={(e) => setAntiViewOnce(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-matrix"></div>
            </label>
          </div>
        </div>

        {/* اختيار إيموجي التفاعل */}
        {autoReactStatus && (
          <div className="rounded-2xl border border-accent/30 bg-surface/80 p-4">
            <span className="text-xs font-semibold text-accent block mb-2">
              اختر إيموجي التفاعل المفضل مع الحالات:
            </span>
            <div className="flex flex-wrap gap-2">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setReactEmoji(emoji)}
                  className={`grid h-11 w-11 place-items-center rounded-xl text-xl transition ${
                    reactEmoji === emoji
                      ? "bg-accent/25 border-2 border-accent scale-110 shadow-lg shadow-accent/20"
                      : "bg-elevated border border-border/70 hover:bg-surface"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* سجل الحالات المشاهدة مؤخراً */}
      <div className="space-y-3">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <span>📜</span>
          <span>سجل الحالات والمشاهدات الحية</span>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted border border-border">
            {logs.length}
          </span>
        </h2>

        {!currentBot ? (
          <div className="card glass p-10 text-center text-muted">
            لا يوجد بوت مرتبط حالياً.
          </div>
        ) : logs.length === 0 ? (
          <div className="card glass p-12 text-center text-muted space-y-2">
            <div className="text-4xl mb-2">👁️</div>
            <p className="text-base font-medium text-fg">لا توجد حالات مسجلة حتى الآن</p>
            <p className="text-sm">
              فور نشر أي جهة اتصال لديك لحالة جديدة في واتساب، سيقوم السيرفر بمشاهدتها والتفاعل معها وتدوينها هنا!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {logs.map((log) => {
              const p = log.payload || {};
              const sender = p.from ? String(p.from).split("@")[0] : "جهة اتصال";
              const name = p.name ? `(${p.name})` : "";
              const timeStr = log.created_at
                ? new Date(log.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
                : "";

              return (
                <div
                  key={log.id}
                  className="card p-3.5 flex items-center justify-between gap-3 border-border/70 bg-surface/80 text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent text-lg flex-shrink-0">
                      👁️
                    </span>
                    <div>
                      <div className="font-semibold text-fg flex items-center gap-2">
                        <span>تمت مشاهدة الحالة لـ</span>
                        <span dir="ltr" className="font-mono text-accent">+{sender}</span>
                        {name && <span className="text-muted">{name}</span>}
                      </div>
                      {p.reacted && (
                        <span className="text-xs text-pink-400 mt-0.5 block">
                          تم التفاعل بالإيموجي {p.reacted} بنجاح ✓
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-muted text-xs font-mono">{timeStr}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
