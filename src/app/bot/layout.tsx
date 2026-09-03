import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

export default function BotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
              🤖 The Mini Bot
            </Link>
            <Link
              href="/bot/create"
              className="rounded-xl bg-accent/15 px-3 py-1.5 text-xs sm:text-sm font-bold text-accent transition hover:bg-accent/25 hover:shadow-[0_0_12px_rgba(0,212,255,0.3)]"
            >
              🚀 Deploy Now
            </Link>
            <Link
              href="/bot/setting"
              className="rounded-xl px-3 py-1.5 text-xs sm:text-sm font-medium text-muted transition hover:bg-elevated hover:text-fg"
            >
              ⚙️ Settings
            </Link>
            <Link
              href="/bot/autoreply"
              className="rounded-xl px-3 py-1.5 text-xs sm:text-sm font-medium text-muted transition hover:bg-elevated hover:text-fg"
            >
              💬 Auto Reply
            </Link>
            <Link
              href="/bot/contact"
              className="rounded-xl px-3 py-1.5 text-xs sm:text-sm font-medium text-muted transition hover:bg-elevated hover:text-fg"
            >
              📇 Auto Save
            </Link>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted font-mono">
            <span className="h-2 w-2 rounded-full bg-matrix animate-pulse" />
            <span>Red Queen Spec 2.0</span>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>

      <SiteFooter />
    </div>
  );
}
