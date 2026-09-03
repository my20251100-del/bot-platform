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
    <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-accent/40 bg-surface/90 p-3.5 sm:p-5 shadow-2xl shadow-accent/15 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between text-xs sm:text-sm">
        <span className="flex items-center gap-2 font-medium text-fg">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-matrix opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-matrix"></span>
          </span>
          ربط فوري ومجاني بدون تسجيل حساب:
        </span>
        <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
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
            className="w-full rounded-xl border border-border/80 bg-elevated px-4 py-3 text-base text-fg outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-muted">
            + الرمز الدولي
          </span>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary whitespace-nowrap text-sm sm:text-base font-bold shadow-lg shadow-accent/25"
        >
          {loading ? "جارٍ التوليد..." : "احصل على كود الربط 🚀"}
        </button>
      </form>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
        <span>🔒 تشفير طرف إلى طرف عبر خوادم واتساب الرسمية</span>
        <span>🛡️ بدون حظر وبدون طرف ثالث</span>
      </div>
    </div>
  );
}
