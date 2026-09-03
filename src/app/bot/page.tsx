import Link from "next/link";
import ActiveBotsChart from "@/components/active-bots-chart";

export const metadata = {
  title: "The Mini Bot — Red Queen Edition | بوت برو",
  description: "Deploy a free WhatsApp bot with pair code or QR. Auto-reply, anti-delete, anti view-once, auto-react, privacy controls and contact auto-save.",
};

export default function MiniBotHubPage() {
  const capabilities = [
    {
      icon: "👁️",
      title: "Anti View Once",
      desc: "View restricted media easily without sender knowing.",
      descAr: "كاشف النظرة الواحدة: حفظ وفك قفل الصور والفيديوهات لمرة واحدة بسهولة وبسرية.",
    },
    {
      icon: "🗑️",
      title: "Anti Delete",
      desc: "Keep track of deleted messages and media in your private chat.",
      descAr: "مضاد الحذف: استعادة وتتبع الرسائل والوسائط المحذوفة فوراً.",
    },
    {
      icon: "🔒",
      title: "Privacy Control",
      desc: "Manage your online presence, read receipts, and typing indicators.",
      descAr: "التحكم في الخصوصية: إخفاء الظهور وعلامات القراءة وحالة الكتابة.",
    },
    {
      icon: "📥",
      title: "Media Tools",
      desc: "Auto-save contacts, export VCF/CSV, and forward stories.",
      descAr: "أدوات الوسائط والأرقام: حفظ جهات الاتصال وتصدير ملفات VCF/CSV وحفظ الحالات.",
    },
    {
      icon: "❤️",
      title: "Auto React",
      desc: "Automated status reactions and incoming message emoji interactions.",
      descAr: "التفاعل الآلي: وضع إيموجي وتفاعل تلقائي مع الحالات والرسائل.",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-16">
      {/* 1. قسم الهيرو الرئيسي على طريقة Red Queen */}
      <div className="relative text-center pt-6 sm:pt-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-accent shadow-[0_0_15px_rgba(0,212,255,0.2)] mb-5">
          <span>✨</span>
          <span>Red Queen Spec 2.0 • 100% Free Forever</span>
        </div>

        <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white">
          The Mini Bot <span className="text-accent underline decoration-accent/40">Edition</span>
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base lg:text-lg text-muted">
          Fast, secure, simplified WhatsApp automation. Best features, minimal setup.
          <br />
          <span className="text-xs sm:text-sm text-muted/80">أتمتة واتساب سريعة، آمنة وبأعلى كفاءة مع شهايد متصفح رسمية وبدون حظر.</span>
        </p>

        {/* 4 أزرار رئيسية مركزية كما في Red Queen */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/bot/create"
            className="flex items-center gap-2 rounded-2xl bg-accent px-6 py-3.5 text-sm sm:text-base font-bold text-accent-fg shadow-lg shadow-accent/25 transition hover:brightness-110 active:scale-95"
          >
            <span>🚀</span>
            <span>Deploy Now</span>
            <span className="text-xs opacity-75">(ربط الآن)</span>
          </Link>

          <Link
            href="/bot/setting"
            className="flex items-center gap-2 rounded-2xl border border-border/80 bg-surface/80 px-6 py-3.5 text-sm sm:text-base font-semibold text-fg transition hover:border-accent/50 hover:bg-elevated active:scale-95"
          >
            <span>⚙️</span>
            <span>Settings</span>
            <span className="text-xs text-muted">(الإعدادات)</span>
          </Link>

          <Link
            href="/bot/autoreply"
            className="flex items-center gap-2 rounded-2xl border border-border/80 bg-surface/80 px-6 py-3.5 text-sm sm:text-base font-semibold text-fg transition hover:border-accent/50 hover:bg-elevated active:scale-95"
          >
            <span>💬</span>
            <span>Auto Reply</span>
            <span className="text-xs text-muted">(الرد التلقائي)</span>
          </Link>

          <Link
            href="/bot/contact"
            className="flex items-center gap-2 rounded-2xl border border-border/80 bg-surface/80 px-6 py-3.5 text-sm sm:text-base font-semibold text-fg transition hover:border-accent/50 hover:bg-elevated active:scale-95"
          >
            <span>📇</span>
            <span>Auto Save</span>
            <span className="text-xs text-muted">(حفظ الأرقام)</span>
          </Link>
        </div>
      </div>

      {/* 2. قسم إمكانيات البوت (Bot Capabilities) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>⚡</span>
            <span>Bot Capabilities</span>
            <span className="text-sm font-normal text-muted font-sans">(قدرات البوت)</span>
          </h2>
          <span className="text-xs text-accent font-mono">5 Core Engines</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap, i) => (
            <div
              key={i}
              className="card relative overflow-hidden rounded-2xl border border-border/70 bg-surface/70 p-5 backdrop-blur-sm transition hover:border-accent/60 hover:shadow-[0_0_20px_rgba(0,212,255,0.12)] group"
            >
              <div className="flex items-start gap-3.5">
                <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-elevated text-xl group-hover:scale-110 group-hover:bg-accent/15 transition-all">
                  {cap.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base text-white group-hover:text-accent transition-colors">
                    {cap.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {cap.desc}
                  </p>
                  <p className="mt-1 text-xs text-accent/80 font-sans" dir="rtl">
                    {cap.descAr}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. الإحصائيات الحية (Active Bots) مطابقة لـ Red Queen */}
      <div className="rounded-3xl border border-border/70 bg-surface/60 p-6 sm:p-8 backdrop-blur-md">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <span>📊</span>
              <span>Active Bots</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted">Live bot activity and deployment load over time</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-matrix/15 px-3 py-1 text-xs font-bold text-matrix border border-matrix/30">
              <span className="h-2 w-2 rounded-full bg-matrix animate-ping" />
              2,432 Active now
            </span>
          </div>
        </div>

        <ActiveBotsChart />
      </div>
    </div>
  );
}
