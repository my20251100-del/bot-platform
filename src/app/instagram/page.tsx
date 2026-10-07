import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import InstagramSimulator from "@/components/instagram-simulator";
import InstagramControlHub from "@/components/instagram-control-hub";

export const metadata = {
  title: "أتمتة إنستقرام الذكية 2.0 | Hatem X Instagram Automation",
  description:
    "المنصة السحابية المتكاملة لأتمتة إنستقرام: مشاهدة الستوريات تلقائياً 24/7، التفاعل بالقلوب، والرد الذكي على الدايركت للعملاء والأصدقاء والجميع.",
};

export default function InstagramPage() {
  const instagramFeatures = [
    {
      icon: "👁️",
      title: "مشاهدة الستوريات التلقائية 24/7",
      desc: "يشاهد البوت ستوريات كافة متابعيك وجهات اتصالك أولاً بأول فور نشرها وفي أجزاء من الثانية، حتى وهاتفك مغلق أو بدون إنترنت.",
      badge: "أتمتة سحابية",
      gradient: "from-amber-500/20 via-rose-500/10 to-transparent",
    },
    {
      icon: "❤️",
      title: "التفاعل بالقلوب والإيموجي التلقائي",
      desc: "وضع لايكات وتفاعل بالقلوب والإيموجي المخصص مع ستوريات الأصدقاء لتعزيز حضور حسابك وزيادة التفاعل والظهور في الخوارزمية.",
      badge: "تفاعل حي",
      gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
    },
    {
      icon: "🤖",
      title: "الرد التلقائي الذكي على الدايركت (DMs)",
      desc: "رد فوري بالذكاء الاصطناعي (Gemini) يفهم الرسائل بدقة، مع تخصيص الرد للعملاء (طلبات وأسعار)، للأصدقاء (طبيعي وبشري)، أو للجميع.",
      badge: "مدعوم بـ AI",
      gradient: "from-purple-500/20 via-indigo-500/10 to-transparent",
    },
    {
      icon: "🔒",
      title: "أمان مطلق وحماية تامة ضد الحظر",
      desc: "نظام فواصل بشرية ذكية (Human Delays) ومحاكاة الجلسات الرسمية لمنع تقييد أو حظر الحساب على عكس التطبيقات غير الآمنة.",
      badge: "آمن 100%",
      gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    },
    {
      icon: "🔑",
      title: "رمز التفعيل والإيقاف الفوري (940870)",
      desc: "تحكم فوري بتشغيل أو إيقاف الرد التلقائي على محادثات الدايركت من خلال الرمز السري الموحد، أو بضغطة زر من صفحة التحكم.",
      badge: "تحكم كامل",
      gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    },
    {
      icon: "☁️",
      title: "تشغيل سحابي مستقل لا يستهلك جوالك",
      desc: "خوادم AWS سحابية تدير حسابك على مدار الساعة دون استهلاك بطارية الهاتف أو استنزاف باقة البيانات.",
      badge: "سحابي 24/7",
      gradient: "from-fuchsia-500/20 via-purple-500/10 to-transparent",
    },
  ];

  return (
    <>
      <SiteHeader />

      <main className="relative overflow-hidden">
        {/* خلفيات إضاءة أورورا إنستقرام */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[1000px] rounded-full bg-gradient-to-b from-rose-500/15 via-purple-500/10 to-transparent blur-[140px]" />
        <div className="pointer-events-none absolute top-[700px] -left-40 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[130px]" />
        <div className="pointer-events-none absolute top-[1300px] -right-40 h-[500px] w-[500px] rounded-full bg-pink-500/10 blur-[130px]" />

        {/* HERO SECTION */}
        <section className="relative px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-20">
          <div className="mx-auto max-w-5xl text-center">
            
            {/* شارة إنستقرام الحصرية */}
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-slate-900/80 px-4 py-1.5 text-xs sm:text-sm font-semibold text-rose-300 shadow-lg shadow-rose-500/15 backdrop-blur-xl">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-[10px] text-white font-bold">
                📸
              </span>
              <span>قسم إنستقرام المستقل 2.0 • منصة Hatem X</span>
            </div>

            {/* العنوان الرئيسي */}
            <h1 className="mt-8 text-balance text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.15]">
              أتمتة{" "}
              <span className="bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 bg-clip-text text-transparent font-display">
                Instagram
              </span>{" "}
              الذكية
              <br />
              <span className="mt-3 block text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100">
                مشاهدة الستوريات، تفاعل بالقلوب، ورد فوري على الدايركت
              </span>
            </h1>

            {/* الوصف */}
            <p className="mx-auto mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-300">
              منصة سحابية مخصصة ومستقلة لحسابك على إنستقرام — تشاهد ستوريات المتابعين فور نشرها، تتفاعل بالقلوب لرفع ظهور حسابك، وترد على رسائل الخاص تلقائياً بالذكاء الاصطناعي (للعملاء، للأصدقاء، أو للكل) 24/7 دون توقف.
            </p>

            {/* أزرار الإجراءات */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <a
                href="https://wa.me/967772847565?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20Hatem%20X%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%A3%D8%AA%D9%85%D8%AA%D8%A9%20%D8%A7%D9%84%D8%A7%D9%86%D8%B3%D8%AA%D9%82%D8%B1%D8%A7%D9%85%20%D9%84%D8%AD%D8%B3%D8%A7%D8%A8%D9%8A"
                target="_blank"
                rel="noreferrer"
                className="btn-instagram text-sm sm:text-base flex items-center gap-2 font-bold px-7 py-3.5 shadow-xl shadow-rose-500/25"
              >
                <span>💬 تفعيل بوت إنستقرام مع Hatem X</span>
              </a>

              <Link
                href="/bot"
                className="rounded-xl border border-white/10 bg-slate-900/80 px-6 py-3.5 text-sm sm:text-base font-semibold text-white transition hover:border-rose-500/50 hover:bg-slate-800"
              >
                <span>🤖 منصة واتساب الرئيسية</span>
              </Link>
            </div>

            {/* شريط الميزات السريعة */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="text-rose-400">✓</span> مشاهدة الستوريات في 0.05 ثانية
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-rose-400">✓</span> تفاعل بالقلوب والإيموجي
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-rose-400">✓</span> رد آلي للعملاء والأصدقاء
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-rose-400">✓</span> كود تفعيل وحماية (940870)
              </span>
            </div>
          </div>

          {/* محاكاة إنستقرام الحية التفاعلية */}
          <InstagramSimulator />

          {/* لوحة التحكم والربط المباشرة */}
          <InstagramControlHub />
        </section>

        {/* شبكة ميزات إنستقرام (Bento Grid) */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="badge mb-3 text-rose-400 border-rose-500/30 bg-rose-500/10">
              📸 قوة الأتمتة السحابية
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              كل ما تحتاجه لإدارة وتنمية حسابك على إنستقرام
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
              حل سحابي متكامل يجمع بين مشاهدة الستوريات اللحظية، التفاعل بالقلوب، والردود الذكية بالذكاء الاصطناعي لحسابات الأعمال والحسابات الشخصية.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {instagramFeatures.map((feat) => (
              <div
                key={feat.title}
                className="card group relative flex flex-col justify-between p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-rose-500/40 hover:shadow-2xl hover:shadow-rose-500/10"
              >
                <div className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${feat.gradient} opacity-35 group-hover:opacity-65 transition-opacity`} />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-5">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900/80 border border-white/10 text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      {feat.icon}
                    </span>
                    <span className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-rose-400">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-rose-300 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-400">
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* قسم مقارنة أتمتة إنستقرام */}
        <section className="border-y border-white/10 bg-slate-950/70 py-20 backdrop-blur-xl">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <span className="badge mb-3 text-rose-400 border-rose-500/30 bg-rose-500/10">
                المقارنة الاحترافية
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                لماذا أتمتة إنستقرام من <span className="text-rose-400 font-display">Hatem X</span> هي الأفضل؟
              </h2>
              <p className="mt-3 text-slate-400 text-sm sm:text-base">
                مقارنة بين نظامنا السحابي الموثوق وبين التطبيقات والسكربتات مجهولة المصدر
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-2xl">
              <div className="grid grid-cols-3 bg-slate-900/90 p-4 sm:p-5 text-sm sm:text-base font-bold border-b border-white/10">
                <span className="text-slate-400">الميزة / المعيار</span>
                <span className="text-rose-400 flex items-center gap-1.5 font-display">
                  🌟 نظام Hatem X السحابي
                </span>
                <span className="text-rose-300/60">⚠️ البرامج والتطبيقات الخارجية</span>
              </div>
              <div className="divide-y divide-white/5 text-xs sm:text-sm">
                {[
                  {
                    m: "مشاهدة الستوريات",
                    pro: "سحابي 24/7 فور نشر الستوري في أجزاء من الثانية",
                    con: "يتطلب تشغيل التطبيق وإبقاء الهاتف مفتوحاً",
                  },
                  {
                    m: "الرد على الدايركت",
                    pro: "ذكاء اصطناعي Gemini يفهم العملاء والأصدقاء ويرد بلباقة",
                    con: "ردود آلية بدائية ثابتة ومكشوفة",
                  },
                  {
                    m: "أمان الحساب والحظر",
                    pro: "فواصل زمنية بشرية تحاكي الاستخدام الطبيعي لمنع أي قيود",
                    con: "حظر مفاجئ ومخالفة لقوانين إنستقرام",
                  },
                  {
                    m: "حماية الخصوصية",
                    pro: "لا يتم طلب كلمة المرور، تشفير وحماية تامة للبيانات",
                    con: "تطلب كلمة السر وتعرض الحساب للاختراق والسرقة",
                  },
                ].map((row) => (
                  <div key={row.m} className="grid grid-cols-3 p-4 sm:p-5 items-center hover:bg-white/[0.02] transition">
                    <span className="font-semibold text-white">{row.m}</span>
                    <span className="text-emerald-300 font-medium pe-2 flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span> {row.pro}
                    </span>
                    <span className="text-slate-400 pe-2 flex items-center gap-1.5">
                      <span className="text-rose-400">✕</span> {row.con}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* قسم الأسئلة الشائعة حول إنستقرام */}
        <section className="border-t border-white/10 bg-slate-950/60 py-20 backdrop-blur-xl">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="badge mb-3 text-rose-400 border-rose-500/30 bg-rose-500/10">
                إجابات مباشرة
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                الأسئلة الشائعة حول أتمتة إنستقرام
              </h2>
              <p className="mt-3 text-slate-400 text-sm sm:text-base">
                كل ما تحتاج لمعرفته حول طريقة عمل بوت إنستقرام والحماية والتفعيل
              </p>
            </div>

            <div className="space-y-3.5">
              {[
                {
                  q: "كيف يعمل بوت مشاهدة الستوريات وهل يحتاج بقاء هاتفي متصلاً؟",
                  a: "البوت يعمل سحابياً على خوادمنا السحابية 24/7 دون أي حاجة لبقاء هاتفك مفتوحاً أو متصلاً بالإنترنت. بمجرد نشر أي شخص في قائمة متابعيك لستوري، يلتقطه الخادم ويشاهده فورياً ويسجل لك حضوراً في قائمة المشاهدين.",
                },
                {
                  q: "كيف يميز البوت بين الرد على العملاء والرد على الأصدقاء في الدايركت؟",
                  a: "يمكنك من لوحة التحكم اختيار وضع الرد المناسب: (الرد على الكل)، أو (الرد على العملاء فقط) بحيث يتعرف الذكاء الاصطناعي على الكلمات الدلالية التجارية والأسعار، أو (الرد على الأصدقاء) بنبرة بشرية ودية، كما يمكنك تفعيل كود الحماية (940870) لإيقاف أو تشغيل الرد فوراً.",
                },
                {
                  q: "هل حسابي في إنستقرام آمن من الحظر؟",
                  a: "نعم 100%. نحن نطبق نظام فواصل زمنية مدروسة ومحاكاة للسلوك البشري الطبيعي، مع تحديد سقف آمن لعدد الستوريات والتفاعلات في الساعة الواحدة لتجنب إثارة أي قيود في خوارزميات إنستقرام.",
                },
                {
                  q: "كيف أقوم بتفعيل الخدمة وربط حسابي؟",
                  a: "يمكنك إدخال اسم مستخدم حسابك في لوحة الربط أعلاه، أو التواصل مباشرة مع المطور محمد حاتم عبر واتساب 772847565 لتفعيل الجلسة السحابية فورياً وتجهيز كافة الإعدادات.",
                },
              ].map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md"
                >
                  <h4 className="font-bold text-white text-base sm:text-lg mb-2">
                    {faq.q}
                  </h4>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* قسم الدعوة النهائي الخارق (FINAL CTA) */}
        <section className="relative px-4 py-24 sm:px-6 text-center">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 sm:p-14 shadow-2xl shadow-rose-500/15">
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full bg-rose-500/15 blur-3xl" />

            <div className="relative z-10">
              <span className="badge mb-4 text-rose-400 border-rose-500/30 bg-rose-500/10">
                🚀 إطلاق حصري في Hatem X
              </span>

              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                جاهز لتحويل حسابك على إنستقرام إلى آلة تفاعل ذكية؟
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
                انضم الآن واجعل حسابك يتفاعل، يشاهد الستوريات، ويرد على كافة العملاء والأصدقاء سحابياً 24/7 دون أي مجهود منك.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <a
                  href="https://wa.me/967772847565?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20Hatem%20X%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%A3%D8%AA%D9%85%D8%AA%D8%A9%20%D8%A7%D9%84%D8%A7%D9%86%D8%B3%D8%AA%D9%82%D8%B1%D8%A7%D9%85%20%D8%A7%D9%84%D8%B3%D8%AD%D8%A7%D8%A8%D9%8A%D8%A9"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-instagram text-base font-bold px-8 py-3.5 shadow-xl shadow-rose-500/30 flex items-center gap-2"
                >
                  <span>💬 تفعيل بوت إنستقرام: 772847565</span>
                </a>

                <Link
                  href="/"
                  className="rounded-xl border border-white/15 bg-slate-900/80 px-8 py-3.5 text-base font-semibold text-white transition hover:border-rose-500/50 hover:bg-slate-800"
                >
                  العودة للرئيسية 🏠
                </Link>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                تواصل مباشر مع محمد حاتم (Hatem X) عبر واتساب 772847565 • تفعيل سريع وإعداد مضبوط
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
