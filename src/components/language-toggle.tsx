"use client";

import { useI18n } from "@/components/i18n-provider";

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, toggle } = useI18n();

  return (
    <button
      type="button"
      onClick={toggle}
      title={locale === "ar" ? "English" : "العربية"}
      aria-label="Switch language / تبديل اللغة"
      className={`inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-elevated/70 text-fg transition hover:border-accent/70 hover:text-accent ${
        compact ? "px-2 py-1.5 text-[11px] font-bold" : "px-3 py-1.5 text-xs font-bold"
      }`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m5 8 6 6" />
        <path d="m4 14 6-6 2-3" />
        <path d="M2 5h12" />
        <path d="M7 2h1" />
        <path d="m22 22-5-10-5 10" />
        <path d="M14 18h6" />
      </svg>
      <span dir="ltr">{locale === "ar" ? "AR" : "EN"}</span>
    </button>
  );
}