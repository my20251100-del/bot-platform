"use client";

import { ToastProvider } from "@/components/ui/toast";
import { I18nProvider } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n";

export default function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <ToastProvider>{children}</ToastProvider>
    </I18nProvider>
  );
}
