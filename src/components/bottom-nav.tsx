"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "البوتات", icon: "M12 8V4H8 M4.92 4h14.16a1 1 0 0 1 .99 1.1l-.87 12.14a2 2 0 0 1-2 1.86H6.83a2 2 0 0 1-2-1.86L3.93 5.1A1 1 0 0 1 4.92 4z" },
  { href: "/dashboard/queen", label: "QUEEN", icon: "M12 3a3 3 0 0 0-3 3v1H7a2 2 0 0 0-2 2v1h14V9a2 2 0 0 0-2-2h-2V6a3 3 0 0 0-3-3z M5 12h14l-1 9H6z" },
  { href: "/dashboard/wallet", label: "المحفظة", icon: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" },
  { href: "/dashboard/gemini", label: "الذكاء", icon: "M12 2a9 9 0 1 0 9 9 M12 8l2.5 2.5L12 13l-2.5-2.5z M12 13v4" },
  { href: "/dashboard/antilinks", label: "الحماية", icon: "M10 14a5 5 0 0 0 7.5.05l3-3a5 5 0 0 0-7-7l-1.5 1.5 M14 10a5 5 0 0 0-7.5-.05l-3 3a5 5 0 0 0 7 7l1.5-1.5" },
];

export default function BottomNav() {
  const pathname = usePathname();

  // تحديد التبويب النشط (أقرب مطابقة للمسار)
  const active = tabs.reduce(
    (best, t) => (pathname.startsWith(t.href.split("/").slice(0, 3).join("/")) ? t.href : best),
    "/dashboard"
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-bg/90 backdrop-blur-lg md:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t, i) => {
          const isActive = active === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5"
              style={{ animation: isActive ? "pop 0.3s ease" : undefined }}
            >
              {/* مؤشر التوهج خلف الأيقونة */}
              {isActive && (
                <span className="absolute top-1 h-1 w-10 rounded-full bg-accent shadow-[0_0_10px_#00d4ff]" style={{ animation: "fade-up 0.25s ease" }} />
              )}
              <span
                className={`grid h-8 w-8 place-items-center rounded-xl transition-all duration-200 ${
                  isActive
                    ? "scale-110 bg-accent/15 text-accent shadow-[0_0_14px_rgba(0,212,255,0.5)]"
                    : "text-muted"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
              </span>
              <span
                className={`text-[10px] transition-opacity duration-200 ${isActive ? "text-accent font-semibold" : "text-muted"}`}
                style={{ animation: isActive ? "fade-in 0.3s ease" : undefined }}
              >
                {t.label}
              </span>
              {isActive && (
                <span key={`${i}-${pathname}`} className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="h-6 w-6 rounded-full bg-accent/10" style={{ animation: "ring-pulse 0.6s ease-out forwards" }} />
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
