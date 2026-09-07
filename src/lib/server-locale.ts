import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n";

/**
 * قراءة اللغة من الكوكي (الخادم فقط) — تُستخدم في مكونات الخادم
 * للمزامنة بين القالب/الخدمة وخيار اللغة الحالي.
 */
export async function getServerLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    return store.get("lang")?.value === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}