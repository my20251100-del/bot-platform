"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";

type S = Record<string, any>;

type Feature = {
  key: string;
  label: string;
  desc: string;
};

const FEATURES: Feature[] = [
  { key: "autoReply", label: "الرد التلقائي", desc: "يرد تلقائياً على الرسائل الواردة" },
  { key: "antiDelete", label: "مضاد الحذف", desc: "نسخة من كل رسالة محذوفة تُرسل لك في مراسلة نفسك" },
  { key: "antiViewOnce", label: "كشف النظرة الواحدة", desc: "حفظ الصور والفيديوهات ذات النظرة الواحدة" },
  { key: "autoViewStatus", label: "مشاهدة الحالات", desc: "يشاهد كل الستوري فور نشره دون فتح الجوال" },
  { key: "autoReactStatus", label: "التفاعل مع الحالات", desc: "يضع قلباً ❤️ على كل حالة جديدة" },
  { key: "autoReact", label: "التفاعل مع الرسائل", desc: "يفاعل مع كل رسالة بالإيموجي المختار" },
  { key: "smartReply", label: "الرد الذكي", desc: "ردود ذكية بالذكاء الاصطناعي" },
  { key: "rejectCalls", label: "رفض المكالمات", desc: "يرفض كل المكالمات الواردة تلقائياً" },
  { key: "privacyMode", label: "وضع الخصوصية", desc: "إخفاء علامات القراءة وحالة الكتابة" },
  { key: "contactAutoSave", label: "سجل الأرقام", desc: "يدوّن كل رقم جديد يراسلك" },
  { key: "welcomeGroups", label: "ترحيب المجموعات", desc: "يرحب بكل منضم جديد — استخدم {user} لذكر اسمه" },
  { key: "autoForward", label: "إعادة النشر", desc: "ينقل منشورات القناة المصدر إلى مجموعاتك" },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-border"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "-translate-x-[22px]" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export default function SettingClient() {
  const [number, setNumber] = useState("");
  const [secret, setSecret] = useState("");
  const [step, setStep] = useState<"login" | "panel">("login");
  const [bot, setBot] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<S>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const has = useCallback((k: string) => !!settings[k], [settings]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, secret }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || "تعذّر تسجيل الدخول");
        setLoading(false);
        return;
      }
      setBot(data.bot);
      setStats(data.stats);
      setSettings(data.settings || {});
      setStep("panel");
    } catch {
      setErr("تعذّر الاتصال بالخادم");
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, secret, action: "update", settings }),
      });
      const data = await res.json();
      if (data.ok) setSaved(true);
      else setErr(data.error || "تعذّر الحفظ");
    } catch {
      setErr("تعذّر الحفظ");
    }
    setSaving(false);
  }

  async function reload() {
    const res = await fetch("/api/setting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number, secret }),
    });
    const data = await res.json();
    if (data.ok) {
      setStats(data.stats);
      setSettings(data.settings || {});
    }
  }

  if (step === "panel" && bot) {
    return (
      <>
        <main className="mx-auto max-w-3xl px-4 py-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="cyber-title text-2xl font-bold">{bot.name}</h1>
              <p className="mt-1 text-sm text-muted">
                رقم مرتبط: <span dir="ltr">{bot.linked_number}</span> · الحالة:{" "}
                {bot.status === "connected" ? <span className="text-emerald-400">متصل</span> : <span className="text-amber-400">{bot.status}</span>}
              </p>
              <p className="mt-1 text-xs text-muted">
                إجمالي التفاعلات: <b className="text-accent">{stats?.totalInteractions ?? 0}</b>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={reload} className="rounded-xl border border-border px-3 py-2 text-sm text-muted hover:text-white">تحديث</button>
              <button onClick={() => { setStep("login"); setBot(null); }} className="rounded-xl border border-border px-3 py-2 text-sm text-muted hover:text-white">خروج</button>
            </div>
          </div>

          {err && (
            <p className="mt-4 rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-300">{err}</p>
          )}

          <div className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <div key={f.key} className="card flex items-center justify-between gap-4 p-4">
                <div>
                  <h3 className="font-medium">{f.label}</h3>
                  <p className="text-sm text-muted">{f.desc}</p>
                </div>
                <Toggle on={has(f.key)} onChange={() => setSettings((s) => ({ ...s, [f.key]: !s[f.key] }))} />
              </div>
            ))}
          </div>

          {has("autoReply") && (
            <div className="card mt-3 p-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="reply">نص الرد التلقائي</label>
              <textarea
                id="reply"
                className="input min-h-24 resize-y"
                value={settings.autoReplyMessage || ""}
                onChange={(e) => setSettings((s) => ({ ...s, autoReplyMessage: e.target.value }))}
                placeholder="مرحباً! أنا غير متاح حالياً وسأعاود التواصل قريباً."
              />
            </div>
          )}

          {has("welcomeGroups") && (
            <div className="card mt-3 p-4">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="welcome">رسالة الترحيب</label>
              <textarea
                id="welcome"
                className="input min-h-20 resize-y"
                value={settings.welcomeMessage || ""}
                onChange={(e) => setSettings((s) => ({ ...s, welcomeMessage: e.target.value }))}
                placeholder="أهلاً بك {user} في مجموعتنا 👋"
              />
            </div>
          )}

          {has("autoReact") && (
            <div className="card mt-3 flex items-center gap-3 p-4">
              <span className="text-sm font-medium">إيموجي التفاعل</span>
              {["❤️", "👍", "😂", "🔥", "✅"].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, reactEmoji: e }))}
                  className={`grid h-9 w-9 place-items-center rounded-lg border text-lg transition-colors ${settings.reactEmoji === e ? "border-accent bg-accent/15" : "border-border hover:bg-elevated"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? "جارٍ الحفظ..." : saved ? "تم الحفظ ✓" : "حفظ الإعدادات"}
            </button>
            <Link href="/" className="text-sm text-muted hover:text-white">الرئيسية</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-accent to-cyber text-3xl shadow-lg shadow-accent/40" style={{ animation: "glow-pulse 2.5s infinite" }}>
            💀
          </div>
          <h1 className="cyber-title text-3xl font-bold">إعدادات بوتك</h1>
          <p className="mt-2 text-sm text-muted">أدخل رقمك وكلمة السر التي وصلكت على الواتساب للدخول.</p>
        </div>

        <form onSubmit={login} className="card glass mt-8 space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="num">رقم الواتساب</label>
            <input id="num" dir="ltr" className="input text-left" inputMode="tel" placeholder="+967771234567"
              value={number} onChange={(e) => setNumber(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="sec">كلمة السر</label>
            <input id="sec" dir="ltr" className="input text-left" placeholder="KPX-0000"
              value={secret} onChange={(e) => setSecret(e.target.value)} required />
          </div>
          {err && <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-300">{err}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "جارٍ الدخول..." : "دخول"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          ما عندك بوت؟{" "}
          <Link href="/connect" className="font-semibold text-accent hover:underline">اربط رقمك الآن</Link>
        </p>
      </main>
    </>
  );
}
