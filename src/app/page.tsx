import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ActiveBotsChArt from "@/components/active-bots-chart";
import HomeHeroConnect from "@/components/home-hero-connect";
import HomeBotSimulation from "@/components/home-bot-simulation";
import HomeFaqAccordion from "@/components/home-faq-accordion";
import HomeComments from "@/components/home-comments";
import { getServerLocale } from "@/lib/server-locale";
import { tr, type Locale } from "@/lib/i18n";
import { createAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Bi = { ar: string; en: string };

const coreFeatures: { icon: string; badge: Bi; title: Bi; desc: Bi }[] = [
  {
    icon: "🛡️",
    badge: { ar: "حماية 100%", en: "100% protection" },
    title: { ar: "مضاد حذف الرسائل والوسائط", en: "Anti-delete for messages & media" },
    desc: {
      ar: "إذا أرسل لك أي شخص رسالة أو صورة أو تسجيلاً صوتياً ثم حذفه للجميع، يلتقطها البوت فوراً ويحفظها في محادثتك الخاصة لتراها كاملة.",
      en: "If someone sends you a message, image or voice note then deletes it for everyone, the bot catches it instantly and saves it to your private chat in full.",
    },
  },
  {
    icon: "👁️",
    badge: { ar: "تفاعل آلي", en: "Auto interaction" },
    title: { ar: "مشاهدة الحالات والتفاعل التلقائي", en: "Status viewing & auto interaction" },
    desc: {
      ar: "يشاهد البوت حالات جهات اتصالك أولاً بأول فور نشرها، مع إمكانية التفاعل التلقائي بالقلوب والإيموجي المخصص لكل حالة.",
      en: "The bot watches your contacts' statuses the moment they post, with automatic hearts and custom emoji reactions for every status.",
    },
  },
  {
    icon: "🤖",
    badge: { ar: "مدعوم بـ AI", en: "AI powered" },
    title: { ar: "رد تلقائي ذكي بالذكاء الاصطناعي", en: "AI smart auto-reply" },
    desc: {
      ar: "مساعد مدمج مدعوم بـ Google Gemini يفهم أسئلة عملائك ويرد بلباقة ودقة 24/7 دون أي تدخل منك، مع دعم الردود المخصصة.",
      en: "A built-in assistant powered by Google Gemini understands your customers' questions and answers politely and accurately 24/7, with custom replies support.",
    },
  },
  {
    icon: "🔒",
    badge: { ar: "خصوصية قصوى", en: "Maximum privacy" },
    title: { ar: "كاشف وسائط النظرة الواحدة", en: "View-Once media detector" },
    desc: {
      ar: "يسمح لك بمشاهدة وحفظ الصور والفيديوهات المرسلة بخاصية (عرض لمرة واحدة - ViewOnce) بدون قيود وبسرية تامة.",
      en: "View and save photos and videos sent with (View Once) with no limits and complete confidentiality.",
    },
  },
  {
    icon: "📢",
    badge: { ar: "تسويق ونمو", en: "Marketing & growth" },
    title: { ar: "مجدول النشر والرسائل الجماعية", en: "Post scheduler & bulk messages" },
    desc: {
      ar: "جدول منشوراتك الترويجية والرسائل الدورية لقنواتك ومجموعاتك في أوقات الذروة بضغطة زر وبدون مجهود يدوي متكرر.",
      en: "Schedule your promotional posts and recurring messages to channels and groups at peak times with one click.",
    },
  },
  {
    icon: "💰",
    badge: { ar: "مكافآت مجانية", en: "Free rewards" },
    title: { ar: "محفظة الكريدت ونظام الإحالات", en: "Credit wallet & referral system" },
    desc: {
      ar: "اجمع رصيد الكريدت مجاناً يومياً، وشارك كود إحالتك لتربح 10 كريدت عن كل صديق يشترك، واستبدله بميزات حصرية وترقيات برو.",
      en: "Earn free credits daily, share your referral code to gain 10 credits per friend, and redeem them for exclusive features and Pro upgrades.",
    },
  },
];

const comparisons: { feature: Bi; pro: Bi; gb: Bi }[] = [
  {
    feature: { ar: "التشغيل والاستقرار السحابي", en: "Cloud operation & stability" },
    pro: { ar: "سحابي 24/7 حتى لو انقطع الإنترنت أو أغلق جوالك", en: "Cloud 24/7 even if your internet drops or your phone is off" },
    gb: { ar: "يتوقف فوراً عند إغلاق التطبيق أو انقطاع النت", en: "Stops instantly when the app closes or internet disconnects" },
  },
  {
    feature: { ar: "أمان الحساب والحظر", en: "Account safety & bans" },
    pro: { ar: "آمن 100% بمحاكاة المتصفحات الرسمية وضبط التردد", en: "100% safe with official browser simulation and rate control" },
    gb: { ar: "معرض للحظر الدائم والمفاجئ من واتساب", en: "Liable to permanent, sudden bans from WhatsApp" },
  },
  {
    feature: { ar: "الخصوصية وتشفير البيانات", en: "Privacy & data encryption" },
    pro: { ar: "تشفير طرف إلى طرف معتمد من بروتوكول Signal", en: "End-to-end encryption via the trusted Signal protocol" },
    gb: { ar: "تطبيقات غير موثوقة تسحب جهات الاتصال والرسائل", en: "Untrusted apps pull contacts and messages" },
  },
  {
    feature: { ar: "سرعة الربط والإعداد", en: "Linking & setup speed" },
    pro: { ar: "ربط فوري خلال 10 ثوانٍ بكود الاقتران", en: "Instant pairing in 10 seconds via pairing code" },
    gb: { ar: "يحتاج تنزيل ملفات APK مجهولة وتعديل النظام", en: "Requires downloading unknown APK files and system modifications" },
  },
];

const steps: { step: string; title: Bi; desc: Bi }[] = [
  {
    step: "01",
    title: { ar: "أدخل رقم هاتفك", en: "Enter your phone number" },
    desc: {
      ar: "اكتب رقم هاتفك مع الرمز الدولي في خانة الربط السريع لتحصل على كود الاقتران فوراً.",
      en: "Enter your phone number with the country code in the quick-link box to get a pairing code instantly.",
    },
  },
  {
    step: "02",
    title: { ar: "أدخل الكود في واتساب", en: "Enter the code in WhatsApp" },
    desc: {
      ar: "افتح واتساب > الأجهزة المرتبطة > ربط برقم الهاتف، واكتب الكود المكون من 8 خانات.",
      en: "Open WhatsApp > Linked devices > Link with phone number, then type the 8-digit code.",
    },
  },
  {
    step: "03",
    title: { ar: "استمتع بالأتمتة والحماية", en: "Enjoy automation & protection" },
    desc: {
      ar: "مبروك! بوتك الآن شغال 24/7 سحابياً، وتحكم في كل الميزات بضغطة زر من صفحة الإعدادات.",
      en: "Congratulations! Your bot now runs 24/7 in the cloud, and you control every feature from the settings page.",
    },
  },
];

function dayStartOffset(offsetMs: number) {
  const d = new Date(Date.now() - offsetMs);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function loadLiveStats() {
  const admin = createAdmin();
  const startOfDay = dayStartOffset(0);
  const weekAgo = dayStartOffset(7 * 24 * 3600 * 1000);
  const monthAgo = dayStartOffset(30 * 24 * 3600 * 1000);

  const [totalCount, connectedCount, logsToday, logsWeek, logsMonth, logsAll] =
    await Promise.all([
      admin.from("bots").select("id", { count: "exact", head: true }),
      admin.from("bots").select("id", { count: "exact", head: true }).eq("status", "connected"),
      admin.from("bot_logs").select("id", { count: "exact", head: true }).gte("created_at", startOfDay),
      admin.from("bot_logs").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      admin.from("bot_logs").select("id", { count: "exact", head: true }).gte("created_at", monthAgo),
      admin.from("bot_logs").select("id", { count: "exact", head: true }),
    ]);

  return {
    totalBots: totalCount.count || 0,
    today: logsToday.count || 0,
    week: logsWeek.count || 0,
    month: logsMonth.count || 0,
    all: logsAll.count || 0,
    activeNow: connectedCount.count || 0,
  };
}

export default async function Home() {
  const locale: Locale = await getServerLocale();
  const t = (s: string) => tr(locale, s);

  const live = await loadLiveStats();
  const totalBots = live.totalBots;
  const liveCounts = {
    today: live.today,
    week: live.week,
    month: live.month,
    all: live.all,
    activeNow: live.activeNow,
  };

  return (
    <>
      <SiteHeader />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-accent/10 blur-[120px]" />
        <div className="pointer-events-none absolute top-[600px] -right-40 h-[400px] w-[400px] rounded-full bg-cyber/10 blur-[100px]" />

        <section className="relative px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-20">
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-surface/80 px-4 py-1.5 text-xs sm:text-sm font-medium text-accent shadow-lg shadow-accent/10 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-matrix opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-matrix"></span>
              </span>
              {t("منصة Hatem X ⚡ — أتمتة واتساب الأقوى 2.0 فائقة السرعة")}
            </div>

            <h1 className="mt-8 text-balance text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-tight">
              {locale === "ar" ? (
                <>
                  بوت <span className="bg-gradient-to-r from-emerald-400 via-accent to-neon bg-clip-text text-transparent font-mono">Hatem X</span> الذكي
                </>
              ) : (
                <>
                  <span className="bg-gradient-to-r from-emerald-400 via-accent to-neon bg-clip-text text-transparent font-mono">Hatem X</span> Smart Bot
                </>
              )}
              <br />
              <span className="text-3xl sm:text-5xl lg:text-6xl text-fg mt-2 inline-block">
                {t("تحكّم بواتسابك، رد بذكاء، واحمِ خصوصيتك 24/7")}
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-base sm:text-xl leading-relaxed text-muted">
              {t("منصة سحابية متكاملة مدعومة بالذكاء الاصطناعي من")}{" "}
              <strong className="text-accent font-bold font-mono">Hatem X</strong> —{" "}
              {t("مضاد حذف الرسائل والوسائط، ردود ذكية وفورية، وتفاعل تلقائي مع الحالات سحابياً على مدار الساعة دون توقف.")}
            </p>

            <HomeHeroConnect />

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <a
                href="https://wa.me/967772847565?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20Hatem%20X%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%A7%D9%84%D8%A8%D9%88%D8%AA%20%D9%88%D8%A7%D9%84%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%D9%83"
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-sm sm:text-base flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30"
              >
                {t("💬 تواصل مع Hatem X (772847565)")}
              </a>
              <Link href="/connect" className="rounded-xl border border-border/80 bg-surface/90 px-5 py-3 text-sm sm:text-base font-semibold text-fg transition hover:border-accent/60 hover:text-white">
                {t("⚡ صفحة الربط المباشر")}
              </Link>
              <Link href="/login" className="rounded-xl border border-border/80 bg-elevated/70 px-5 py-3 text-sm sm:text-base font-semibold text-muted transition hover:border-accent/40 hover:text-white">
                {t("دخول المشتركين 👤")}
              </Link>
            </div>
          </div>

          <HomeBotSimulation />
        </section>

        <section className="border-y border-border/70 bg-surface/60 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-elevated/50 p-5">
                <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-accent/15 text-2xl shadow-inner">🤖</span>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-accent font-mono">{totalBots.toLocaleString("en-US")}</div>
                  <p className="mt-1 text-xs sm:text-sm text-muted">{t("بوت واتساب على المنصة")}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-elevated/50 p-5">
                <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-matrix/15 text-2xl shadow-inner">📶</span>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-matrix font-mono">
                    {totalBots > 0 ? `${Math.round((liveCounts.activeNow / totalBots) * 100)}%` : "0%"}
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-muted">{t("من البوتات متصلة الآن")}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-elevated/50 p-5">
                <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-fuchsia-400/15 text-2xl shadow-inner">💬</span>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-fuchsia-400 font-mono">{liveCounts.all.toLocaleString("en-US")}</div>
                  <p className="mt-1 text-xs sm:text-sm text-muted">{t("رسالة وحالة تمت معالجتها")}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-elevated/50 p-5">
                <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-neon/15 text-2xl shadow-inner">⚡</span>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-neon font-mono">{liveCounts.activeNow.toLocaleString("en-US")}</div>
                  <p className="mt-1 text-xs sm:text-sm text-muted">{t("بوت واتساب متصل الآن")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="badge mb-3">{t("القوة والتحكم الكامل")}</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              {t("كل ما تحتاجه لأتمتة واتسابك في مكان واحد")}
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted">
              {locale === "ar"
                ? "صممنا منصة "
                : "We built "}
              <span className="font-mono font-bold text-accent">Hatem X</span>{" "}
              {locale === "ar"
                ? "لتعطيك ميزات حصرية تفوق التطبيقات المعدلة، مع أمان سحابي تام لا يعرض رقمك للخطر."
                : "to give you exclusive features beyond modified apps, with full cloud security that never puts your number at risk."}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coreFeatures.map((feat) => (
              <div
                key={feat.title.ar}
                className="card group relative flex flex-col justify-between p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-xl hover:shadow-accent/10"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl">{feat.icon}</span>
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                      {feat.badge[locale]}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-fg group-hover:text-accent transition">
                    {feat.title[locale]}
                  </h3>
                  <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-muted">
                    {feat.desc[locale]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border/70 bg-surface/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-14">
              <span className="badge mb-3">{t("المحفظة والمكافآت")}</span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">{t("اربح الكريدت مجاناً كل يوم")}</h2>
              <p className="mt-3 text-muted">{t("محفظتك ومزاياك في مكان واحد — اربح، اعرض، واستبدل متى شئت")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: "💰", title: t("محفظة كريدت"), desc: t("رصيدك الكامل يظهر فوراً، مع حركة صافرة وسجل شفاف") },
                { icon: "💎", title: t("تحويل كريدت ذهبي"), desc: t("بدّل رصيدك إلى ذهبي بسعر تفضيلي 50:1") },
                { icon: "🎁", title: t("مطالبة يومية"), desc: t("استلم كريدت مجانياً كل يوم بضغطة واحدة") },
                { icon: "🎡", title: t("دورة الحظ اليومية"), desc: t("دوّر العجلة واربح جوائز يومية حصرية") },
                { icon: "📺", title: t("شاهد واربح"), desc: t("شاهد إعلانات قصيرة واكسب كريدت دون عناء") },
                { icon: "🔄", title: t("تحويل فوري"), desc: t("حوّل واستبدل رصيدك فورياً بين الميزات والترقيات") },
              ].map((c) => (
                <div key={c.title} className="card flex items-center gap-3 p-5">
                  <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-accent/15 text-xl">{c.icon}</span>
                  <div>
                    <h3 className="font-bold text-fg">{c.title}</h3>
                    <p className="mt-0.5 text-xs text-muted leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ActiveBotsChArt live={liveCounts} />

        <section className="border-y border-border/70 bg-surface/40 py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="badge mb-3">{t("المقارنة العادلة")}</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold">
                {t("لماذا يفضل الآلاف منصة")} <span className="font-mono text-accent">Hatem X</span>؟
              </h2>
              <p className="mt-3 text-muted">{t("مقارنة بين نظامنا السحابي المعتمد وبين نسخ واتساب المعدلة غير الآمنة")}</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/80 bg-elevated/60 shadow-2xl">
              <div className="grid grid-cols-3 bg-surface p-4 sm:p-5 text-sm sm:text-base font-bold border-b border-border">
                <span className="text-muted">{t("الميزة / المعيار")}</span>
                <span className="text-accent flex items-center gap-1.5 font-mono">🌟 {locale === "en" ? "Hatem X Platform" : "منصة Hatem X"}</span>
                <span className="text-red-400">⚠️ {t("التطبيقات المعدلة (GB)")}</span>
              </div>
              <div className="divide-y divide-border/50 text-xs sm:text-sm">
                {comparisons.map((row) => (
                  <div key={row.feature.ar} className="grid grid-cols-3 p-4 sm:p-5 items-center">
                    <span className="font-semibold text-fg">{row.feature[locale]}</span>
                    <span className="text-emerald-400 font-medium pe-2">{row.pro[locale]}</span>
                    <span className="text-muted pe-2">{row.gb[locale]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="text-center mb-14">
            <span className="badge mb-3">{t("سهل وسريع")}</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold">{t("ابدأ في 3 خطوات فقط")}</h2>
            <p className="mt-3 text-muted">{t("لا تحتاج لأي خبرة برمجية — كل شيء جاهز وتلقائي")}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="card relative p-7 sm:p-8">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent font-mono text-xl font-black text-accent-fg shadow-lg shadow-accent/30 mb-6">
                  {s.step}
                </span>
                <h3 className="text-xl font-bold text-fg">{s.title[locale]}</h3>
                <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted">{s.desc[locale]}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border/70 bg-surface/50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="badge mb-3">{t("قريباً")}</span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">{t("مزايا على الطريق إليك")}</h2>
              <p className="mt-3 text-muted">{t("نعمل على إطلاق ميزات جديدة باستمرار لتوسيع عالم البوت")}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {[
                "🤖 بوت تيليغرام مجاني",
                "📥 مدير تنزيلات منصات التواصل",
                "🎵 موسيقى خلفية",
                "📈 كريبتو وكركت مباشر",
                "📰 أخبار مباشرة",
                "🎬 تحميل أفلام",
                "☁️ استضافة الويب",
                "💬 دردشة مباشرة",
                "🧠 أدوات ذكاء اصطناعي",
                "🎓 تعليم أونلاين",
              ].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-elevated px-4 py-2 text-sm font-medium text-muted transition hover:border-accent/50 hover:text-fg"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/70 bg-surface/50 py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="badge mb-3">{t("إجابات واضحة")}</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold">{t("الأسئلة الأكثر شيوعاً")}</h2>
              <p className="mt-3 text-muted">{t("كل ما تود معرفته عن طريقة عمل البوت والحماية والاشتراك")}</p>
            </div>

            <HomeFaqAccordion />
          </div>
        </section>

        <section className="border-t border-border/70 bg-surface/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="badge mb-3">🗣️ {t("تقييمات المستخدمين")}</span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">{t("ماذا يقول مستخدمونا؟")}</h2>
              <p className="mt-3 text-muted">{t("شارك رأيك أو اقرأ تجارب الآخرين مع منصة Hatem X")}</p>
            </div>
            <HomeComments />
          </div>
        </section>

        <section className="relative px-4 py-24 sm:px-6 text-center">
          <div className="mx-auto max-w-4xl rounded-3xl border border-accent/50 bg-gradient-to-br from-surface via-elevated to-surface p-8 sm:p-14 shadow-2xl shadow-accent/15">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              {t("جاهز لتحويل واتسابك إلى قوة خارقة؟")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-muted leading-relaxed">
              {locale === "ar"
                ? "انضم إلى آلاف المستخدمين والشركات الذين يعتمدون على منصة "
                : "Join thousands of users and businesses relying on "}
              <strong className="font-mono text-accent">Hatem X</strong>{" "}
              {locale === "ar"
                ? "يومياً لإدارة أعمالهم وحماية خصوصيتهم وأتمتة محادثاتهم بالكامل."
                : "daily to manage their business, protect their privacy and fully automate their conversations."}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="https://wa.me/967772847565?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20Hatem%20X%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%A7%D9%84%D8%A8%D9%88%D8%AA%20%D9%88%D8%A7%D9%84%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%D9%83"
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-base font-bold px-8 py-3.5 shadow-xl shadow-emerald-600/30 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2"
              >
                {t("💬 تواصل مع Hatem X: 772847565")}
              </a>
              <Link href="/connect" className="rounded-xl border border-border bg-surface px-8 py-3.5 text-base font-semibold text-fg transition hover:border-accent/60 hover:text-white">
                {t("⚡ اربط بوتك الآن مجاناً")}
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">{t("تواصل مباشر مع Hatem X عبر واتساب 772847565 • إعداد فوري • كل شيء جاهز ومضبوط")}</p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
