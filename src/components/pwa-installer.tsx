"use client";

import { useEffect, useState } from "react";

export default function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // 2. Check if already running standalone
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // 4. Capture install prompt on Android/Chrome
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem("pwa_prompt_dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // If iOS and not dismissed, show prompt after a short delay
    if (isIosDevice) {
      const dismissed = localStorage.getItem("pwa_prompt_dismissed");
      if (!dismissed) {
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-20 inset-x-3 z-50 mx-auto max-w-md animate-fade-in md:bottom-6 md:right-6 md:left-auto md:max-w-sm">
      <div className="rounded-2xl border border-accent/40 bg-surface/95 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_25px_rgba(0,212,255,0.2)] backdrop-blur-xl">
        <div className="flex items-start gap-3.5">
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-accent to-matrix text-bg shadow-[0_0_15px_rgba(0,212,255,0.4)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
              <path d="M12 18h.01"/>
            </svg>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">تثبيت التطبيق على هاتفك 📱</h3>
              <button
                onClick={handleDismiss}
                className="text-muted hover:text-white p-1 rounded-lg transition-colors"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              احصل على تجربة تطبيق أصلي سريع، تصفح خزانة المحذوفات وراقب الإحصائيات مباشرة من شاشتك الرئيسية.
            </p>

            {isIOS ? (
              <div className="mt-3 rounded-lg border border-border/60 bg-elevated/60 p-2.5 text-[11px] text-muted">
                اضغط على زر المشاركة <span className="text-white font-bold">⎋</span> أسفل المتصفح، ثم اختر <span className="text-accent font-bold">"إضافة إلى الصفحة الرئيسية" ➕</span>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 rounded-xl bg-accent px-3 py-2 text-center text-xs font-bold text-bg transition-all hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(0,212,255,0.4)]"
                >
                  تثبيت الآن مجاناً 🚀
                </button>
                <button
                  onClick={handleDismiss}
                  className="rounded-xl border border-border px-3 py-2 text-xs text-muted hover:text-white"
                >
                  لاحقاً
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
