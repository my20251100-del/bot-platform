"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomeHeroConnect() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = phone.replace(/\D/g, "");
    if (!clean) return;
    setLoading(true);
    router.push(`/connect?phone=${encodeURIComponent(clean)}`);
  }

  return (
    <div className="relative mx-auto mt-10 max-w-xl">
      {/* هالة إضاءة خلفية ناعمة */}
      <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-indigo-500/20 blur-xl opacity-75" />

      <div className="relative rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl">
        <div className="mb-3.5 flex items-center justify-between text-xs sm:text-sm">
          <span className="flex items-center gap-2 font-medium text-slate-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
            </span>
            ربط فوري ومجاني بدون تسجيل حساب:
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
            ⚡ 10 ثوانٍ فقط
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="tel"
              dir="ltr"
              placeholder="967771234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <span className="pointer-events-none absolute inset-y-0 end-3.5 flex items-center text-xs text-slate-400 font-mono">
              + الرمز الدولي
            </span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary whitespace-nowrap text-sm sm:text-base font-bold shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جارٍ التوليد...
              </span>
            ) : (
              "احصل على كود الربط 🚀"
            )}
          </button>
        </form>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">🔒</span> تشفير طرف إلى طرف عبر بروتوكول Signal الرسمي
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-cyan-400">🛡️</span> بدون حظر • خوادم سحابية 24/7
          </span>
        </div>
      </div>
    </div>
  );
}
