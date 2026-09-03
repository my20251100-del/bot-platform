"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type S = Record<string, any>;

type FeatureItem = {
  key: string;
  label: string;
  desc: string;
  category: "privacy" | "replies" | "status" | "groups";
  badge?: string;
};

const ALL_FEATURES: FeatureItem[] = [
  // الحماية والخصوصية
  {
    key: "antiDelete",
    label: "مضاد الحذف",
    desc: "عند حذف أي شخص لرسالته تُرسل لك نسخة منها فوراً في محادثة مراسلة نفسك",
    category: "privacy",
  },
  {
    key: "antiViewOnce",
    label: "كشف النظرة الواحدة",
    desc: "صور وفيديوهات النظرة الواحدة تُحفظ نسخة دائمة منها في مراسلة نفسك لتشاهدها متى شئت",
    category: "privacy",
  },
  {
    key: "rejectCalls",
    label: "رفض المكالمات",
    desc: "يرفض كل المكالمات الواردة تلقائياً لحماية خصوصيتك",
    category: "privacy",
  },
  {
    key: "privacyMode",
    label: "وضع الخصوصية",
    desc: "إخفاء علامات القراءة وحالة الكتابة",
    category: "privacy",
    badge: "قريباً",
  },
  {
    key: "showOnline",
    label: "إظهار متصل",
    desc: "يبقي حالة البوت على الإنترنت نشطة دائماً",
    category: "privacy",
  },
  {
    key: "contactAutoSave",
    label: "سجل الأرقام",
    desc: "يدوّن كل رقم جديد يراسلك في سجلك",
    category: "privacy",
  },

  // الردود والذكاء الاصطناعي
  {
    key: "autoReply",
    label: "الرد التلقائي",
    desc: "يرد تلقائياً على الرسائل الواردة برسالتك المحددة",
    category: "replies",
  },
  {
    key: "smartReply",
    label: "الرد الذكي (ذكاء اصطناعي)",
    desc: "يرد على عملائك وأصحابك بأسلوبك الشخصي وبذكاء طبيعي متصل وسريع",
    category: "replies",
  },
  {
    key: "autoReact",
    label: "التفاعل مع الرسائل",
    desc: "يفاعل مع كل رسالة بالإيموجي المختار",
    category: "replies",
  },

  // الحالات والستوري
  {
    key: "autoViewStatus",
    label: "مشاهدة الحالات تلقائياً",
    desc: "يشاهد كل الستوري فور نشره دون فتح الجوال",
    category: "status",
  },
  {
    key: "autoReactStatus",
    label: "التفاعل مع الحالات",
    desc: "يضع إيموجي (قلب ❤️) على كل حالة تُنشر — يتطلب تفعيل المشاهدة أيضاً",
    category: "status",
  },

  // المجموعات والقنوات
  {
    key: "welcomeGroups",
    label: "ترحيب المجموعات",
    desc: "يرحب تلقائياً بكل منضم جديد للمجموعات — استخدم {user} لذكر اسمه",
    category: "groups",
  },
  {
    key: "farewellGroups",
    label: "وداع المجموعات",
    desc: "يرسل رسالة وداع عند خروج أي عضو من المجموعة",
    category: "groups",
  },
  {
    key: "antiEdit",
    label: "مكافحة التعديل",
    desc: "يحذف أي رسالة مُعدَّلة نصها في المجموعات",
    category: "groups",
  },
  {
    key: "antiMention",
    label: "مكافحة الإشارة",
    desc: "يحذف أي رسالة تحتوي إشارة @ في المجموعات",
    category: "groups",
  },
  {
    key: "autoForward",
    label: "إعادة النشر التلقائي",
    desc: "ينقل كل منشور جديد من قناة مصدر إلى مجموعاتك فور نزوله",
    category: "groups",
  },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`relative h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors ${
        on ? "bg-accent shadow-sm shadow-accent/50" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "-translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

type BotData = {
  id: string;
  name: string;
  status: string;
  linked_number: string;
  link_method: string;
  created_at: string;
};

type BotStats = {
  totalInteractions: number;
  statusHandled?: number;
};

export default function SettingClient() {
  const searchParams = useSearchParams();
  const [number, setNumber] = useState(() => searchParams.get("number") || "");
  const [secret, setSecret] = useState(() => searchParams.get("secret") || "");
  const [step, setStep] = useState<"login" | "panel">("login");
  const [bot, setBot] = useState<BotData | null>(null);
  const [stats, setStats] = useState<BotStats | null>(null);
  const [settings, setSettings] = useState<S>({});
  const [activeTab, setActiveTab] = useState<"all" | "privacy" | "replies" | "status" | "groups">("all");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const performLogin = useCallback(async (num: string, sec: string) => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: num, secret: sec }),
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
  }, []);

  useEffect(() => {
    const qNum = searchParams.get("number");
    const qSec = searchParams.get("secret");
    if (qNum && qSec) {
      const timer = setTimeout(() => {
        void performLogin(qNum, qSec);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, performLogin]);

  const has = (k: string) => !!settings[k];

  const toggle = (k: string) => {
    setSettings((s) => ({ ...s, [k]: !s[k] }));
  };

  async function login(e: React.FormEvent) {
    e.preventDefault();
    performLogin(number, secret);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setErr(null);
    try {
      const res = await fetch("/api/setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, secret, action: "update", settings }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      } else {
        setErr(data.error || "تعذّر الحفظ");
      }
    } catch {
      setErr("تعذّر الحفظ، تحقق من الاتصال");
    }
    setSaving(false);
  }

  async function reload() {
    await performLogin(number, secret);
  }

  if (step === "panel" && bot) {
    const filteredFeatures =
      activeTab === "all"
        ? ALL_FEATURES
        : ALL_FEATURES.filter((f) => f.category === activeTab);

    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* شريط معلومات البوت والتحكم */}
        <div className="card glass mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/20 text-accent font-bold">
                🤖
              </span>
              <h1 className="cyber-title text-2xl font-bold">{bot.name}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  bot.status === "connected"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                }`}
              >
                {bot.status === "connected" ? "متصل ونشط" : bot.status}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted">
              رقم الواتساب: <span dir="ltr" className="font-mono text-white font-medium">+{bot.linked_number}</span> · إجمالي التفاعلات:{" "}
              <b className="text-accent font-mono">{stats?.totalInteractions ?? 0}</b>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/bots/${bot.id}/logs`}
              target="_blank"
              className="rounded-xl border border-accent/40 bg-accent/10 px-3.5 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
            >
              📜 السجل والإحصائيات
            </Link>
            <button
              onClick={reload}
              className="rounded-xl border border-border px-3.5 py-2 text-sm text-muted hover:text-white hover:bg-elevated transition-colors"
            >
              تحديث
            </button>
            <button
              onClick={() => {
                setStep("login");
                setBot(null);
              }}
              className="rounded-xl border border-border px-3.5 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              خروج
            </button>
          </div>
        </div>

        {err && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            ⚠️ {err}
          </div>
        )}

        {saved && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            ✓ تم حفظ وتطبيق جميع إعدادات وأتمتة البوت بنجاح فوري!
          </div>
        )}

        {/* أزرار تصنيف الميزات */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-4">
          {[
            { id: "all", label: "كل الأتمتة" },
            { id: "privacy", label: "🛡️ الحماية والخصوصية" },
            { id: "replies", label: "💬 الردود والذكاء" },
            { id: "status", label: "👁️ الحالات والستوري" },
            { id: "groups", label: "👥 المجموعات والقنوات" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                activeTab === t.id
                  ? "bg-accent text-white shadow-md shadow-accent/30"
                  : "border border-border text-muted hover:text-white hover:bg-elevated"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* قائمة بطاقات الميزات */}
        <div className="grid gap-3.5">
          {filteredFeatures.map((f) => (
            <div
              key={f.key}
              className="card glass flex items-center justify-between gap-4 p-4 hover:border-accent/40 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{f.label}</h3>
                  {f.badge && (
                    <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted border border-border">
                      {f.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">{f.desc}</p>
              </div>
              <Toggle on={has(f.key)} onChange={() => toggle(f.key)} />
            </div>
          ))}
        </div>

        {/* حقول النصوص والإعدادات التفصيلية التابعة */}
        <div className="mt-8 space-y-5">
          {/* نص الرد التلقائي */}
          {has("autoReply") && (
            <div className="card glass p-5">
              <label className="mb-2 block text-sm font-semibold text-white" htmlFor="autoReplyMessage">
                ✉️ نص الرد التلقائي
              </label>
              <textarea
                id="autoReplyMessage"
                className="input min-h-24 resize-y"
                value={String(settings.autoReplyMessage || "")}
                onChange={(e) => setSettings((s) => ({ ...s, autoReplyMessage: e.target.value }))}
                placeholder="مرحباً بك! أنا غير متاح حالياً، سأعاود الرد عليك في أقرب وقت."
              />
              <p className="mt-1 text-xs text-muted">هذه الرسالة تُرسل فوراً لأي شخص يراسلك عند تفعيل الرد التلقائي.</p>
            </div>
          )}

          {/* معلومات النشاط للذكاء الاصطناعي */}
          {has("smartReply") && (
            <div className="card glass p-5">
              <label className="mb-2 block text-sm font-semibold text-white" htmlFor="businessInfo">
                🧠 معلومات نشاطك (يبنى عليها الرد الذكي)
              </label>
              <textarea
                id="businessInfo"
                className="input min-h-28 resize-y"
                value={String(settings.businessInfo || "")}
                onChange={(e) => setSettings((s) => ({ ...s, businessInfo: e.target.value }))}
                placeholder="اكتب هنا تفاصيل عملك، أوقات الدوام، أسعار العطور أو المنتجات، سياسة التوصيل... كلما زادت التفاصيل كانت الإجابات أدق وأذكى."
              />
              <p className="mt-1 text-xs text-muted">
                كلما زادت التفاصيل كانت الإجابات أدق. لا تشارك معلومات بنكية أو سرية.
              </p>
            </div>
          )}

          {/* وضع العمل */}
          <div className="card glass p-5">
            <label className="mb-2 block text-sm font-semibold text-white">
              ⚙️ وضع العمل (من يمكنه تفعيل الردود)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "public", title: "عام — الجميع", desc: "يرد على جميع المحادثات والرسائل الواردة" },
                { id: "restricted", title: "مقيّد — جهات محددة", desc: "يرد فقط على صاحب البوت والأرقام المصرحة" },
                { id: "inbox", title: "صندوق الوارد فقط", desc: "يتجاهل المجموعات ويرد على الرسائل الخاصة فقط" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, workMode: m.id }))}
                  className={`rounded-xl border p-3 text-right transition-all cursor-pointer ${
                    (settings.workMode || "public") === m.id
                      ? "border-accent bg-accent/15 text-white shadow-sm shadow-accent/30"
                      : "border-border text-muted hover:bg-elevated hover:text-white"
                  }`}
                >
                  <div className="font-semibold text-sm">{m.title}</div>
                  <div className="text-xs text-muted mt-1">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* إيموجي التفاعل مع الرسائل */}
          {has("autoReact") && (
            <div className="card glass flex flex-wrap items-center gap-4 p-5">
              <span className="text-sm font-semibold text-white">إيموجي التفاعل المختار:</span>
              <div className="flex gap-2">
                {["❤️", "👍", "🔥", "😂", "✨", "👏", "✅"].map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, reactEmoji: e }))}
                    className={`grid h-10 w-10 place-items-center rounded-xl border text-xl transition-all cursor-pointer ${
                      (settings.reactEmoji || "❤️") === e
                        ? "border-accent bg-accent/20 scale-110 shadow-md shadow-accent/40"
                        : "border-border hover:bg-elevated"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ترحيب ووداع المجموعات */}
          {has("welcomeGroups") && (
            <div className="card glass p-5">
              <label className="mb-2 block text-sm font-semibold text-white" htmlFor="welcome">
                👋 رسالة ترحيب المجموعات
              </label>
              <textarea
                id="welcome"
                className="input min-h-20 resize-y"
                value={String(settings.welcomeMessage || "")}
                onChange={(e) => setSettings((s) => ({ ...s, welcomeMessage: e.target.value }))}
                placeholder="أهلاً بك يا {user} في مجموعتنا! منور والله 🌹"
              />
              <p className="mt-1 text-xs text-muted">استخدم {"{user}"} لذكر اسم العضو المنضم تلقائياً.</p>
            </div>
          )}

          {has("farewellGroups") && (
            <div className="card glass p-5">
              <label className="mb-2 block text-sm font-semibold text-white" htmlFor="farewell">
                🚪 رسالة وداع المجموعات
              </label>
              <textarea
                id="farewell"
                className="input min-h-20 resize-y"
                value={String(settings.farewellMessage || "")}
                onChange={(e) => setSettings((s) => ({ ...s, farewellMessage: e.target.value }))}
                placeholder="وداعاً {user}، نتمنى لك التوفيق 👋"
              />
            </div>
          )}

          {/* جدار الحماية والكلمات المحظورة */}
          <div className="card glass p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-white" htmlFor="firewall">
                🧱 جدار الحماية (Firewall) — دومينات محظورة
              </label>
              <input
                id="firewall"
                className="input"
                value={String(settings.firewallDomains || "")}
                onChange={(e) => setSettings((s) => ({ ...s, firewallDomains: e.target.value }))}
                placeholder="bit.ly, t.me, scam-link.com (مفصولة بفواصل)"
              />
              <p className="mt-1 text-xs text-muted">يحذف تلقائياً أي رسالة في مجموعاتك تحتوي على هذه الروابط.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-white" htmlFor="banned">
                🚫 قاموس الكلمات المحظورة
              </label>
              <input
                id="banned"
                className="input"
                value={String(settings.bannedWords || "")}
                onChange={(e) => setSettings((s) => ({ ...s, bannedWords: e.target.value }))}
                placeholder="كلمة1, كلمة2, سب, إعلان (مفصولة بفواصل)"
              />
              <p className="mt-1 text-xs text-muted">يحذف تلقائياً أي رسالة في مجموعاتك تحتوي على هذه الكلمات.</p>
            </div>
          </div>
        </div>

        {/* زر الحفظ العائم أو السفلي */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary min-w-44 text-base py-3 cursor-pointer"
          >
            {saving ? "جارٍ الحفظ..." : saved ? "تم الحفظ بنجاح ✓" : "💾 حفظ جميع الإعدادات"}
          </button>

          <Link
            href={`/dashboard/bots/${bot.id}/logs`}
            target="_blank"
            className="text-sm font-medium text-accent hover:underline"
          >
            الانتقال إلى سجل الرسائل والإحصائيات الحية ↗
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="text-center">
        <div
          className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-accent to-cyber text-3xl shadow-lg shadow-accent/40"
          style={{ animation: "glow-pulse 2.5s infinite" }}
        >
          🤖
        </div>
        <h1 className="cyber-title text-3xl font-bold">أتمتة وإعدادات البوت</h1>
        <p className="mt-2 text-sm text-muted">
          أدخل رقمك وكلمة السر التي وصلتك في واتساب (محادثة مراسلة نفسك) للتحكم الكامل في البوت.
        </p>
      </div>

      <form onSubmit={login} className="card glass mt-8 space-y-4 p-6 shadow-xl">
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="num">
            رقم الواتساب
          </label>
          <input
            id="num"
            dir="ltr"
            className="input text-left font-mono"
            inputMode="tel"
            placeholder="+967712343137"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="sec">
            كلمة السر
          </label>
          <input
            id="sec"
            dir="ltr"
            className="input text-left font-mono"
            placeholder="KPX-1933"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
          />
        </div>

        {err && (
          <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-300">
            {err}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 cursor-pointer">
          {loading ? "جارٍ التحقق والدخول..." : "تسجيل الدخول للإعدادات"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        تم تأمين هذه البوابة برمز مرور مشفر خاص بكل رقم مربوط.
      </p>
    </main>
  );
}
