import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-bg/85 backdrop-blur-2xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex flex-shrink-0 items-center gap-2.5 me-auto md:me-0">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-fg shadow-lg shadow-accent/30 cyber-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M22.27 21.73 3.53 3a10.62 10.62 0 0 1-1.3 2.32L9 16l1-2-1.7 3.5a10.5 10.5 0 0 0 2.6 3.9h2.2a10.5 10.5 0 0 0 4.9-2.9l.3.3Z" />
              <path d="M2 8h3l2 5" /><path d="M21 8h-3l-1.5-3.5" /><path d="M3 3l18 18" />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight cyber-title">
            بوت برو <span className="text-accent">PRO</span>
          </span>
        </Link>

        <div className="hidden flex-1 items-center justify-center md:flex">
          <div className="flex items-center gap-0.5 rounded-2xl border border-border/60 bg-elevated/50 p-1">
            <Link href="/" className="rounded-xl px-4 py-1.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-fg">الرئيسية</Link>
            <Link href="/start" className="rounded-xl px-4 py-1.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-fg">البوت</Link>
            <Link href="/#about" className="rounded-xl px-4 py-1.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-fg">حول</Link>
            <Link href="/faq" className="rounded-xl px-4 py-1.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-fg">الأسئلة</Link>
            <Link href="/contact" className="rounded-xl px-4 py-1.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-fg">اتصل بنا</Link>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:ms-auto">
          {user ? (
            <>
              <Link href="/dashboard" className="hidden md:inline-flex items-center rounded-xl bg-accent px-4 py-1.5 text-sm font-semibold text-accent-fg shadow-sm shadow-accent/30 transition hover:brightness-110">
                لوحة التحكم
              </Link>
              <Link href="/dashboard" className="md:hidden grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-border/60 text-sm font-bold text-accent transition hover:border-accent/50">
                لوحة
              </Link>
            </>
          ) : (
            <Link href="/login" className="hidden md:inline-flex items-center rounded-xl bg-accent px-4 py-1.5 text-sm font-semibold text-accent-fg shadow-sm shadow-accent/30 transition hover:brightness-110">
              تسجيل الدخول
            </Link>
          )}

          {!user && (
            <Link href="/signup" className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-fg transition hover:border-accent/50">
              ابدأ مجاناً
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}