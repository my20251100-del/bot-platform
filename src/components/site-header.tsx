import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-fg shadow-lg shadow-accent/30 cyber-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M22.27 21.73 3.53 3a10.62 10.62 0 0 1-1.3 2.32L9 16l1-2-1.7 3.5a10.5 10.5 0 0 0 2.6 3.9h2.2a10.5 10.5 0 0 0 4.9-2.9l.3.3Z" />
              <path d="M2 8h3l2 5" /><path d="M21 8h-3l-1.5-3.5" /><path d="M3 3l18 18" />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight cyber-title">
            M aknoon <span className="text-accent">SECURE</span>
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard" className="btn-primary !py-2 !px-4 text-sm">
              لوحة التحكم
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-white">
                تسجيل الدخول
              </Link>
              <Link href="/signup" className="btn-primary !py-2 !px-4 text-sm">
                ابدأ مجاناً
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
