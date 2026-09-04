import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/logout-button";
import BottomNav from "@/components/bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <div className="flex min-h-screen">
      {/* الشريط الجانبي */}
      <aside className="hidden w-60 flex-shrink-0 border-r border-border/60 bg-surface/50 md:block">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-fg shadow-lg shadow-accent/30 cyber-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.27 21.73 3.53 3a10.62 10.62 0 0 1-1.3 2.32L9 16l1-2-1.7 3.5a10.5 10.5 0 0 0 2.6 3.9h2.2a10.5 10.5 0 0 0 4.9-2.9l.3.3Z"/><path d="M2 8h3l2 5"/><path d="M21 8h-3l-1.5-3.5"/><path d="M3 3l18 18"/></svg>
            </span>
            <span className="text-lg font-bold cyber-title">بوت برو</span>
          </Link>

          <nav className="flex flex-col gap-1">
            {[
              { href: "/dashboard", label: "بوتاتي", icon: "M12 8V4H8 M4.92 4h14.16a1 1 0 0 1 .99 1.1l-.87 12.14a2 2 0 0 1-2 1.86H6.83a2 2 0 0 1-2-1.86L3.93 5.1A1 1 0 0 1 4.92 4z" },
              { href: "/dashboard/messages", label: "💬 رسائل العملاء", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
              { href: "/dashboard/status-hub", label: "👁️ الحالات والخصوصية", icon: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" },
              { href: "/dashboard/wallet", label: "المحفظة والإحالات", icon: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" },
              { href: "/dashboard/followers", label: "زيادة المتابعين", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 1 8 0 4 4 0 0 1-8 0 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" },
              { href: "/dashboard/schedule", label: "مجدول النشر", icon: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" },
              { href: "/dashboard/queen", label: "إعدادات QUEEN", icon: "M12 3a3 3 0 0 0-3 3v1H7a2 2 0 0 0-2 2v1h14V9a2 2 0 0 0-2-2h-2V6a3 3 0 0 0-3-3z M5 12h14l-1 9H6z" },
              { href: "/dashboard/antilinks", label: "حظر الروابط والكلمات", icon: "M10 14a5 5 0 0 0 7.5.05l3-3a5 5 0 0 0-7-7l-1.5 1.5 M14 10a5 5 0 0 0-7.5-.05l-3 3a5 5 0 0 0 7 7l1.5-1.5" },
              { href: "/dashboard/gemini", label: "محرك الذكاء (Gemini)", icon: "M12 2a9 9 0 1 0 9 9 M12 8l2.5 2.5L12 13l-2.5-2.5z M12 13v4 M9 19l-1 3 M15 19l1 3" },
              { href: "/dashboard/logs", label: "📜 سجل العمليات (Logs)", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-white"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-elevated p-3 text-xs text-muted">
            <span dir="ltr" className="truncate">{user?.email}</span>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* الشريط العلوي للجوال */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-bg/90 px-4 backdrop-blur md:hidden">
        <span className="font-bold cyber-title">بوت برو</span>
        <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-muted">الرئيسية</Link>
        <span className="text-muted"><LogoutButton /></span>
      </div>

      {/* القائمة السفلية المتحركة (جوال) */}
      <BottomNav />

      <div className="min-w-0 flex-1 px-4 pb-28 pt-20 sm:px-8 md:pb-10 md:pt-10">{children}</div>
      </div>

      {/* تذييل سايبور بنك */}
      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center text-xs text-muted sm:flex-row sm:text-left">
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-accent">🤖</span>
            <span>بوت برو — منصة أتمتة بوتات واتساب</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="status-dot" /> متصل
            </span>
            <span dir="ltr" className="tech">AES-256 SSL</span>
          </div>
        </div>
      </footer>
    </>
  );
}