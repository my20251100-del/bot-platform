import Link from "next/link";
import LanguageToggle from "@/components/language-toggle";
import { getServerLocale } from "@/lib/server-locale";
import { tr } from "@/lib/i18n";

export default async function SiteFooter() {
  const locale = await getServerLocale();
  const t = (s: string) => tr(locale, s);

  return (
    <footer className="border-t border-border/60 bg-surface">
      <div className="mx-auto max-w-6xl px-6 pt-14 pb-8">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link className="inline-flex items-center gap-2.5 mb-5" href="/">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-fg shadow-lg shadow-accent/30">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.27 21.73 3.53 3a10.62 10.62 0 0 1-1.3 2.32L9 16l1-2-1.7 3.5a10.5 10.5 0 0 0 2.6 3.9h2.2a10.5 10.5 0 0 0 4.9-2.9l.3.3Z" /><path d="M2 8h3l2 5" /><path d="M21 8h-3l-1.5-3.5" /><path d="M3 3l18 18" /></svg>
              </span>
              <span className="text-xl font-bold tracking-tight cyber-title font-mono">Hatem <span className="text-accent">X</span></span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted mb-6">
              {t("منصة عضوية مميزة لنمو قنوات واتساب وأتمتة البوتات — تفاعلات، متابعون، محفظة، وإحالات، كل ذلك في مكان واحد.")}
            </p>
            <div className="flex flex-wrap gap-2 mb-7">
              {[
                { icon: "💰", t: t("محفظة كريدت") },
                { icon: "💎", t: t("تحويل كريدت ذهبي") },
                { icon: "👥", t: t("نظام إحالات") },
                { icon: "🌐", t: t("ثلاث لغات") },
                { icon: "🛡️", t: t("آمن") },
              ].map((b) => (
                <span key={b.t} className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-elevated px-3 py-1.5 text-xs font-medium text-muted">
                  {b.icon} {b.t}
                </span>
              ))}
            </div>
            <div className="h-px w-16 bg-gradient-to-r from-accent to-transparent rounded-full" />
          </div>

          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-accent">{t("التنقل")}</p>
            <ul className="space-y-3">
              {[
                { href: "/", t: t("الرئيسية"), icon: "🌐" },
                { href: "/login", t: t("تسجيل الدخول"), icon: "🔑" },
                { href: "/signup", t: t("إنشاء حساب"), icon: "👤" },
              ].map((l) => (
                <li key={l.t}>
                  <Link className="group flex items-center gap-2.5 text-sm text-muted transition-colors hover:text-fg" href={l.href}>
                    <span className="text-border group-hover:text-accent transition-colors">{l.icon}</span>
                    {l.t}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-accent">{t("الخدمات")}</p>
            <ul className="space-y-3">
              {[t("تفاعلات واتساب"), t("متابعو واتساب"), t("البوت المصغّر"), t("وصول API"), t("تخزين سحابي")].map((label) => (
                <li key={label}>
                  <Link className="group flex items-center gap-2.5 text-sm text-muted transition-colors hover:text-fg" href="/connect">
                    <span className="text-border group-hover:text-accent transition-colors">⚡</span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-accent">{t("الشركة")}</p>
            <ul className="space-y-3">
              {[
                { href: "/#features", t: t("حول") },
                { href: "/contact", t: t("اتصل بنا") },
                { href: "/faq", t: t("الأسئلة الشائعة") },
              ].map((l) => (
                <li key={l.t}>
                  <Link className="group flex items-center gap-2.5 text-sm text-muted transition-colors hover:text-fg" href={l.href}>
                    <span className="text-border group-hover:text-accent transition-colors">📄</span>
                    {l.t}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mb-5 mt-8 text-xs font-semibold uppercase tracking-widest text-accent">{t("قانوني")}</p>
            <ul className="space-y-3">
              <li>
                <Link className="group flex items-center gap-2.5 text-sm text-muted transition-colors hover:text-fg" href="/privacy">
                  <span className="text-border group-hover:text-accent transition-colors">🔒</span>
                  {t("سياسة الخصوصية")}
                </Link>
              </li>
              <li>
                <Link className="group flex items-center gap-2.5 text-sm text-muted transition-colors hover:text-fg" href="/terms">
                  <span className="text-border group-hover:text-accent transition-colors">📜</span>
                  {t("الشروط والأحكام")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 py-6 text-center text-xs text-muted">
        <div className="mb-3 flex justify-center">
          <LanguageToggle />
        </div>
        <p className="mb-2">© {new Date().getFullYear()} Hatem X — {t("منصة Hatem X — جميع الحقوق محفوظة.")}</p>
        <p className="font-semibold text-accent/80">{t("تطوير: محمد حاتم (Hatem X) | للتواصل: 772847565 (واتساب)")}</p>
      </div>
    </footer>
  );
}