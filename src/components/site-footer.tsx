import Link from "next/link";
import LanguageToggle from "@/components/language-toggle";
import { getServerLocale } from "@/lib/server-locale";
import { tr } from "@/lib/i18n";
import { createAdmin } from "@/lib/supabase/admin";

function dayStartOffset(offsetMs: number) {
  const d = new Date(Date.now() - offsetMs);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function loadStats() {
  const admin = createAdmin();
  const [totalCount, connectedCount, logsAll, logsToday] = await Promise.all([
    admin.from("bots").select("id", { count: "exact", head: true }),
    admin.from("bots").select("id", { count: "exact", head: true }).eq("status", "connected"),
    admin.from("bot_logs").select("id", { count: "exact", head: true }),
    admin.from("bot_logs").select("id", { count: "exact", head: true }).gte("created_at", dayStartOffset(0)),
  ]);
  return {
    totalBots: totalCount.count || 0,
    activeNow: connectedCount.count || 0,
    events: logsAll.count || 0,
    today: logsToday.count || 0,
  };
}

export default async function SiteFooter() {
  const locale = await getServerLocale();
  const t = (s: string) => tr(locale, s);
  const stats = await loadStats();

  return (
    <footer className="border-t border-white/10 bg-slate-950/80 backdrop-blur-2xl text-slate-300">
      {/* شريط الإحصائيات الحية المحدث */}
      <div className="border-b border-white/5 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/5 bg-slate-900/50 p-4 text-center backdrop-blur-md">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-xl text-emerald-400">🤖</span>
              <p className="font-mono text-2xl font-black text-white">{stats.totalBots.toLocaleString("en-US")}</p>
              <p className="text-xs text-slate-400 font-medium">{t("بوت على المنصة")}</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/5 bg-slate-900/50 p-4 text-center backdrop-blur-md">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/15 text-xl text-cyan-400">📶</span>
              <p className="font-mono text-2xl font-black text-white">{stats.activeNow.toLocaleString("en-US")}</p>
              <p className="text-xs text-slate-400 font-medium">{t("متصل الآن")}</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/5 bg-slate-900/50 p-4 text-center backdrop-blur-md">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-xl text-violet-400">💬</span>
              <p className="font-mono text-2xl font-black text-white">{stats.events.toLocaleString("en-US")}</p>
              <p className="text-xs text-slate-400 font-medium">{t("حدث معالج")}</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/5 bg-slate-900/50 p-4 text-center backdrop-blur-md">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-xl text-amber-400">⚡</span>
              <p className="font-mono text-2xl font-black text-white">{stats.today.toLocaleString("en-US")}</p>
              <p className="text-xs text-slate-400 font-medium">{t("حدث اليوم")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-10">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link className="group inline-flex items-center gap-2.5 mb-4" href="/">
              <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 shadow-md">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22.27 21.73 3.53 3a10.62 10.62 0 0 1-1.3 2.32L9 16l1-2-1.7 3.5a10.5 10.5 0 0 0 2.6 3.9h2.2a10.5 10.5 0 0 0 4.9-2.9l.3.3Z" />
                  <path d="M2 8h3l2 5" /><path d="M21 8h-3l-1.5-3.5" /><path d="M3 3l18 18" />
                </svg>
              </div>
              <span className="text-xl font-extrabold tracking-tight font-display text-white">
                Hatem <span className="text-emerald-400">X</span>
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-slate-400 mb-6">
              {t("المنصة السحابية المتكاملة لأتمتة واتساب، مضاد حذف الرسائل، مشاهدة الحالات الذكية، وحماية الخصوصية مدار الساعة.")}
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { icon: "💰", t: t("محفظة كريدت") },
                { icon: "💎", t: t("تحويل كريدت ذهبي") },
                { icon: "👥", t: t("نظام إحالات") },
                { icon: "🌐", t: t("لغتان") },
                { icon: "🛡️", t: t("آمن 100%") },
              ].map((b) => (
                <span key={b.t} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-300">
                  {b.icon} {b.t}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-emerald-400">{t("التنقل")}</p>
            <ul className="space-y-2.5">
              {[
                { href: "/", t: t("الرئيسية"), icon: "🌐" },
                { href: "/login", t: t("تسجيل الدخول"), icon: "🔑" },
                { href: "/signup", t: t("إنشاء حساب"), icon: "👤" },
              ].map((l) => (
                <li key={l.t}>
                  <Link className="group flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white" href={l.href}>
                    <span className="text-slate-600 group-hover:text-emerald-400 transition-colors">{l.icon}</span>
                    {l.t}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-emerald-400">{t("الخدمات")}</p>
            <ul className="space-y-2.5">
              {[t("تفاعلات واتساب"), t("متابعو واتساب"), t("البوت المصغّر"), t("وصول API"), t("تخزين سحابي")].map((label) => (
                <li key={label}>
                  <Link className="group flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white" href="/connect">
                    <span className="text-slate-600 group-hover:text-cyan-400 transition-colors">⚡</span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-emerald-400">{t("الشركة")}</p>
            <ul className="space-y-2.5">
              {[
                { href: "/#features", t: t("حول") },
                { href: "/contact", t: t("اتصل بنا") },
                { href: "/faq", t: t("الأسئلة الشائعة") },
              ].map((l) => (
                <li key={l.t}>
                  <Link className="group flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white" href={l.href}>
                    <span className="text-slate-600 group-hover:text-emerald-400 transition-colors">📄</span>
                    {l.t}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-wider text-emerald-400">{t("قانوني")}</p>
            <ul className="space-y-2.5">
              <li>
                <Link className="group flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white" href="/privacy">
                  <span className="text-slate-600 group-hover:text-emerald-400 transition-colors">🔒</span>
                  {t("سياسة الخصوصية")}
                </Link>
              </li>
              <li>
                <Link className="group flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white" href="/terms">
                  <span className="text-slate-600 group-hover:text-emerald-400 transition-colors">📜</span>
                  {t("الشروط والأحكام")}
                </Link>
              </li>
            </ul>
          </div>

          {/* بطاقة المطور محمد حاتم */}
          <div className="lg:col-span-2 rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-5 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 text-slate-950 font-black text-lg shadow-md shadow-emerald-500/20">
                X
              </div>
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                  محمد حاتم (Hatem X)
                  <span className="text-emerald-400" title="مطور معتمد">✓</span>
                </h4>
                <p className="text-xs text-slate-400">مطور المنصة وهندسة الأنظمة السحابية</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-300 mb-4">
              للاستفسارات، تفعيل البوتات، الدعم الفني، أو طلب ترقية برو والتكامل المخصص.
            </p>
            <a
              href="https://wa.me/967772847565?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D9%85%D8%AD%D9%85%D8%AF%20%D8%AD%D8%A7%D8%AA%D9%85%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D8%A7%D9%84%D8%A8%D9%88%D8%AA"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 px-4 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition"
            >
              <span>💬 تواصل واتساب: 772847565</span>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
        <div className="mb-3 flex justify-center">
          <LanguageToggle />
        </div>
        <p className="mb-1 text-slate-400">© {new Date().getFullYear()} Hatem X — {t("منصة Hatem X — جميع الحقوق محفوظة.")}</p>
        <p className="text-slate-500">هندسة وتطوير: محمد حاتم (Hatem X)</p>
      </div>
    </footer>
  );
}