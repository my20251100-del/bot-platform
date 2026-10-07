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

const coreFeatures: {
  icon: string;
  badge: Bi;
  title: Bi;
  desc: Bi;
  gradient: string;
  featured?: boolean;
}[] = [
  {
    icon: "🛡️",
    badge: { ar: "حماية 100%", en: "100% Protection" },
    title: { ar: "مضاد حذف الرسائل والوسائط الفوري", en: "Anti-Delete for Messages & Media" },
    desc: {
      ar: "إذا أرسل لك أي شخص رسالة أو صورة أو تسجيلاً صوتياً ثم حذفه للجميع، يلتقطها البوت فوراً في أجزاء من الثانية ويحفظها في محادثتك الخاصة لتراها كاملة دون أن يعلم المرسل.",
      en: "If anyone sends you a message, photo, or audio then deletes it for everyone, the bot catches it in milliseconds and saves it to your private chat completely.",
    },
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    featured: true,
  },
  {
    icon: "🤖",
    badge: { ar: "مدعوم بـ AI Gemini", en: "Powered by Gemini AI" },
    title: { ar: "رد تلقائي فائق الذكاء بالذكاء الاصطناعي", en: "Smart AI Auto-Reply" },
    desc: {
      ar: "مساعد ذكي سحابي يفهم أسئلة جهات اتصالك وعملائك ويرد بطبيعية كإنسان حقيقي، مع دعم كود التفعيل والحماية (940870) والردود المخصصة 24/7 دون أي تدخل منك.",
      en: "A cloud assistant understanding your contacts' inquiries and replying naturally like a real human, with passcode protection (940870) and custom responses 24/7.",
    },
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    featured: true,
  },
  {
    icon: "👁️",
    badge: { ar: "تفاعل آلي فوري", en: "Instant Auto Interaction" },
    title: { ar: "مشاهدة الحالات والتفاعل بالقلوب", en: "Status Views & Emoji Reactions" },
    desc: {
      ar: "يشاهد البوت حالات جهات اتصالك أولاً بأول فور نشرها حتى وهاتفك مغلق، مع إمكانية التفاعل التلقائي بالقلوب والإيموجي المخصص لكل حالة لتعزيز حضورك الاجتماعي.",
      en: "The bot views your contacts' status updates the moment they post even while your phone is off, with auto hearts and custom emoji reactions.",
    },
    gradient: "from-purple-500/20 via-pink-500/10 to-transparent",
  },
  {
    icon: "🔒",
    badge: { ar: "خصوصية مطلقة", en: "Absolute Privacy" },
    title: { ar: "كاشف وسائط النظرة الواحدة (View-Once)", en: "View-Once Media Detector" },
    desc: {
      ar: "يسمح لك بمشاهدة وحفظ الصور ومقاطع الفيديو المرسلة بخاصية (عرض لمرة واحدة) بدون أي قيود، وبسرية تامة وأمان كامل على خوادمنا السحابية المشفرة.",
      en: "Allows viewing and saving view-once photos and videos without restrictions, in full confidentiality on our encrypted cloud servers.",
    },
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
  },
  {
    icon: "📢",
    badge: { ar: "تسويق وأتمتة", en: "Marketing & Growth" },
    title: { ar: "مجدول النشر والرسائل الجماعية", en: "Scheduled Broadcasts & Bulk Messages" },
    desc: {
      ar: "جدول منشوراتك الترويجية والرسائل الدورية لقنواتك ومجموعاتك في أوقات الذروة بضغطة زر واحدة لتصل لآلاف العملاء بدون أي مجهود يدوي متكرر.",
      en: "Schedule promotional posts and recurring updates to your channels and groups at peak times with a single click.",
    },
    gradient: "from-blue-500/20 via-indigo-500/10 to-transparent",
  },
  {
    icon: "💰",
    badge: { ar: "مكافآت مجانية يومياً", en: "Free Daily Rewards" },
    title: { ar: "محفظة الكريدت ونظام الإحالات", en: "Credit Wallet & Referral Rewards" },
    desc: {
      ar: "اجمع رصيد الكريدت مجاناً كل يوم، وشارك كود إحالتك لتربح 10 كريدت عن كل صديق ينضم، واستبدلها بميزات وترقيات حصرية دون دفع أي فلس.",
      en: "Collect free credits daily, share your referral code to earn 10 credits per friend, and redeem them for exclusive Pro features for free.",
    },
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
  },
];

const comparisons: { feature: Bi; pro: Bi; gb: Bi }[] = [
  {
    feature: { ar: "التشغيل والاستقرار السحابي", en: "Cloud Operation & Stability" },
    pro: { ar: "سحابي 24/7 دون توقف حتى لو نفدت بطاريتك أو أغلق جوالك", en: "Cloud 24/7 non-stop even if battery dies or phone is shut down" },
    gb: { ar: "يتوقف فوراً عند إغلاق التطبيق أو انقطاع النت", en: "Stops immediately if the app closes or internet drops" },
  },
  {
    feature: { ar: "أمان الحساب وتجنب الحظر", en: "Account Safety & Anti-Ban" },
    pro: { ar: "آمن 100% عبر جلسات Web الرسمية وبروتوكول التردد الذكي", en: "100% safe via official Web sessions and smart rate limiting" },
    gb: { ar: "معرض للحظر الدائم والمفاجئ من خوادم واتساب", en: "Subject to permanent and unexpected WhatsApp bans" },
  },
  {
    feature: { ar: "تشفير البيانات والخصوصية", en: "Privacy & Data Encryption" },
    pro: { ar: "تشفير طرف إلى طرف معتمد من بروتوكول Signal الرسمي", en: "End-to-end encryption backed by the official Signal protocol" },
    gb: { ar: "ملفات معدلة غير آمنة تسحب المحادثات والملفات", en: "Insecure modified files that expose messages and private data" },
  },
  {
    feature: { ar: "سرعة الربط وسهولة الاستخدام", en: "Setup Speed & Simplicity" },
    pro: { ar: "ربط فوري خلال 10 ثوانٍ بكود الاقتران بدون تثبيت أي تطبيق", en: "Instant pairing in 10s via pairing code without installing apps" },
    gb: { ar: "يتطلب تحميل ملفات APK مجهولة المصدر والتعديل بالنظام", en: "Requires downloading unknown APK files and altering system" },
  },
];

const steps: { step: string; title: Bi; desc: Bi; icon: string }[] = [
  {
    step: "01",
    icon: "📱",
    title: { ar: "أدخل رقم هاتفك", en: "Enter your phone number" },
    desc: {
      ar: "اكتب رقم هاتفك مع الرمز الدولي في خانة الربط السريع أعلاه لتحصل على كود الاقتران المباشر فوراً.",
      en: "Enter your phone number with country code in the quick-link box to get a pairing code instantly.",
    },
  },
  {
    step: "02",
    icon: "🔗",
    title: { ar: "أدخل الكود في واتساب", en: "Enter the code in WhatsApp" },
    desc: {
      ar: "افتح تطبيق واتساب > الأجهزة المرتبطة > ربط باستخدام رقم الهاتف، واكتب الكود المكون من 8 خانات.",
      en: "Open WhatsApp > Linked devices > Link with phone number, and enter the 8-digit code.",
    },
  },
  {
    step: "03",
    icon: "🚀",
    title: { ar: "استمتع بالأتمتة والحماية", en: "Enjoy 24/7 Automation" },
    desc: {
      ar: "مبروك! بوتك الآن شغال سحابياً 24/7 دون توقف، وتحكم في كافة الخصائص والإعدادات بضغطة زر واحدة.",
      en: "Congratulations! Your bot runs 24/7 in the cloud, control all features with a single click.",
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
        {/* هالات إضاءة خلفية دقيقة وعصرية */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[1000px] rounded-full bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent blur-[140px]" />
        <div className="pointer-events-none absolute top-[700px] -right-40 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[130px]" />
        <div className="pointer-events-none absolute top-[1400px] -left-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[130px]" />

        {/* HERO SECTION */}
        <section className="relative px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-20">
          <div className="mx-auto max-w-5xl text-center">
            
            {/* شارة التحديث الفاخرة */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-slate-900/80 px-4 py-1.5 text-xs sm:text-sm font-semibold text-emerald-300 shadow-lg shadow-emerald-500/10 backdrop-blur-xl">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
              </span>
              <span>{t("منصة Hatem X ⚡ — أتمتة وحماية واتساب السحابية 2.0")}</span>
            </div>

            {/* العنوان الرئيسي المبهر */}
            <h1 className="mt-8 text-balance text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.15]">
              {locale === "ar" ? (
                <>
                  بوت{" "}
                  <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent font-display">
                    Hatem X
                  </span>{" "}
                  السحابي
                </>
              ) : (
                <>
                  <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent font-display">
                    Hatem X
                  </span>{" "}
                  Cloud Bot
                </>
              )}
              <br />
              <span className="mt-3 block text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100">
                {t("تحكّم بواتسابك، رد بذكاء، واحمِ خصوصيتك 24/7")}
              </span>
            </h1>

            {/* الوصف التعريفي */}
            <p className="mx-auto mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-300">
              {t("المنصة السحابية الأكثر استقراراً وأماناً من")}{" "}
              <strong className="font-bold text-emerald-400 font-display">Hatem X</strong> —{" "}
              {t("مضاد حذف الرسائل والوسائط، ردود ذكية وفورية مدعومة بالذكاء الاصطناعي، وتفاعل تلقائي مع الحالات سحابياً على مدار الساعة دون الحاجة لفتح واتساب وبدون برامج معدلة.")}
            </p>

            {/* أداة الربط السريع الفوري */}
            <HomeHeroConnect />

            {/* أزرار الإجراءات السريعة */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <a
                href="https://wa.me/967772847565?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20Hatem%20X%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%A7%D9%84%D8%A8%D9%88%D8%AA%20%D9%88%D8%A7%D9%84%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%D9%83"
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-sm sm:text-base flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/30 font-bold px-6 py-3"
              >
                <span>💬 {t("تواصل مع Hatem X (772847565)")}</span>
              </a>
              <Link
                href="/connect"
                className="rounded-xl border border-white/10 bg-slate-900/80 px-5 py-3 text-sm sm:text-base font-semibold text-white transition hover:border-emerald-500/50 hover:bg-slate-800"
              >
                {t("⚡ صفحة الربط المباشر")}
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-5 py-3 text-sm sm:text-base font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                {t("دخول المشتركين 👤")}
              </Link>
            </div>

            {/* شريط الضمانات والتأكيدات */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> تشفير Signal طرف إلى طرف
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> سحابي 24/7 دون استهلاك بطارية
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> حماية تامة ضد الحظر
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> إعداد سهل خلال ثوانٍ
              </span>
            </div>
          </div>

          {/* محاكاة شاشة واتساب التفاعلية الفاخرة */}
          <HomeBotSimulation />
        </section>

        {/* شريط العدادات الحية (Live Database Counters) */}
        <section className="border-y border-white/10 bg-slate-950/70 backdrop-blur-2xl">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-900/50 p-5 shadow-lg backdrop-blur-md">
                <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-2xl text-emerald-400 shadow-inner">
                  🤖
                </span>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                    {totalBots.toLocaleString("en-US")}
                  </div>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-400">{t("بوت واتساب على المنصة")}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-900/50 p-5 shadow-lg backdrop-blur-md">
                <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-cyan-500/15 text-2xl text-cyan-400 shadow-inner">
                  📶
                </span>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
                    {totalBots > 0 ? `${Math.round((liveCounts.activeNow / totalBots) * 100)}%` : "0%"}
                  </div>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-400">{t("من البوتات متصلة الآن")}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-900/50 p-5 shadow-lg backdrop-blur-md">
                <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-violet-500/15 text-2xl text-violet-400 shadow-inner">
                  💬
                </span>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-violet-300 font-mono">
                    {liveCounts.all.toLocaleString("en-US")}
                  </div>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-400">{t("رسالة وحالة تمت معالجتها")}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-900/50 p-5 shadow-lg backdrop-blur-md">
                <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-amber-500/15 text-2xl text-amber-400 shadow-inner">
                  ⚡
                </span>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                    {liveCounts.activeNow.toLocaleString("en-US")}
                  </div>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-400">{t("بوت واتساب متصل الآن")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* شبكة الميزات العصرية بنمط BENTO GRID */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="badge mb-3 text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
              {t("القوة والأتمتة السحابية")}
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              {t("كل ما تحتاجه لأتمتة واتسابك في مكان واحد")}
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
              {locale === "ar"
                ? "صممنا منصة "
                : "We engineered "}
              <span className="font-display font-bold text-emerald-400">Hatem X</span>{" "}
              {locale === "ar"
                ? "لتقدم لك ترسانة من الميزات الحصرية التي تفوق التطبيقات المعدلة، مع أمان سحابي تام لا يعرض رقمك لخطر الحظر أبداً."
                : "to deliver a suite of exclusive features outperforming modded apps, with total cloud security."}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coreFeatures.map((feat) => (
              <div
                key={feat.title.ar}
                className={`card group relative flex flex-col justify-between p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/10 ${
                  feat.featured ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                {/* خلفية تدرج خفيفة لكل بطاقة */}
                <div
                  className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${feat.gradient} opacity-40 transition-opacity group-hover:opacity-70`}
                />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-5">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900/80 border border-white/10 text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      {feat.icon}
                    </span>
                    <span className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-emerald-400 backdrop-blur-md">
                      {feat.badge[locale]}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {feat.title[locale]}
                  </h3>
                  <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-400">
                    {feat.desc[locale]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* قسم استعراض أتمتة إنستقرام الجديد والحصري */}
        <section className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 p-8 sm:p-12 shadow-2xl backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-rose-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-2xl text-start">
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-300 mb-4">
                  <span>📸 جديد وحصري</span>
                  <span>•</span>
                  <span>قسم إنستقرام المستقل 2.0</span>
                </div>
                <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  أتمتة حسابك على <span className="text-gradient-instagram font-display">Instagram</span> أصبحت متاحة الآن!
                </h3>
                <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                  صفحة مستقلة مخصصة لحسابك: مشاهدة الستوريات 24/7 سحابياً، تفاعل بالقلوب والإيموجي لرفع الظهور، ورد ذكي بالذكاء الاصطناعي على رسائل الدايركت (للعملاء، للأصدقاء، أو للجميع).
                </p>
                <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5"><span className="text-rose-400">✓</span> مشاهدة الستوريات في 0.05s</span>
                  <span className="flex items-center gap-1.5"><span className="text-rose-400">✓</span> تفاعل بالقلوب</span>
                  <span className="flex items-center gap-1.5"><span className="text-rose-400">✓</span> رد آلي للعملاء والأصدقاء</span>
                  <span className="flex items-center gap-1.5"><span className="text-rose-400">✓</span> كود تفعيل 940870</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto flex-shrink-0">
                <Link
                  href="/instagram"
                  className="btn-instagram text-center text-sm sm:text-base font-bold py-3.5 px-8 shadow-xl shadow-rose-500/30 whitespace-nowrap"
                >
                  دخول قسم إنستقرام 📸
                </Link>
                <a
                  href="https://wa.me/967772847565?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20Hatem%20X%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%A3%D8%AA%D9%85%D8%AA%D8%A9%20%D8%A7%D9%84%D8%A7%D9%86%D8%B3%D8%AA%D9%82%D8%B1%D8%A7%D9%85"
                  target="_blank"
                  rel="noreferrer"
                  className="text-center rounded-xl border border-white/10 bg-slate-900/80 hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-200 py-3 px-6 transition"
                >
                  💬 تفعيل مباشر مع Hatem X
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* قسم محفظة الكريدت والمكافآت اليومية */}
        <section className="border-t border-white/10 bg-slate-950/60 py-20 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <span className="badge mb-3 text-cyan-400 border-cyan-500/30 bg-cyan-500/10">
                {t("المحفظة والمكافآت")}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
                {t("اربح الكريدت مجاناً كل يوم")}
              </h2>
              <p className="mt-3 text-slate-400 text-sm sm:text-base">
                {t("محفظتك ومزاياك في مكان واحد — اربح، اعرض، واستبدل متى شئت")}
              </p>
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
                <div
                  key={c.title}
                  className="card flex items-center gap-4 p-5 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10"
                >
                  <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-2xl">
                    {c.icon}
                  </span>
                  <div>
                    <h3 className="font-bold text-white text-base">{c.title}</h3>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* مخطط النشاط المباشر */}
        <ActiveBotsChArt live={liveCounts} />

        {/* جدول المقارنة العادلة (Hatem X vs GB WhatsApp) */}
        <section className="border-y border-white/10 bg-slate-950/70 py-24 backdrop-blur-xl">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <span className="badge mb-3 text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                {t("المقارنة العادلة")}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                {t("لماذا يفضل الآلاف منصة")}{" "}
                <span className="font-display text-emerald-400">Hatem X</span>؟
              </h2>
              <p className="mt-3 text-slate-400 text-sm sm:text-base">
                {t("مقارنة بين نظامنا السحابي المعتمد وبين نسخ واتساب المعدلة غير الآمنة")}
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-2xl">
              <div className="grid grid-cols-3 bg-slate-900/90 p-4 sm:p-5 text-sm sm:text-base font-bold border-b border-white/10">
                <span className="text-slate-400">{t("الميزة / المعيار")}</span>
                <span className="text-emerald-400 flex items-center gap-1.5 font-display">
                  🌟 {locale === "en" ? "Hatem X Platform" : "منصة Hatem X"}
                </span>
                <span className="text-rose-400">⚠️ {t("التطبيقات المعدلة (GB)")}</span>
              </div>
              <div className="divide-y divide-white/5 text-xs sm:text-sm">
                {comparisons.map((row) => (
                  <div key={row.feature.ar} className="grid grid-cols-3 p-4 sm:p-5 items-center hover:bg-white/[0.02] transition">
                    <span className="font-semibold text-white">{row.feature[locale]}</span>
                    <span className="text-emerald-300 font-medium pe-2 flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span> {row.pro[locale]}
                    </span>
                    <span className="text-slate-400 pe-2 flex items-center gap-1.5">
                      <span className="text-rose-400">✕</span> {row.gb[locale]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* خطوات البدء السريعة في 3 خطوات */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <span className="badge mb-3 text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
              {t("سهل وسريع")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              {t("ابدأ في 3 خطوات فقط")}
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              {t("لا تحتاج لأي خبرة برمجية — كل شيء جاهز وتلقائي")}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="card relative p-8 hover:border-emerald-500/40">
                <div className="flex items-center justify-between mb-6">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 font-mono text-xl font-black text-slate-950 shadow-lg shadow-emerald-500/20">
                    {s.step}
                  </span>
                  <span className="text-3xl">{s.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white">{s.title[locale]}</h3>
                <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-slate-400">
                  {s.desc[locale]}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* المزايا القادمة قريباً */}
        <section className="border-t border-white/10 bg-slate-950/60 py-20 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-12 max-w-2xl mx-auto">
              <span className="badge mb-3 text-indigo-400 border-indigo-500/30 bg-indigo-500/10">
                {t("قريباً")}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
                {t("مزايا على الطريق إليك")}
              </h2>
              <p className="mt-3 text-slate-400 text-sm sm:text-base">
                {t("نعمل على إطلاق ميزات جديدة باستمرار لتوسيع عالم البوت")}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {[
                "🤖 بوت تيليغرام مجاني",
                "📥 مدير تنزيلات منصات التواصل",
                "🎵 موسيقى خلفية ومقاطع صوتية",
                "📈 كريبتو ومؤشرات حية",
                "📰 أخبار عاجلة مباشرة",
                "🎬 تحميل وسائط وأفلام",
                "☁️ استضافة سحابية فورية",
                "💬 دعم فني مباشر متقدم",
                "🧠 أدوات ذكاء اصطناعي إضافية",
                "🎓 أكاديمية تعليمية تفاعلية",
              ].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-emerald-500/40 hover:text-white hover:bg-slate-800"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* الأسئلة الشائعة */}
        <section className="border-t border-white/10 bg-slate-950/60 py-20 backdrop-blur-xl">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="badge mb-3 text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                {t("إجابات واضحة")}
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                {t("الأسئلة الأكثر شيوعاً")}
              </h2>
              <p className="mt-3 text-slate-400 text-sm sm:text-base">
                {t("كل ما تود معرفته عن طريقة عمل البوت والحماية والاشتراك")}
              </p>
            </div>

            <HomeFaqAccordion />
          </div>
        </section>

        {/* تقييمات وتجارب المستخدمين */}
        <section className="border-t border-white/10 bg-slate-950/60 py-20 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="badge mb-3 text-violet-400 border-violet-500/30 bg-violet-500/10">
                🗣️ {t("تقييمات المستخدمين")}
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
                {t("ماذا يقول مستخدمونا؟")}
              </h2>
              <p className="mt-3 text-slate-400 text-sm sm:text-base">
                {t("شارك رأيك أو اقرأ تجارب الآخرين مع منصة Hatem X")}
              </p>
            </div>
            <HomeComments />
          </div>
        </section>

        {/* قسم الدعوة النهائي الخارق (FINAL CTA) */}
        <section className="relative px-4 py-24 sm:px-6 text-center">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 sm:p-14 shadow-2xl shadow-emerald-500/10">
            {/* هالة داخلية دافئة */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full bg-emerald-500/15 blur-3xl" />

            <div className="relative z-10">
              <span className="badge mb-4 text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                🚀 انضم للثورة السحابية
              </span>

              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                {t("جاهز لتحويل واتسابك إلى قوة خارقة؟")}
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
                {locale === "ar"
                  ? "انضم إلى آلاف المستخدمين والشركات الذين يعتمدون على منصة "
                  : "Join thousands of users and businesses relying on "}
                <strong className="font-display text-emerald-400">Hatem X</strong>{" "}
                {locale === "ar"
                  ? "يومياً لإدارة أعمالهم وحماية خصوصيتهم وأتمتة محادثاتهم بالكامل سحابياً 24/7."
                  : "daily to manage their business, protect their privacy and fully automate their conversations 24/7."}
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <a
                  href="https://wa.me/967772847565?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20Hatem%20X%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%A7%D9%84%D8%A8%D9%88%D8%AA%20%D9%88%D8%A7%D9%84%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%D9%83"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-base font-bold px-8 py-3.5 shadow-xl shadow-emerald-600/30 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2"
                >
                  <span>💬 تواصل مع Hatem X: 772847565</span>
                </a>
                <Link
                  href="/connect"
                  className="rounded-xl border border-white/15 bg-slate-900/80 px-8 py-3.5 text-base font-semibold text-white transition hover:border-emerald-500/50 hover:bg-slate-800"
                >
                  {t("⚡ اربط بوتك الآن مجاناً")}
                </Link>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                {t("تواصل مباشر مع Hatem X عبر واتساب 772847565 • إعداد فوري • كل شيء جاهز ومضبوط")}
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
