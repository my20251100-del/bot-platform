"use client";

import { createContext, useContext, useEffect, useState, useTransition, type ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DICT, dirFor, type Locale } from "@/lib/i18n";

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
  t: (source: string) => string;
  dir: "rtl" | "ltr";
};

const I18nContext = createContext<I18nValue>({
  locale: "ar",
  setLocale: () => {},
  toggle: () => {},
  t: (s) => s,
  dir: "rtl",
});

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const startTransition = useTransition()[1];

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dirFor(locale);
  }, [locale]);

  const setLocale = useCallback(
    (l: Locale) => {
      setLocaleState(l);
      document.cookie = `lang=${l};path=/;max-age=31536000;SameSite=Lax`;
      startTransition(() => router.refresh());
    },
    [router]
  );

  const toggle = useCallback(() => setLocale(locale === "ar" ? "en" : "ar"), [locale, setLocale]);

  const t = useCallback((source: string) => (locale === "en" ? DICT[source]?.en ?? source : source), [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, toggle, t, dir: dirFor(locale) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}