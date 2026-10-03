import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { getServerLocale } from "@/lib/server-locale";
import { tr } from "@/lib/i18n";

export const metadata = {
  title: "اتصل بنا — hatem X | التواصل المباشر مع الإدارة",
  description: "تواصل مباشرة مع صاحب المنصة محمد حاتم عبر واتساب على الرقم 772847565 أو عبر الاتصال الهاتفي والبريد الإلكتروني 24/7.",
};

export default async function ContactPage() {
  const locale = await getServerLocale();
  const t = (s: string) => tr(locale, s);
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <SiteHeader />
      <main className="flex-1 relative overflow-hidden">
        {/* توهجات خلفية جمالية */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[450px] w-[750px] rounded-full bg-accent/10 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-10 -right-40 h-[350px] w-[350px] rounded-full bg-emerald-500/10 blur-[100px]" />

        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 relative z-10">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-surface/80 px-4 py-1.5 text-xs sm:text-sm font-semibold text-accent shadow-lg shadow-accent/10 backdrop-blur-md mb-4">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
              </span>
              فريق الدعم الفني والإدارة متاح الآن 24/7
            </span>

            <h1 className="cyber-title text-3xl font-extrabold sm:text-5xl">
              {locale === "ar" ? (
                <>تواصل مع <span className="bg-gradient-to-r from-accent via-neon to-emerald-400 bg-clip-text text-transparent">صاحب المنصة</span></>
              ) : (
                <>Contact the <span className="bg-gradient-to-r from-accent via-neon to-emerald-400 bg-clip-text text-transparent">Platform Owner</span></>
              )}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
              {t("نحن هنا لمساعدتك في تفعيل اشتراكك، ربط بوتك، وتخصيص كافة ميزاتك الذكية. تواصل مباشرة مع الإدارة:")}
            </p>
          </div>

          {/* بطاقة الآدمن محمد حاتم المميزة */}
          <div className="mt-10 rounded-2xl border border-accent/40 bg-gradient-to-br from-surface via-elevated to-surface p-6 sm:p-8 shadow-2xl shadow-accent/10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center sm:text-right flex-col sm:flex-row">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-accent to-emerald-500 text-3xl text-black shadow-lg shadow-accent/30 font-black">
                👑
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">المدير العام وصاحب المنصة</span>
                <h2 className="text-2xl font-black text-fg mt-0.5">محمد حاتم</h2>
                <p className="text-sm text-muted font-mono mt-1" dir="ltr">+967 772847565</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-center">
              <a
                href="https://wa.me/967772847565?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%A3%D8%AE%D9%8A%20%D9%85%D8%AD%D9%85%D8%AF%20%D8%AD%D8%A7%D8%AA%D9%85%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%AA%D9%88%D8%A7%D8%B5%D9%84%20%D9%85%D8%B9%D9%83%20%D8%A8%D8%AE%D8%B5%D9%88%D8%B5%20%D8%A7%D9%84%D9%85%D9%86%D8%B5%D8%A9"
                target="_blank"
                rel="noreferrer"
                className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 !px-6 !py-3 text-base shadow-lg shadow-emerald-900/30 font-bold"
              >
                💬 محادثة واتساب فورية
              </a>
              <a
                href="tel:+967772847565"
                className="rounded-xl border border-border/80 bg-surface/90 px-6 py-3 text-base font-semibold text-fg transition hover:border-accent/60 hover:text-white flex items-center gap-2"
              >
                📞 اتصال صوتي مباشر
              </a>
            </div>
          </div>

          {/* شبكة خيارات التواصل الأربعة */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {/* 1. واتساب */}
            <div className="card p-6 border-emerald-500/30 bg-surface/70 hover:border-emerald-500/60 transition-all hover:-translate-y-1 shadow-lg">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-2xl text-emerald-400 mb-4">
                💬
              </span>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">الأسرع رداً (فوري)</span>
              <h3 className="text-xl font-bold text-fg mt-1">واتساب المباشر</h3>
              <p className="mt-1 text-sm text-muted">
                راسل محمد حاتم مباشرة لتفعيل البوت، تجديد الاشتراك، أو المساعدة الفنية.
              </p>
              <a
                href="https://wa.me/967772847565?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%AA%D9%88%D8%A7%D8%B5%D9%84%20%D8%AD%D9%88%D9%84%20%D8%A8%D9%88%D8%AA%20%D8%A8%D8%B1%D9%88"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-emerald-400 font-mono font-bold hover:underline"
                dir="ltr"
              >
                +967 772847565 ↗
              </a>
            </div>

            {/* 2. اتصال هاتفي */}
            <div className="card p-6 border-accent/30 bg-surface/70 hover:border-accent/60 transition-all hover:-translate-y-1 shadow-lg">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-2xl text-accent mb-4">
                📞
              </span>
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">مكالمات هاتفية</span>
              <h3 className="text-xl font-bold text-fg mt-1">الاتصال الصوتي</h3>
              <p className="mt-1 text-sm text-muted">
                تواصل صوتي ومكالمات مباشرة مع صاحب المنصة في أي وقت.
              </p>
              <a
                href="tel:+967772847565"
                className="mt-4 inline-flex items-center gap-2 text-accent font-mono font-bold hover:underline"
                dir="ltr"
              >
                +967 772847565 ↗
              </a>
            </div>

            {/* 3. البريد الإلكتروني */}
            <div className="card p-6 border-border/80 bg-surface/70 hover:border-accent/50 transition-all hover:-translate-y-1 shadow-lg">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fuchsia-500/15 text-2xl text-fuchsia-400 mb-4">
                📧
              </span>
              <span className="text-xs font-semibold text-fuchsia-400 uppercase tracking-wider">المراسلات الرسمية</span>
              <h3 className="text-xl font-bold text-fg mt-1">البريد الإلكتروني</h3>
              <p className="mt-1 text-sm text-muted">
                للاقتراحات والشراكات والاستفسارات الرسمية.
              </p>
              <a
                href="mailto:hatem.botpro@gmail.com"
                dir="ltr"
                className="mt-4 block font-mono text-sm font-medium text-fuchsia-400 hover:underline truncate"
              >
                hatem.botpro@gmail.com ↗
              </a>
            </div>

            {/* 4. ساعات العمل والدعم */}
            <div className="card p-6 border-border/80 bg-surface/70 hover:border-accent/50 transition-all hover:-translate-y-1 shadow-lg">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-500/15 text-2xl text-cyan-400 mb-4">
                🕒
              </span>
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">ساعات العمل</span>
              <h3 className="text-xl font-bold text-fg mt-1">دعم سحابي متواصل</h3>
              <p className="mt-1 text-sm text-muted">
                المنصة والبوتات تعمل 24/7 سحابياً، والدعم الفني متواجد دائماً لخدمتك.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-matrix/40 bg-matrix/10 px-3 py-1 text-xs font-bold text-matrix font-mono">
                <span className="h-2 w-2 rounded-full bg-matrix animate-pulse"></span>
                متصل 24/7 / 365 يوم
              </span>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}