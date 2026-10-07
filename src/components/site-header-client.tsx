"use client";

import { useState } from "react";
import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import LanguageToggle from "@/components/language-toggle";
import { useI18n } from "@/components/i18n-provider";

interface SiteHeaderClientProps {
  user: {
    id: string;
    email?: string;
  } | null;
}

export default function SiteHeaderClient({ user }: SiteHeaderClientProps) {
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [botDropdownOpen, setBotDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl transition-all duration-200">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        
        {/* الشعار */}
        <Link href="/" className="group flex flex-shrink-0 items-center gap-2.5">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 shadow-md shadow-emerald-500/20 transition-transform duration-200 group-hover:scale-105">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M22.27 21.73 3.53 3a10.62 10.62 0 0 1-1.3 2.32L9 16l1-2-1.7 3.5a10.5 10.5 0 0 0 2.6 3.9h2.2a10.5 10.5 0 0 0 4.9-2.9l.3.3Z" />
              <path d="M2 8h3l2 5" /><path d="M21 8h-3l-1.5-3.5" /><path d="M3 3l18 18" />
            </svg>
          </div>
          <span className="text-xl font-extrabold tracking-tight font-display text-white">
            Hatem <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">X</span>
          </span>
        </Link>

        {/* روابط الديسكتوب المركزية */}
        <div className="hidden md:flex items-center gap-1 rounded-2xl border border-white/10 bg-slate-900/60 p-1 backdrop-blur-xl">
          <Link href="/" className="rounded-xl px-3.5 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
            {t("الرئيسية")}
          </Link>

          {/* قائمة البوت المنسدلة */}
          <div
            className="relative"
            onMouseEnter={() => setBotDropdownOpen(true)}
            onMouseLeave={() => setBotDropdownOpen(false)}
          >
            <div className="flex items-center">
              <Link
                href="/bot"
                className="rounded-s-xl ps-3.5 pe-1.5 py-1.5 text-sm font-bold text-emerald-400 transition hover:bg-white/10"
              >
                🤖 Bot
              </Link>
              <button
                type="button"
                onClick={() => setBotDropdownOpen(!botDropdownOpen)}
                className="rounded-e-xl pe-2.5 ps-0.5 py-1.5 text-emerald-400 transition hover:bg-white/10"
                aria-label={t("قائمة البوت")}
              >
                <svg
                  fill="none"
                  height="12"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className={`transition-transform duration-200 ${botDropdownOpen ? "rotate-180" : "rotate-0"}`}
                  viewBox="0 0 24 24"
                  width="12"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            {botDropdownOpen && (
              <div className="absolute top-full start-0 z-50 mt-1.5 w-56 rounded-2xl border border-white/10 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2">
                <Link
                  href="/bot"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-emerald-400 transition"
                >
                  <span>🤖</span>
                  <span>{t("لوحة البوت")}</span>
                </Link>
                <Link
                  href="/bot/create"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/15 transition"
                >
                  <span>🚀</span>
                  <span>{t("ربط بوت جديد")}</span>
                </Link>
                <Link
                  href="/bot/setting"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-emerald-400 transition"
                >
                  <span>⚙️</span>
                  <span>{t("لوحة التحكم والإعدادات")}</span>
                </Link>
                <Link
                  href="/bot/setting#section-autoreply"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-emerald-400 transition"
                >
                  <span>💬</span>
                  <span>{t("الرد التلقائي")}</span>
                </Link>
                <Link
                  href="/bot/setting#section-contact"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-emerald-400 transition"
                >
                  <span>📇</span>
                  <span>{t("حفظ جهات الاتصال")}</span>
                </Link>
              </div>
            )}
          </div>

          <Link href="/connect" className="rounded-xl px-3.5 py-1.5 text-sm font-semibold text-cyan-400 transition hover:bg-cyan-500/10">
            {t("⚡ ربط سريع")}
          </Link>
          <Link href="/#features" className="rounded-xl px-3.5 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
            {t("المميزات")}
          </Link>
          <Link href="/faq" className="rounded-xl px-3.5 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
            {t("الأسئلة الشائعة")}
          </Link>
          <Link href="/contact" className="rounded-xl px-3.5 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
            {t("اتصل بنا")}
          </Link>
        </div>

        {/* أزرار العمليات واللغة */}
        <div className="flex items-center gap-2.5">
          <LanguageToggle compact />

          {user ? (
            <>
              <Link
                href="/dashboard"
                className="btn-primary py-2 px-4 text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20"
              >
                <span>{t("لوحة التحكم")}</span>
                <span className="hidden sm:inline">🚀</span>
              </Link>
              <div className="hidden sm:block">
                <LogoutButton />
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                <span>🔑</span>
                <span className="hidden sm:inline">{t("تسجيل الدخول")}</span>
                <span className="sm:hidden">{t("دخول")}</span>
              </Link>

              <Link
                href="/signup"
                className="btn-primary py-2 px-4 text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/25"
              >
                <span>{t("ابدأ مجاناً")}</span>
                <span className="hidden sm:inline">✨</span>
              </Link>
            </>
          )}

          {/* زر قائمة الجوال */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-slate-900/60 text-slate-200 md:hidden transition hover:bg-white/10"
            aria-label={t("القائمة")}
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
        <div className="border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl px-4 py-4 md:hidden shadow-2xl animate-in fade-in slide-in-from-top-3">
          <div className="flex flex-col gap-1.5">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              <span>🏠</span>
              <span>{t("الرئيسية")}</span>
            </Link>

            <Link
              href="/bot"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
            >
              <span>🤖</span>
              <span>{t("The Mini Bot (منصة البوت)")}</span>
            </Link>

            <Link
              href="/bot/create"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              <span>🚀</span>
              <span>{t("Deploy Now (ربط رقم جديد)")}</span>
            </Link>

            <Link
              href="/bot/setting"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              <span>⚙️</span>
              <span>{t("Bot Settings (الإعدادات)")}</span>
            </Link>

            <Link
              href="/bot/autoreply"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              <span>💬</span>
              <span>{t("Auto Reply (الرد التلقائي)")}</span>
            </Link>

            <Link
              href="/bot/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              <span>📇</span>
              <span>{t("Auto Save (حفظ الأرقام)")}</span>
            </Link>

            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10"
            >
              <span>✨</span>
              <span>{t("المميزات والخصائص")}</span>
            </Link>

            <Link
              href="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10"
            >
              <span>❓</span>
              <span>{t("الأسئلة الشائعة")}</span>
            </Link>

            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10"
            >
              <span>📞</span>
              <span>{t("اتصل بنا والدعم")}</span>
            </Link>

            <div className="my-2 border-t border-white/10" />

            {user ? (
              <div className="flex items-center justify-between gap-2 pt-1">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center btn-primary py-2.5 text-sm font-bold"
                >
                  {t("دخول لوحة التحكم 🚀")}
                </Link>
                <LogoutButton />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-slate-900 py-2.5 text-sm font-bold text-slate-200 shadow-sm"
                >
                  <span>🔑</span>
                  <span>{t("دخول")}</span>
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 btn-primary py-2.5 text-sm font-bold shadow-md shadow-emerald-500/25"
                >
                  <span>{t("ابدأ مجاناً ✨")}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}