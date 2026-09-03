"use client";

import { useState, useEffect } from "react";

export default function AutoContactSavePage() {
  const [autoSaveOn, setAutoSaveOn] = useState(true);
  const [contactCount, setContactCount] = useState(482);
  const [downloading, setDownloading] = useState(false);
  const [activeBot, setActiveBot] = useState<any>(null);

  useEffect(() => {
    async function loadBot() {
      try {
        const res = await fetch("/api/bot/action?action=get_latest_bot");
        const data = await res.json();
        if (data?.bot) {
          setActiveBot(data.bot);
        }
      } catch {}
    }
    loadBot();
  }, []);

  const handleDownload = async (format: "vcf" | "csv") => {
    setDownloading(true);
    try {
      const botId = activeBot?.id || "7338dc51-affe-4eab-81c3-ab04cfe879e2";
      window.open(`/api/bot/${botId}/contacts?format=${format}`, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* رأس الصفحة مطابق لـ Red Queen */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">Auto Save Contacts</h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Automatically log and export all WhatsApp contacts and new incoming chat numbers
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-matrix/15 px-3.5 py-1 text-xs font-bold text-matrix border border-matrix/30">
          <span className="h-2 w-2 rounded-full bg-matrix animate-ping" />
          <span>Connected ✓ (متصل بالخادم)</span>
        </span>
      </div>

      {/* بطاقة الشرح والتفعيل التلقائي */}
      <div className="card rounded-3xl border border-border/80 bg-surface/80 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-white">Auto Contact Logger</h2>
            <p className="text-xs text-muted mt-0.5">
              حفظ وتدوين كل رقم جديد يراسلك على واتساب تلقائياً في قاعدة البيانات
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoSaveOn}
            onClick={() => setAutoSaveOn(!autoSaveOn)}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
              autoSaveOn ? "bg-accent shadow-[0_0_10px_rgba(0,212,255,0.4)]" : "bg-elevated border border-border"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                autoSaveOn ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* إحصائيات الأرقام المحفوظة */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-elevated/50 p-4 text-center">
            <p className="text-xs text-muted">إجمالي جهات الاتصال المسجلة</p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-accent mt-1">{contactCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-elevated/50 p-4 text-center">
            <p className="text-xs text-muted">تزامن السحابة (Cloud Sync)</p>
            <p className="text-sm font-bold text-matrix mt-2">Active 24/7</p>
          </div>
        </div>

        {/* أزرار التحميل والتصدير الفوري */}
        <div className="space-y-3 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">خيارات تصدير الأرقام بضغطة زر:</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleDownload("vcf")}
              disabled={downloading}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-accent px-5 py-3.5 text-xs sm:text-sm font-bold text-accent-fg shadow-lg shadow-accent/25 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              <span>📥</span>
              <span>تحميل ملف جهات الاتصال (VCF)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownload("csv")}
              disabled={downloading}
              className="flex items-center justify-center gap-2.5 rounded-2xl border border-border/90 bg-elevated px-5 py-3.5 text-xs sm:text-sm font-bold text-white transition hover:border-accent hover:text-accent active:scale-95 disabled:opacity-50"
            >
              <span>📊</span>
              <span>تصدير ملف إكسل (CSV)</span>
            </button>
          </div>
          <p className="text-[11px] text-muted text-center pt-1">
            ملف VCF يعمل مباشرة على هواتف iPhone و Android لتنزيل كل الأرقام إلى دفتر هاتفك بنقرة واحدة.
          </p>
        </div>
      </div>
    </div>
  );
}
