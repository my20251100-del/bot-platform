"use client";

import { useState } from "react";
import Link from "next/link";
import LogoutButton from "@/components/logout-button";

interface SiteHeaderClientProps {
  user: {
    id: string;
    email?: string;
  } | null;
}

export default function SiteHeaderClient({ user }: SiteHeaderClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [botDropdownOpen, setBotDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/90 backdrop-blur-2xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        
        {/* الشعار */}
        <Link href="/" className="flex flex-shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-fg shadow-lg shadow-accent/30 cyber-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M22.27 21.73 3.53 3a10.62 10.62 0 0 1-1.3 2.32L9 16l1-2-1.7 3.5a10.5 10.5 0 0 0 2.6 3.9h2.2a10.5 10.5 0 0 0 4.9-2.9l.3.3Z" />
              <path d="M2 8h3l2 5" /><path d="M21 8h-3l-1.5-3.5" /><path d="M3 3l18 18" />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight cyber-title font-mono">
            Hatem <span className="text-accent">X</span>
          </span>
        </Link>

        {/* روابط الديسكتوب المركزية */}
        <div className="hidden md:flex items-center gap-1 rounded-2xl border border-border/60 bg-elevated/60 p-1">
          <Link href="/" className="rounded-xl px-3.5 py-1.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-fg">
            الرئيسية
          </Link>

          {/* قائمة البوت المنسدلة مطابقة لـ Red Queen */}
          <div
            className="relative"
            onMouseEnter={() => setBotDropdownOpen(true)}
            onMouseLeave={() => setBotDropdownOpen(false)}
          >
            <div className="flex items-center">
              <Link
                href="/bot"
                className="rounded-s-xl ps-3 pe-1.5 py-1.5 text-sm font-bold text-accent transition hover:bg-surface"
              >
                🤖 Bot
              </Link>
              <button
                type="button"
                onClick={() => setBotDropdownOpen(!botDropdownOpen)}
                className="rounded-e-xl pe-2.5 ps-0.5 py-1.5 text-accent transition hover:bg-surface"
                aria-label="قائمة البوت"
              >
                <svg
                  fill="none"
                  height="11"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className={`transition-transform duration-200 ${botDropdownOpen ? "rotate-180" : "rotate-0"}`}
                  viewBox="0 0 24 24"
                  width="11"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            {botDropdownOpen && (
              <div className="absolute top-full start-0 z-50 mt-1.5 w-48 rounded-2xl border border-border/80 bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                <Link
                  href="/bot"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white hover:bg-elevated hover:text-accent"
                >
                  <span>🤖</span>
                  <span>The Mini Bot (الرئيسية)</span>
                </Link>
                <Link
                  href="/bot/create"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-accent hover:bg-accent/15"
                >
                  <span>🚀</span>
                  <span>Deploy Now (ربط الآن)</span>
                </Link>
                <Link
                  href="/bot/setting"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white hover:bg-elevated hover:text-accent"
                >
                  <span>⚙️</span>
                  <span>Settings (الإعدادات)</span>
                </Link>
                <Link
                  href="/bot/autoreply"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white hover:bg-elevated hover:text-accent"
                >
                  <span>💬</span>
                  <span>Auto Reply (الرد الآلي)</span>
                </Link>
                <Link
                  href="/bot/contact"
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white hover:bg-elevated hover:text-accent"
                >
                  <span>📇</span>
                  <span>Auto Save (حفظ الأرقام)</span>
                </Link>
              </div>
            )}
          </div>

          <Link href="/connect" className="rounded-xl px-3.5 py-1.5 text-sm font-semibold text-accent transition hover:bg-accent/15">
            ⚡ ربط سريع
          </Link>
          <Link href="/#features" className="rounded-xl px-3.5 py-1.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-fg">
            المميزات
          </Link>
          <Link href="/faq" className="rounded-xl px-3.5 py-1.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-fg">
            الأسئلة الشائعة
          </Link>
          <Link href="/contact" className="rounded-xl px-3.5 py-1.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-fg">
            اتصل بنا
          </Link>
        </div>

        {/* أزرار العمليات (ظاهرة وواضحة على الجوال والكمبيوتر) */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-1.5 text-xs sm:text-sm font-bold text-accent-fg shadow-md shadow-accent/30 transition hover:brightness-110"
              >
                <span>لوحة التحكم</span>
                <span className="hidden sm:inline">🚀</span>
              </Link>
              <div className="hidden sm:block">
                <LogoutButton />
              </div>
            </>
          ) : (
            <>
              {/* زر تسجيل الدخول واضح وموجود على جميع الشاشات */}
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-surface/90 px-3 py-1.5 text-xs sm:text-sm font-semibold text-fg transition hover:border-accent hover:text-accent"
              >
                <span>🔑</span>
                <span>تسجيل الدخول</span>
              </Link>

              {/* زر ابدأ مجاناً */}
              <Link
                href="/signup"
                className="inline-flex items-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-xs sm:text-sm font-bold text-accent-fg shadow-sm shadow-accent/25 transition hover:brightness-110"
              >
                <span>ابدأ مجاناً</span>
                <span className="hidden sm:inline">✨</span>
              </Link>
            </>
          )}

          {/* زر قائمة الجوال (همبرغر) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-elevated/70 text-fg md:hidden transition hover:bg-surface"
            aria-label="القائمة"
          >
            {mobileMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* القائمة المنسدلة للجوال */}
      {mobileMenuOpen && (
        <div className="border-t border-border/60 bg-bg/95 backdrop-blur-2xl px-4 py-4 md:hidden shadow-2xl animate-in fade-in slide-in-from-top-3">
          <div className="flex flex-col gap-1.5">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-fg hover:bg-surface"
            >
              <span>🏠</span>
              <span>الرئيسية</span>
            </Link>

            <Link
              href="/bot"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-accent bg-accent/10 hover:bg-accent/20"
            >
              <span>🤖</span>
              <span>The Mini Bot (منصة البوت)</span>
            </Link>

            <Link
              href="/bot/create"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-fg hover:bg-surface"
            >
              <span>🚀</span>
              <span>Deploy Now (ربط رقم جديد)</span>
            </Link>

            <Link
              href="/bot/setting"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-fg hover:bg-surface"
            >
              <span>⚙️</span>
              <span>Bot Settings (الإعدادات)</span>
            </Link>

            <Link
              href="/bot/autoreply"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-fg hover:bg-surface"
            >
              <span>💬</span>
              <span>Auto Reply (الرد التلقائي)</span>
            </Link>

            <Link
              href="/bot/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-fg hover:bg-surface"
            >
              <span>📇</span>
              <span>Auto Save (حفظ الأرقام)</span>
            </Link>

            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted hover:bg-surface hover:text-fg"
            >
              <span>✨</span>
              <span>المميزات والخصائص</span>
            </Link>

            <Link
              href="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted hover:bg-surface hover:text-fg"
            >
              <span>❓</span>
              <span>الأسئلة الشائعة</span>
            </Link>

            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted hover:bg-surface hover:text-fg"
            >
              <span>📞</span>
              <span>اتصل بنا والدعم</span>
            </Link>

            <div className="my-2 border-t border-border/50" />

            {user ? (
              <div className="flex items-center justify-between gap-2 pt-1">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center rounded-xl bg-accent py-2.5 text-sm font-bold text-accent-fg shadow-md shadow-accent/25"
                >
                  دخول لوحة التحكم 🚀
                </Link>
                <LogoutButton />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-accent/60 bg-surface py-2.5 text-sm font-bold text-accent shadow-sm"
                >
                  <span>🔑</span>
                  <span>تسجيل الدخول</span>
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-sm font-bold text-accent-fg shadow-md shadow-accent/25"
                >
                  <span>ابدأ مجاناً ✨</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
