"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "الرئيسية", icon: "M12 8V4H8 M4.92 4h14.16a1 1 0 0 1 .99 1.1l-.87 12.14a2 2 0 0 1-2 1.86H6.83a2 2 0 0 1-2-1.86L3.93 5.1A1 1 0 0 1 4.92 4z" },
  { href: "/dashboard/media-vault", label: "الخزانة", icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" },
  { href: "/dashboard/status-hub", label: "الحالات", icon: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" },
  { href: "/dashboard/messages", label: "الرسائل", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  { href: "/dashboard/gemini", label: "الذكاء", icon: "M12 2a9 9 0 1 0 9 9 M12 8l2.5 2.5L12 13l-2.5-2.5z M12 13v4" },
];

export default function BottomNav() {
  const pathname = usePathname();

  const active = tabs.reduce(
    (best, t) => (pathname.startsWith(t.href.split("/").slice(0, 3).join("/")) ? t.href : best),
    "/dashboard"
  );

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-bg/95 backdrop-blur-xl md:hidden shadow-[0_-4px_25px_rgba(0,0,0,0.5)]">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[max(env(safe-area-inset-bottom),8px)]">
        {tabs.map((t, i) => {
          const isActive = active === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              onClick={triggerHaptic}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 active:scale-95 transition-transform"
              style={{ animation: isActive ? "pop 0.3s ease" : undefined }}
            >
              {/* مؤشر التوهج خلف الأيقونة */}
              {isActive && (
                <span className="absolute top-0.5 h-1 w-8 rounded-full bg-accent shadow-[0_0_12px_#00d4ff]" style={{ animation: "fade-up 0.25s ease" }} />
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

