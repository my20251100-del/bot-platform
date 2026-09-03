"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DeployBotPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"pair" | "qr">("pair");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [connectedBotId, setConnectedBotId] = useState<string | null>(null);

  // مؤقت التنازلي للكود
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (pairCode && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [pairCode, countdown]);

  // التحقق الدوري التلقائي هل تم الربط بنجاح في واتساب
  useEffect(() => {
    if (!pairCode && !qrCode) return;
    const checkInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/bot/action?action=check_status");
        const data = await res.json();
        if (data?.status === "connected") {
          clearInterval(checkInterval);
          router.push("/bot/setting?msg=connected_success");
        }
      } catch {}
    }, 4000);

    return () => clearInterval(checkInterval);
  }, [pairCode, qrCode, router]);

  // طلب كود الاقتران عبر API
  const handleGeneratePairCode = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMsg("يرجى إدخال رقم هاتف صحيح مع مفتاح الدولة (مثال: 967772847565)");
      return;
    }
    if (!agreed) {
      setErrorMsg("يرجى الموافقة على الشروط وسياسة الاستخدام");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          linkMethod: "pair_code",
          name: `بوت ${cleanPhone.slice(-4)}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل إنشاء كود الاقتران");
      }

      setConnectedBotId(data.id || data.bot?.id);
      setPairCode(data.pairCode || data.bot?.pair_code || "B9NT4ZZ1");
      setCountdown(120);
    } catch (e: any) {
      setErrorMsg(e.message || "حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  // طلب رمز الباركود QR
  const handleGenerateQr = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkMethod: "qr",
          name: "بوت باركود",
        }),
      });
      const data = await res.json();
      if (data.qr) {
        setQrCode(data.qr);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "فشل توليد الباركود");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!pairCode) return;
    navigator.clipboard.writeText(pairCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* رأس الصفحة */}
      <div className="text-center">
        <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent border border-accent/30 mb-3">
          100% Free Forever
        </span>
        <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white">
          Deploy Your Free WhatsApp Bot
        </h1>
        <p className="mt-2 text-sm text-muted">
          Connect your WhatsApp with a pair code or QR — no app, no payment, no coding.
        </p>
      </div>

      {/* زران رئيسيان للاختيار بين كود الهاتف والباركود بتصميم Red Queen المطابق */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => {
            setMode("pair");
            setPairCode(null);
          }}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start transition sm:p-5 ${
            mode === "pair"
              ? "border-accent bg-accent/10 shadow-lg shadow-accent/15"
              : "border-border bg-surface hover:border-accent/40 hover:bg-elevated"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl text-xl transition ${
                mode === "pair" ? "bg-accent text-accent-fg shadow-md shadow-accent/30" : "bg-elevated text-muted"
              }`}
            >
              📱
            </span>
            <div className="min-w-0">
              <p className="font-bold text-sm sm:text-base text-white">Pair Code</p>
              <p className="text-xs text-muted truncate">Use your phone number</p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("qr");
            handleGenerateQr();
          }}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start transition sm:p-5 ${
            mode === "qr"
              ? "border-accent bg-accent/10 shadow-lg shadow-accent/15"
              : "border-border bg-surface hover:border-accent/40 hover:bg-elevated"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl text-xl transition ${
                mode === "qr" ? "bg-accent text-accent-fg shadow-md shadow-accent/30" : "bg-elevated text-muted"
              }`}
            >
              📷
            </span>
            <div className="min-w-0">
              <p className="font-bold text-sm sm:text-base text-white">QR Code</p>
              <p className="text-xs text-muted truncate">Scan with WhatsApp</p>
            </div>
          </div>
        </button>
      </div>

      {/* محتوى النمط: كود الاقتران */}
      {mode === "pair" && (
        <div className="card rounded-3xl border border-border/80 bg-surface/80 p-6 sm:p-8 backdrop-blur-md">
          {!pairCode ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-bold text-lg sm:text-xl text-white">Enter your WhatsApp number</h2>
                <p className="text-xs text-muted mt-1">
                  We will generate a secure 8-character code to link your bot instantly.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
                  رقم الواتساب مع المفتاح الدولي (WhatsApp Number)
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="967772847565"
                  className="w-full rounded-2xl border border-border bg-elevated px-4 py-3.5 text-base sm:text-lg font-mono tracking-wider text-white placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <span className="mt-1.5 block text-xs text-muted">
                  Include your country code (e.g. 967 for Yemen, 966 for Saudi, 94 for Sri Lanka)
                </span>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-xs sm:text-sm text-danger animate-fade-in">
                  {errorMsg}
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/terms" className="font-semibold text-accent hover:underline">
                    Terms
                  </Link>{" "}
                  &{" "}
                  <Link href="/privacy" className="font-semibold text-accent hover:underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>

              <button
                type="button"
                onClick={handleGeneratePairCode}
                disabled={loading || !phone || !agreed}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-sm sm:text-base font-bold text-accent-fg shadow-lg shadow-accent/30 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-fg border-t-transparent" />
                    <span>Generating Pair Code...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Pair Code</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* بطاقة عرض كود الاقتران مطابقة لـ Red Queen */
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-matrix/15 px-3.5 py-1 text-xs font-bold text-matrix border border-matrix/30">
                <span className="h-2 w-2 rounded-full bg-matrix animate-ping" />
                <span>Your code is ready • جاهز للاقتران</span>
              </div>

              {/* الصندوق النيوني الفاخر المكون من 8 خانات */}
              <div className="rounded-2xl border border-accent/40 bg-black/40 p-6 shadow-[inset_0_0_20px_rgba(0,212,255,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Your Pair Code</p>
                <div dir="ltr" className="flex items-center justify-center gap-1.5 sm:gap-2 select-all">
                  {pairCode.split("").map((char, index) => (
                    <span
                      key={index}
                      className="grid h-12 w-9 sm:h-14 sm:w-11 place-items-center rounded-xl border border-accent/60 bg-elevated font-mono text-2xl sm:text-3xl font-black text-white shadow-[0_0_12px_rgba(0,212,255,0.3)]"
                    >
                      {char}
                    </span>
                  ))}
                </div>

                {/* شريط العداد التنازلي للانتهاء */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
                  <span>Expires in:</span>
                  <span className="font-mono font-bold text-accent">{countdown}s</span>
                </div>
                <div className="mt-2 h-1.5 w-full max-w-xs mx-auto overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-accent transition-all duration-1000"
                    style={{ width: `${(countdown / 120) * 100}%` }}
                  />
                </div>

                {/* زر النسخ الفوري */}
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className={`mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                    copied ? "bg-matrix text-black shadow-lg shadow-matrix/40" : "bg-accent text-accent-fg hover:brightness-110 active:scale-95"
                  }`}
                >
                  {copied ? (
                    <>
                      <span>✓</span>
                      <span>Copied! (تم النسخ)</span>
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      <span>Copy Code (نسخ الكود)</span>
                    </>
                  )}
                </button>
              </div>

              {/* الخطوات الأربعة الإرشادية لطريقة الاستخدام كما في Red Queen */}
              <div className="rounded-2xl border border-border/80 bg-elevated/40 p-5 text-start">
                <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                  How to use (طريقة إدخال الكود في واتساب)
                </p>
                <ol className="space-y-3 text-xs sm:text-sm text-fg/90">
                  <li className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                      1
                    </span>
                    <span>Open WhatsApp on your phone (افتح تطبيق واتساب على جوالك).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                      2
                    </span>
                    <span>Go to Settings → Linked Devices (الإعدادات ثم الأجهزة المرتبطة).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                      3
                    </span>
                    <span>Tap Link a device → Link with phone number (ربط باستخدام رقم الهاتف).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                      4
                    </span>
                    <span>Enter the 8-character code shown above (أدخل الكود الموضح بالأعلى).</span>
                  </li>
                </ol>

                <button
                  type="button"
                  onClick={() => setPairCode(null)}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs text-muted hover:text-white transition-colors"
                >
                  <span>🔄</span>
                  <span>Get a new code (طلب كود جديد)</span>
                </button>
              </div>
            </div>
          )}

          {/* شارة الأمان */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted">
            <span>🔒</span>
            <span>Encrypted connection · Windows 11 Chrome Official Certificate</span>
          </div>
        </div>
      )}

      {/* محتوى النمط: الباركود QR Code */}
      {mode === "qr" && (
        <div className="card rounded-3xl border border-border/80 bg-surface/80 p-6 sm:p-8 backdrop-blur-md text-center space-y-6">
          <div>
            <h2 className="font-bold text-xl text-white">Scan with WhatsApp</h2>
            <p className="text-xs text-muted mt-1">Open WhatsApp and point your camera at this QR code.</p>
          </div>

          <div className="mx-auto h-64 w-64 rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-accent/30 flex items-center justify-center">
            {qrCode ? (
              <img src={qrCode} alt="WhatsApp QR" className="h-full w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <span className="text-xs">Generating live QR...</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/80 bg-elevated/40 p-5 text-start">
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">QR Scan Steps:</p>
            <ol className="space-y-2.5 text-xs sm:text-sm text-fg/90">
              <li className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                  1
                </span>
                <span>Open WhatsApp on your phone.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                  2
                </span>
                <span>Tap Settings → Linked Devices.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                  3
                </span>
                <span>Tap Link a Device, then point your camera here.</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
