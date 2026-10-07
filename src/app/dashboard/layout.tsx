import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
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

  const isAdmin = isAdminUser(user);

  const navItems = [
    { href: "/dashboard", label: "الرئيسية (لوحة القيادة)", icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" },
    { href: "/dashboard/media-vault", label: "خزانة المحذوفات والوسائط 🗑️", icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" },
    { href: "/instagram", label: "📸 أتمتة إنستقرام (Instagram)", icon: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01 M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z" },
    ...(isAdmin
      ? [{ href: "/dashboard/analytics", label: "⚡ غرفة العمليات (Admin)", icon: "M3 3v18h18 M9 15l3-3 4 4 5-8" }]
      : []),
    { href: "/dashboard/messages", label: "💬 رسائل العملاء", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
    { href: "/dashboard/status-hub", label: "👁️ الحالات والخصوصية", icon: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" },
    { href: "/dashboard/queen", label: "👑 إعدادات QUEEN", icon: "M12 3a3 3 0 0 0-3 3v1H7a2 2 0 0 0-2 2v1h14V9a2 2 0 0 0-2-2h-2V6a3 3 0 0 0-3-3z M5 12h14l-1 9H6z" },
    { href: "/dashboard/groups", label: "👥 المجموعات والترقية لمشرف", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 1 8 0 4 4 0 0 1-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" },
    { href: "/dashboard/gemini", label: "🧠 محرك الذكاء (Gemini)", icon: "M12 2a9 9 0 1 0 9 9 M12 8l2.5 2.5L12 13l-2.5-2.5z M12 13v4 M9 19l-1 3 M15 19l1 3" },
    { href: "/dashboard/antilinks", label: "🛡️ حظر الروابط والكلمات", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
    { href: "/dashboard/wallet", label: "💳 المحفظة والإحالات", icon: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" },
    { href: "/dashboard/followers", label: "📈 زيادة المتابعين", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 1 8 0 4 4 0 0 1-8 0 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" },
    { href: "/dashboard/schedule", label: "⏰ مجدول النشر", icon: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" },
    { href: "/dashboard/logs", label: "📜 سجل العمليات (Logs)", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" },
  ];

  return (
    <>
      <div className="flex min-h-screen">
      {/* الشريط الجانبي */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-accent/30 bg-surface/80 backdrop-blur-2xl md:block shadow-[4px_0_24px_rgba(0,212,255,0.05)]">
        <div className="sticky top-0 flex h-screen flex-col p-5">
          <Link href="/" className="mb-8 flex items-center gap-3 px-2 group">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-fg shadow-[0_0_15px_rgba(0,212,255,0.4)] group-hover:scale-105 transition-all cyber-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.27 21.73 3.53 3a10.62 10.62 0 0 1-1.3 2.32L9 16l1-2-1.7 3.5a10.5 10.5 0 0 0 2.6 3.9h2.2a10.5 10.5 0 0 0 4.9-2.9l.3.3Z"/><path d="M2 8h3l2 5"/><path d="M21 8h-3l-1.5-3.5"/><path d="M3 3l18 18"/></svg>
            </span>
            <span className="text-xl font-bold cyber-title tracking-wider group-hover:text-accent transition-colors font-mono">Hatem <span className="text-accent">X</span></span>
          </Link>

          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-semibold text-muted transition-all hover:bg-elevated hover:text-white hover:shadow-[inset_4px_0_0_#00d4ff] hover:translate-x-1"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex items-center justify-between gap-3 rounded-xl border border-accent/20 bg-elevated/50 p-4 text-xs text-muted shadow-[0_0_15px_rgba(0,212,255,0.05)]">
            <span dir="ltr" className="truncate font-mono">{user?.email}</span>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* الشريط العلوي للجوال */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-bg/90 px-4 backdrop-blur md:hidden">
        <span className="font-bold cyber-title font-mono">Hatem X</span>
        <Link href="/dashboard" className="rounded-lg px-3 py-1.5 text-muted">الرئيسية</Link>
        <span className="text-muted"><LogoutButton /></span>
      </div>

      {/* القائمة السفلية المتحركة (جوال) */}
      <BottomNav />

      <div className="min-w-0 flex-1 px-4 pb-28 pt-20 sm:px-8 md:pb-10 md:pt-10">{children}</div>
      </div>

      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center text-xs text-muted sm:flex-row sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 font-semibold">
            <span className="flex items-center gap-2">
              <span className="text-accent font-mono">⚡</span>
              <span>Hatem X — منصة أتمتة وحماية واتساب</span>
            </span>
            <span className="hidden sm:inline text-border/40">|</span>
            <span className="text-accent/80 font-bold">تطوير: محمد حاتم (Hatem X) - 772847565</span>
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