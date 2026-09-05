import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ActiveBotsChArt from "@/components/active-bots-chart";
import HomeHeroConnect from "@/components/home-hero-connect";
import HomeBotSimulation from "@/components/home-bot-simulation";
import HomeFaqAccordion from "@/components/home-faq-accordion";

const coreFeatures = [
  {
    icon: "🛡️",
    title: "مضاد حذف الرسائل والوسائط",
    desc: "إذا أرسل لك أي شخص رسالة أو صورة أو تسجيلاً صوتياً ثم حذفه للجميع، يلتقطها البوت فوراً ويحفظها في محادثتك الخاصة لتراها كاملة.",
    badge: "حماية 100%",
  },
  {
    icon: "👁️",
    title: "مشاهدة الحالات والتفاعل التلقائي",
    desc: "يشاهد البوت حالات جهات اتصالك أولاً بأول فور نشرها، مع إمكانية التفاعل التلقائي بالقلوب والإيموجي المخصص لكل حالة.",
    badge: "تفاعل آلي",
  },
  {
    icon: "🤖",
    title: "رد تلقائي ذكي بالذكاء الاصطناعي",
    desc: "مساعد مدمج مدعوم بـ Google Gemini يفهم أسئلة عملائك ويرد بلباقة ودقة 24/7 دون أي تدخل منك، مع دعم الردود المخصصة.",
    badge: "مدعوم بـ AI",
  },
  {
    icon: "🔒",
    title: "كاشف وسائط النظرة الواحدة",
    desc: "يسمح لك بمشاهدة وحفظ الصور والفيديوهات المرسلة بخاصية (عرض لمرة واحدة - ViewOnce) بدون قيود وبسرية تامة.",
    badge: "خصوصية قصوى",
  },
  {
    icon: "📢",
    title: "مجدول النشر والرسائل الجماعية",
    desc: "جدول منشوراتك الترويجية والرسائل الدورية لقنواتك ومجموعاتك في أوقات الذروة بضغطة زر وبدون مجهود يدوي متكرر.",
    badge: "تسويق ونمو",
  },
  {
    icon: "💰",
    title: "محفظة الكريدت ونظام الإحالات",
    desc: "اجمع رصيد الكريدت مجاناً يومياً، وشارك كود إحالتك لتربح 10 كريدت عن كل صديق يشترك، واستبدله بميزات حصرية وترقيات برو.",
    badge: "مكافآت مجانية",
  },
];

const comparisons = [
  {
    feature: "التشغيل والاستقرار السحابي",
    pro: "سحابي 24/7 حتى لو انقطع الإنترنت أو أغلق جوالك",
    gb: "يتوقف فوراً عند إغلاق التطبيق أو انقطاع النت",
  },
  {
    feature: "أمان الحساب والحظر",
    pro: "آمن 100% بمحاكاة المتصفحات الرسمية وضبط التردد",
    gb: "معرض للحظر الدائم والمفاجئ من واتساب",
  },
  {
    feature: "الخصوصية وتشفير البيانات",
    pro: "تشفير طرف إلى طرف معتمد من بروتوكول Signal",
    gb: "تطبيقات غير موثوقة تسحب جهات الاتصال والرسائل",
  },
  {
    feature: "سرعة الربط والإعداد",
    pro: "ربط فوري خلال 10 ثوانٍ بكود الاقتران",
    gb: "يحتاج تنزيل ملفات APK مجهولة وتعديل النظام",
  },
];

const steps = [
  {
    step: "01",
    title: "أدخل رقم هاتفك",
    desc: "اكتب رقم هاتفك مع الرمز الدولي في خانة الربط السريع لتحصل على كود الاقتران فوراً.",
  },
  {
    step: "02",
    title: "أدخل الكود في واتساب",
    desc: "افتح واتساب > الأجهزة المرتبطة > ربط برقم الهاتف، واكتب الكود المكون من 8 خانات.",
  },
  {
    step: "03",
    title: "استمتع بالأتمتة والحماية",
    desc: "مبروك! بوتك الآن شغال 24/7 سحابياً، وتحكم في كل الميزات بضغطة زر من صفحة الإعدادات.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="relative overflow-hidden">
        {/* التوهجات الخلفية العامة */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-accent/10 blur-[120px]" />
        <div className="pointer-events-none absolute top-[600px] -right-40 h-[400px] w-[400px] rounded-full bg-cyber/10 blur-[100px]" />

        {/* 1. قسم الهيرو الرئيسي */}
        <section className="relative px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-20">
          <div className="mx-auto max-w-5xl text-center">
            {/* إشعار التحديث */}
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-surface/80 px-4 py-1.5 text-xs sm:text-sm font-medium text-accent shadow-lg shadow-accent/10 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-matrix opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-matrix"></span>
              </span>
              منصة أتمتة واتساب الأقوى — الإصدار 2.0 فائق السرعة
            </div>

            {/* العنوان العريض */}
            <h1 className="mt-8 text-balance text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-tight">
              التواصل مع صاحب البوت{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-accent to-neon bg-clip-text text-transparent font-mono">
                772847565
              </span>
              <br />
              <span className="text-3xl sm:text-5xl lg:text-6xl text-fg mt-2 inline-block">
                واتس وكل شيء عليه 🚀
              </span>
            </h1>

            {/* الوصف */}
            <p className="mx-auto mt-6 max-w-3xl text-base sm:text-xl leading-relaxed text-muted">
              تواصل مباشرة مع صاحب البوت عبر واتساب على الرقم <strong className="text-emerald-400 font-mono">772847565</strong> لتفعيل البوت وضبط الإعدادات والردود التلقائية بالذكاء الاصطناعي — كل شيء جاهز ومضبوط لك سحابياً 24/7!
            </p>

            {/* صندوق الربط السريع المباشر في الهيرو */}
            <HomeHeroConnect />

            {/* أزرار الإجراء السريع */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <a
                href="https://wa.me/967772847565?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%B5%D8%A7%D8%AD%D8%A8%20%D8%A7%D9%84%D8%A8%D9%88%D8%AA%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%A7%D9%84%D8%A8%D9%88%D8%AA%20%D9%88%D9%83%D9%84%20%D8%B4%D9%8A%D8%A1%20%D8%B9%D9%84%D9%8A%D9%83"
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-sm sm:text-base flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30"
              >
                💬 تواصل واتساب مع صاحب البوت (772847565)
              </a>
              <Link href="/connect" className="rounded-xl border border-border/80 bg-surface/90 px-5 py-3 text-sm sm:text-base font-semibold text-fg transition hover:border-accent/60 hover:text-white">
                ⚡ صفحة الربط المباشر
              </Link>
              <Link href="/login" className="rounded-xl border border-border/80 bg-elevated/70 px-5 py-3 text-sm sm:text-base font-semibold text-muted transition hover:border-accent/40 hover:text-white">
                دخول المشتركين 👤
              </Link>
            </div>
          </div>

          {/* 2. مجسم المحاكاة التفاعلية الحية */}
          <HomeBotSimulation />
        </section>

        {/* 3. شريط إحصائيات الأداء والثقة */}
        <section className="border-y border-border/70 bg-surface/60 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-accent font-mono">+15,000</div>
                <p className="mt-1 text-xs sm:text-sm text-muted">بوت واتساب نشط سحابياً</p>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-matrix font-mono">99.98%</div>
                <p className="mt-1 text-xs sm:text-sm text-muted">نسبة تشغيل مستمر دون انقطاع</p>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-fuchsia-400 font-mono">+5.4M</div>
                <p className="mt-1 text-xs sm:text-sm text-muted">رسالة وحالة تمت معالجتها</p>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-neon font-mono">&lt; 0.15s</div>
                <p className="mt-1 text-xs sm:text-sm text-muted">سرعة استجابة الرد الذكي</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. مميزات البوت الخارقة */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="badge mb-3">القوة والتحكم الكامل</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              كل ما تحتاجه لأتمتة واتسابك في مكان واحد
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted">
              صممنا بوت برو ليعطيك ميزات حصرية تفوق التطبيقات المعدلة، مع أمان سحابي تام لا يعرض رقمك للخطر.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coreFeatures.map((feat) => (
              <div
                key={feat.title}
                className="card group relative flex flex-col justify-between p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-xl hover:shadow-accent/10"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl">{feat.icon}</span>
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-fg group-hover:text-accent transition">
                    {feat.title}
                  </h3>
                  <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-muted">
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. الرسم البياني لنشاط البوتات الحية */}
        <ActiveBotsChArt />

        {/* 6. مقارنة: بوت برو مقابل التطبيقات المعدلة (WhatsApp Plus / GB) */}
        <section className="border-y border-border/70 bg-surface/40 py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="badge mb-3">المقارنة العادلة</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold">لماذا يفضل الآلاف منصة بوت برو؟</h2>
              <p className="mt-3 text-muted">مقارنة بين نظامنا السحابي المعتمد وبين نسخ واتساب المعدلة غير الآمنة</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/80 bg-elevated/60 shadow-2xl">
              <div className="grid grid-cols-3 bg-surface p-4 sm:p-5 text-sm sm:text-base font-bold border-b border-border">
                <span className="text-muted">الميزة / المعيار</span>
                <span className="text-accent flex items-center gap-1.5">🌟 منصة بوت برو</span>
                <span className="text-red-400">⚠️ التطبيقات المعدلة (GB)</span>
              </div>
              <div className="divide-y divide-border/50 text-xs sm:text-sm">
                {comparisons.map((row) => (
                  <div key={row.feature} className="grid grid-cols-3 p-4 sm:p-5 items-center">
                    <span className="font-semibold text-fg">{row.feature}</span>
                    <span className="text-emerald-400 font-medium pe-2">{row.pro}</span>
                    <span className="text-muted pe-2">{row.gb}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 7. خطوات العمل البسيطة */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="text-center mb-14">
            <span className="badge mb-3">سهل وسريع</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold">ابدأ في 3 خطوات فقط</h2>
            <p className="mt-3 text-muted">لا تحتاج لأي خبرة برمجية — كل شيء جاهز وتلقائي</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="card relative p-7 sm:p-8">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent font-mono text-xl font-black text-accent-fg shadow-lg shadow-accent/30 mb-6">
                  {s.step}
                </span>
                <h3 className="text-xl font-bold text-fg">{s.title}</h3>
                <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 8. قسم الأسئلة الشائعة (Interactive FAQ Accordion) */}
        <section className="border-t border-border/70 bg-surface/50 py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="badge mb-3">إجابات واضحة</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold">الأسئلة الأكثر شيوعاً</h2>
              <p className="mt-3 text-muted">كل ما تود معرفته عن طريقة عمل البوت والحماية والاشتراك</p>
            </div>

            <HomeFaqAccordion />
          </div>
        </section>

        {/* 9. الدعوة النهائية للتسجيل والبدء */}
        <section className="relative px-4 py-24 sm:px-6 text-center">
          <div className="mx-auto max-w-4xl rounded-3xl border border-accent/50 bg-gradient-to-br from-surface via-elevated to-surface p-8 sm:p-14 shadow-2xl shadow-accent/15">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              جاهز لتحويل واتسابك إلى قوة خارقة؟
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-muted leading-relaxed">
              انضم إلى آلاف المستخدمين والشركات الذين يعتمدون على بوت برو يومياً لإدارة أعمالهم وحماية خصوصيتهم وأتمتة محادثاتهم بالكامل.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="https://wa.me/967772847565?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%B5%D8%A7%D8%AD%D8%A8%20%D8%A7%D9%84%D8%A8%D9%88%D8%AA%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%A7%D9%84%D8%A8%D9%88%D8%AA%20%D9%88%D9%83%D9%84%20%D8%B4%D9%8A%D8%A1%20%D8%B9%D9%84%D9%8A%D9%83"
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-base font-bold px-8 py-3.5 shadow-xl shadow-emerald-600/30 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2"
              >
                💬 تواصل واتساب مع صاحب البوت: 772847565
              </a>
              <Link href="/connect" className="rounded-xl border border-border bg-surface px-8 py-3.5 text-base font-semibold text-fg transition hover:border-accent/60 hover:text-white">
                ⚡ اربط بوتك الآن مجاناً
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">تواصل مباشر عبر واتساب 772847565 • إعداد فوري • كل شيء جاهز ومضبوط</p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}