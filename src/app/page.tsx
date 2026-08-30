import Link from "next/link";
import SiteHeader from "@/components/site-header";

const features = [
  {
    title: "مضاد الحذف",
    desc: "تظهر لك الرسائل حتى بعد حذف المرسل لها من الجميع.",
    icon: "M3 3v18h18 M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72 m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85",
  },
  {
    title: "مشاهدة الحالات تلقائياً",
    desc: "يشاهد كل الستوري والحالات المنشورة من جهاتك دون فتح الجوال.",
    icon: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  },
  {
    title: "الرد التلقائي",
    desc: "رد فوري على الرسائل الواردة برسالة ترحيب وقواعد تحددها أنت.",
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  },
  {
    title: "التفاعل التلقائي",
    desc: "يفاعل تلقائياً مع كل رسالة بالإيموجي الذي تختاره.",
    icon: "M11.48 3.499a.5.5 0 0 1 .501 0l4.79 3.227a.5.5 0 0 1 .245.46v4.286a.5.5 0 0 1-.246.46L12 15.09l-4.77-3.158a.5.5 0 0 1-.23-.44v-4.29a.5.5 0 0 1 .246-.46z M12 19v2",
  },
  {
    title: "خصوصية كاملة",
    desc: "إخفاء علامات القراءة وحالة الكتابة وآخر ظهور من محددين.",
    icon: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
  },
  {
    title: "حفظ الأرقام تلقائياً",
    desc: "كل رقم جديد يراسلك يُدوَّن في سجلاتك تلقائياً.",
    icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  },
];

const steps = [
  { n: "١", title: "أنشئ حساباً مجانياً", desc: "سجّل ببريدك الإلكتروني خلال ثوانٍ — بدون بطاقة ائتمان." },
  { n: "٢", title: "اربط رقم واتساب", desc: "اتصل عبر رمز QR أو كود اقتران من 8 أرقام، تماماً مثل واتساب ويب." },
  { n: "٣", title: "اضبط واسترخِ", desc: "فعّل الأتمتة التي تريد — يعمل البوت في السحابة على مدار الساعة." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* الواجهة الرئيسية */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-40 left-1/4 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
          <div className="pointer-events-none absolute top-20 right-0 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
          <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
            <span className="badge mb-6">
              <span className="status-dot" />
              المالك: mohammed hatem
            </span>
            <h1 className="text-balance text-4xl font-bold tracking-tight cyber-title sm:text-6xl">
              حماية أمنك{" "}
              <span className="bg-gradient-to-r from-accent to-fuchsia-400 bg-clip-text text-transparent">
                السيبراني
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              نظام M aknoon للأمن السيبراني: جدار حماية، مضاد حذف ونظرة-واحدة،
              رد ذكي بالذكاء الاصطناعي، وتفاعل تلقائي مع الحالات — لحماية محادثاتك ومجموعاتك.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="btn-primary">
                ابدأ مجاناً
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
              </Link>
              <a href="#how" className="btn-primary !bg-elevated hover:!bg-border">
                كيف يعمل؟
              </a>
            </div>
            <div className="mt-14 grid grid-cols-3 gap-4 sm:max-w-md sm:mx-auto">
              {[["24/7", "تشغيل مستمر"], ["30 ثانية", "للإعداد"], ["$0", "للأبد"]].map(([v, l]) => (
                <div key={l}>
                  <div className="text-2xl font-bold text-accent">{v}</div>
                  <div className="text-xs text-muted">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* المميزات */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="mb-3 text-center text-3xl font-bold">كل شيء بأوتوماتيك</h2>
          <p className="mb-12 text-center text-muted">مميزات قوية بدون أي إعداد معقد.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
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

        {/* كيف يعمل */}
        <section id="how" className="border-y border-border/60 bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="mb-12 text-center text-3xl font-bold">جاهز خلال 3 خطوات</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.n} className="card p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-bold">{s.n}</span>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* دعوة للتسجيل */}
        <section className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="text-3xl font-bold">جاهز للأتمتة؟</h2>
          <p className="mt-3 text-muted">أنشئ بوتك الآن — لن يستغرق أكثر من دقيقة.</p>
          <Link href="/signup" className="btn-primary mt-8">أنشئ حساباً مجانياً</Link>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted">
        © {new Date().getFullYear()} M aknoon — نظام الأمن السيبراني. غير تابع لواتساب أو ميتا.
      </footer>
    </>
  );
}
