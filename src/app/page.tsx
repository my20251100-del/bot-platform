import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ActiveBotsChArt from "@/components/active-bots-chart";

const miniFeatures = [
  {
    title: "مضاد العرض مرة واحدة",
    desc: "شاهد الوسائط المقيدة بسهولة — دون أن يعرف المرسل.",
    icon: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  },
  {
    title: "مضاد الحذف",
    desc: "تتبع الرسائل المحذوفة واحتفظ بها حتى بعد حذفها من الجميع.",
    icon: "M3 3v18h18 M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72 m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85",
  },
  {
    title: "التحكم بالخصوصية",
    desc: "تحكم كامل بظهورك: علامات القراءة، حالة الكتابة، وآخر ظهور.",
    icon: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
  },
  {
    title: "أدوات الوسائط",
    desc: "حمّل الوسائط من المنصات الاجتماعية مباشرة عبر بوتك.",
    icon: "M4 16l4.58-4.58a2 2 0 0 1 2.83 0L16 16 M4 20h16 M14.5 13.5l1.08-1.08a2 2 0 0 1 2.83 0L22 16 M3 3v18h18 M8 8h.01",
  },
  {
    title: "تفاعل تلقائي",
    desc: "تفاعلات آلية مع الحالات والرسائل بالإيموجي الذي تختاره.",
    icon: "M11.48 3.499a.5.5 0 0 1 .501 0l4.79 3.227a.5.5 0 0 1 .245.46v4.286a.5.5 0 0 1-.246.46L12 15.09l-4.77-3.158a.5.5 0 0 1-.23-.44v-4.29a.5.5 0 0 1 .246-.46z M12 19v2",
  },
  {
    title: "رد تلقائي ذكي",
    desc: "ردود فورية بالذكاء الاصطناعي على كل الرسائل الواردة.",
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  },
];

const toolbox = [
  { icon: "🤖", t: "بوت واتساب مجاني", d: "اربط بوتاً قوياً في ثوانٍ — رد تلقائي، مضاد حذف، وأدوات الحالات. مجاني 100%، بدون تطبيق أو برمجة." },
  { icon: "🧠", t: "مساعد ذكاء اصطناعي", d: "مساعد مدمج يجيب على أسئلتك ويرشدك في المنصة ليلاً ونهاراً." },
  { icon: "🎁", t: "مكافآت الإحالة", d: "شارك رابطك — تحصل أنت وصديقك على 10 كريدت فوراً. بدون حدود." },
  { icon: "👑", t: "عضوية برو", d: "حدود يومية أعلى، تفاعل مع أي قناة بدون تحقق، وإزالة الإعلانات." },
  { icon: "📢", t: "أعلن لعلامتك", d: "شغّل إعلاناتك عبر المنصة بالكريدت. معتمدة وتدور بعدالة مع إحصائيات." },
  { icon: "🔐", t: "آمن وثلاثي اللغات", d: "بياناتك محمية ومتحقق منها على خوادمنا. دعم كامل بالعربية والإنجليزية." },
];

const walletRewards = [
  { emoji: "💰", t: "محفظة الكريدت", d: "اربحها يومياً وبالإحالات، واشترِ المزيد أو صرفها على النمو." },
  { emoji: "💎", t: "عملة الكريدت الذهبي", d: "العملة المميزة للتفاعلات والمتابعين وبرو والإعلانات." },
  { emoji: "📅", t: "المطالبة اليومية", d: "اجمع 10 كريدت مجاناً كل يوم — بضغطة واحدة من لوحة التحكم." },
  { emoji: "🎡", t: "العجلة اليومية", d: "دوّر العجلة مرة يومياً لفرصة ربح كريدت أو كريدت ذهبي. حظك!" },
  { emoji: "👀", t: "شاهد واربح", d: "شاهد إعلانات قصيرة في لوحة التحكم واربح حتى 10 كريدت يومياً." },
  { emoji: "🔄", t: "تحويل فوري", d: "حوّل الكريدت ذهاباً وإياباً في أي وقت بسعر عادل." },
];

const steps = [
  { n: "01", title: "أنشئ حسابك", desc: "سجّل مجاناً واحصل على كريدت فوراً — بدون بطاقة ائتمان." },
  { n: "02", title: "اعبّئ أو اربح", desc: "طالب يومياً، دوّر العجلة، شاهد الإعلانات، أو عبّئ عبر واتساب." },
  { n: "03", title: "انمُ", desc: "شغّل تفاعلات ومتابعين لبوتاتك وقنواتك في دقائق." },
];

const comingSoon = [
  "بوت تيليجرام مجاني", "تحميل وسائط اجتماعية", "موسيقى خلفية",
  "بث كريبتو وكريكيت مباشر", "أخبار مباشرة", "تحميل أفلام",
  "استضافة ويب", "محادثة مباشرة", "أدوات ذكاء اصطناعي", "تعليم أونلاين",
];
export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* هيرو - نسخة البوت الصغير */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-40 left-1/4 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
          <div className="pointer-events-none absolute top-20 right-0 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
          <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
            <span className="badge mb-6">
              <span className="status-dot" />
              بوت برو — أتمتة واتساب مبسّطة
            </span>
            <h1 className="text-balance text-4xl font-bold tracking-tight cyber-title sm:text-6xl">
              سريع، آمن،{" "}
              <span className="bg-gradient-to-r from-accent to-fuchsia-400 bg-clip-text text-transparent">
                وأتمتة مبسّطة
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              أفضل المميزات بأقل إعداد. اربط بوتك وانشر خلال 30 ثانية —
              رد تلقائي، مضاد حذف، مشاهدة حالات، وتفاعل ذكي. مجاني للأبد.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="btn-primary">
                ابدأ النشر الآن
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
              </Link>
              <a href="#capabilities" className="btn-primary !bg-elevated hover:!bg-border">
                مميزات البوت
              </a>
              <a href="/dashboard" className="btn-primary !border !border-accent/40 !bg-transparent !text-accent hover:!bg-accent/10">
                ⚙️ الإعدادات
              </a>
            </div>
            <div className="mt-14 grid grid-cols-3 gap-4 sm:max-w-md sm:mx-auto">
              {[["400+", "كريدت هدية"], ["50:1", "سعر التحويل"], ["24/7", "دعم نشط"]].map(([v, l]) => (
                <div key={l}>
                  <div className="text-2xl font-bold text-accent">{v}</div>
                  <div className="text-xs text-muted">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* قدرات البوت (النسخة المصغرة) */}
        <section id="capabilities" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="mb-3 text-center text-3xl font-bold">البوت المصغّر</h2>
          <p className="mb-12 text-center text-muted">أفضل المميزات، أقل إعداد — كل شيء بأوتوماتيك.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {miniFeatures.map((f) => (
              <div key={f.title} className="card flex items-start gap-4 p-6 transition-colors hover:border-accent/50">
                <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon}/></svg>
                </span>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* البوتات النشطة - رسم بياني حي */}
        <ActiveBotsChArt />

        {/* كل شيء في مكان واحد */}
        <section className="border-y border-border/60 bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="mb-3 text-center text-3xl font-bold">كل شيء في مكان واحد</h2>
            <p className="mb-12 text-center text-muted">أكثر من مجرد بوت — مجموعة أدوات كاملة تتوسّع دائماً.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {toolbox.map((f) => (
                <div key={f.t} className="card p-6">
                  <span className="text-3xl">{f.icon}</span>
                  <h3 className="mt-4 font-semibold">{f.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* المحفظة والمكافآت */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="mb-3 text-center text-3xl font-bold">محفظتك ومكافآتك</h2>
          <p className="mb-12 text-center text-muted">اقتصاد كريدت عادل — اربح يومياً، حوّل في أي وقت، وأنفق على النمو.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {walletRewards.map((f) => (
              <div key={f.t} className="card p-6 transition-colors hover:border-accent/50">
                <span className="text-3xl">{f.emoji}</span>
                <h3 className="mt-4 font-semibold">{f.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* كيف يعمل */}
        <section className="border-y border-border/60 bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="mb-12 text-center text-3xl font-bold">جاهز خلال 3 خطوات</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.n} className="card p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-bold text-accent-fg">{s.n}</span>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* قريباً */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="mb-3 text-center text-3xl font-bold">قريباً</h2>
          <p className="mb-12 text-center text-muted">نضيف خدمات جديدة باستمرار — ترقبوا المزيد.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {comingSoon.map((item) => (
              <span key={item} className="badge !px-5 !py-2.5 !text-sm !text-muted hover:!border-accent/50 hover:!text-white">
                {item}
              </span>
            ))}
          </div>
        </section>

        {/* التعليقات */}
        <section className="border-y border-border/60 bg-surface/50">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <h2 className="mb-8 text-center text-3xl font-bold">التعليقات</h2>
            <div className="card glass p-8 text-center">
              <p className="text-lg">سجّل الدخول للانضمام إلى المحادثة</p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href="/signup" className="btn-primary !py-2.5 !px-6 text-sm">سجّل الآن</Link>
                <Link href="/login" className="btn-primary !py-2.5 !px-6 text-sm !bg-elevated hover:!bg-border">تسجيل الدخول</Link>
              </div>
            </div>
          </div>
        </section>

        {/* دعوة للتسجيل */}
        <section className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="text-3xl font-bold">مستعد للنمو؟</h2>
          <p className="mt-3 text-muted">انضم إلى المستخدمين الذين يستخدمون بوت برو لأتمتة قنواتهم وواتسابهم.</p>
          <Link href="/signup" className="btn-primary mt-8">احجز مقعدك الآن</Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}