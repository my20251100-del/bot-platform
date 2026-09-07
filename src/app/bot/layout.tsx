import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import LanguageToggle from "@/components/language-toggle";
import { getServerLocale } from "@/lib/server-locale";
import { tr } from "@/lib/i18n";

export default async function BotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();
  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <SiteHeader />

      {/* شريط ملاحة فرعي لميزات البوت على طريقة Red Queen */}
      <div className="sticky top-16 z-40 border-b border-border/60 bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between overflow-x-auto no-scrollbar px-4 py-2 sm:px-6">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/bot"
              className="rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-muted transition hover:bg-elevated hover:text-fg"
            >
              {tr(locale, "🤖 البوت المصغر")}
            </Link>
            <Link
              href="/bot/create"
              className="rounded-xl bg-accent/15 px-3 py-1.5 text-xs sm:text-sm font-bold text-accent transition hover:bg-accent/25 hover:shadow-[0_0_12px_rgba(0,212,255,0.3)]"
            >
              {tr(locale, "🚀 انشر الآن")}
            </Link>
            <Link
              href="/bot/setting"
              className={`rounded-xl px-3 py-1.5 text-xs sm:text-sm font-medium text-muted transition hover:bg-elevated hover:text-fg active:bg-accent/15 active:text-accent`}
            >
              {tr(locale, "⚙️ الإعدادات")}
            </Link>
            <Link
              href="/bot/setting?tab=autoreply"
              className="rounded-xl px-3 py-1.5 text-xs sm:text-sm font-medium text-muted transition hover:bg-elevated hover:text-fg"
            >
              {tr(locale, "💬 الرد التلقائي")}
            </Link>
            <Link
              href="/bot/setting?tab=contact"
              className="rounded-xl px-3 py-1.5 text-xs sm:text-sm font-medium text-muted transition hover:bg-elevated hover:text-fg"
            >
              {tr(locale, "📇 الحفظ التلقائي")}
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted font-mono">
            <LanguageToggle compact />
            <span className="hidden sm:flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-matrix animate-pulse" />
              {tr(locale, "مواصفات Hatem X 2.0")}
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>

      <SiteFooter />
    </div>
  );
}
