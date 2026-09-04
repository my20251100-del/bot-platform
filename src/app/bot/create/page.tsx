"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DeployBotPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"pair" | "qr">("pair");
  const [phone, setPhone] = useState(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const p = sp.get("phone") || sp.get("number");
      return p ? p.replace(/\D/g, "") : "";
    }
    return "";
  });
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [connectedBotId, setConnectedBotId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [botSecret, setBotSecret] = useState<string | null>(null);

  // مؤقت التنازلي للكود
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (pairCode && countdown > 0 && !isConnected) {
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
  }, [pairCode, countdown, isConnected]);

  // التحقق الدوري التلقائي (استقبال الكود الحقيقي ثم التحقق من إتمام الربط في واتساب)
  useEffect(() => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || (!pairCode && !loading && !qrCode)) return;

    let active = true;
    const checkInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/connect?number=${encodeURIComponent(cleanPhone)}`);
        const data = await res.json();
        if (!active || !data?.bot) return;

        // إذا كان الكود لم يصل بعد في الاستجابة الأولى، نلتقطه فور توليده من المحرك
        if (!pairCode && data.bot.pair_code) {
          setPairCode(data.bot.pair_code);
          setLoading(false);
          setCountdown(120);
        }

        // إذا تم إدخال الكود في واتساب واكتمل الاتصال بنجاح
        if (data.bot.status === "connected") {
          setIsConnected(true);
          setPairCode(null);
          setLoading(false);
          if (data.bot.secret) setBotSecret(data.bot.secret);
          clearInterval(checkInterval);
        }
      } catch {}
    }, 2000);

    return () => {
      active = false;
      clearInterval(checkInterval);
    };
  }, [phone, pairCode, loading, qrCode]);

  // طلب كود الاقتران عبر API الحقيقي للمحرك
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
    setPairCode(null);
    setIsConnected(false);

    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: cleanPhone,
          action: "start",
          linkMethod: "pair_code",
          name: `بوت ${cleanPhone.slice(-4)}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل بدء عملية الاقتران");
      }

      setConnectedBotId(data.id || data.bot?.id);

      // إذا وُجد الكود فوراً
      if (data.pairCode || data.bot?.pair_code) {
        setPairCode(data.pairCode || data.bot?.pair_code);
        setLoading(false);
        setCountdown(120);
      } else {
        // يبقى loading=true والمؤقت الدوري (useEffect) سيلتقط الكود في غضون 2 ثانية
      }
    } catch (e: any) {
      setErrorMsg(e.message || "حدث خطأ أثناء الاتصال بالخادم");
      setLoading(false);
    }
  };

  // طلب رمز الباركود QR
  const handleGenerateQr = async () => {
    setLoading(true);
    setErrorMsg(null);
    setQrCode(null);
    const cleanPhone = phone.replace(/\D/g, "") || "967000000000";
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: cleanPhone,
          action: "start",
          linkMethod: "qr",
          name: "بوت باركود",
        }),
      });
      const data = await res.json();
      if (data.bot?.qr) {
        setQrCode(data.bot.qr);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "فشل توليد الباركود");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!pairCode) return;
    const cleanCode = pairCode.replace(/[^A-Za-z0-9]/g, "");
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-6 px-4">
      {/* رأس الصفحة */}
      <div className="text-center">
        <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent border border-accent/30 mb-3">
          100% Free Forever • ربط فوري سحابي
        </span>
        <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white">
          Deploy Your Free WhatsApp Bot
        </h1>
        <p className="mt-2 text-sm text-muted">
          اربط واتسابك بكود الاقتران أو الباركود فوراً — بدون تطبيقات، بدون كود، واستقرار سحابي 24/7.
        </p>
      </div>

      {/* شاشة النجاح عند إتمام الربط في واتساب */}
      {isConnected ? (
        <div className="card rounded-3xl border border-emerald-500/50 bg-emerald-950/20 p-8 text-center space-y-6 shadow-[0_0_40px_rgba(16,185,129,0.2)] backdrop-blur-md animate-fade-in">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/20 text-4xl text-emerald-400 border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
            ✓
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">🎉 تم ربط واتساب بنجاح!</h2>
            <p className="text-sm text-muted mt-2">
              البوت متصل الآن بالرقم <span dir="ltr" className="font-mono font-bold text-emerald-400">+{phone}</span> ويعمل سحابياً 24/7.
            </p>
            <p className="text-xs text-muted mt-1">
              تم إرسال رسالة في محادثتك الخاصة بواتساب تحتوي على كلمة السر الخاصة بك.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
            <Link
              href={`/setting?number=${encodeURIComponent(phone)}${botSecret ? `&secret=${encodeURIComponent(botSecret)}` : ""}`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3.5 text-sm sm:text-base font-bold text-accent-fg shadow-lg shadow-accent/25 transition hover:brightness-110 active:scale-95"
            >
              <span>فتح لوحة التحكم والإعدادات</span>
              <span>←</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsConnected(false);
                setPairCode(null);
                setPhone("");
              }}
              className="rounded-2xl border border-border bg-surface px-5 py-3 text-xs sm:text-sm text-muted hover:text-white transition"
            >
              ربط رقم آخر
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* زران رئيسيان للاختيار بين كود الهاتف والباركود */}
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
                  <p className="font-bold text-sm sm:text-base text-white">كود الاقتران (Pair Code)</p>
                  <p className="text-xs text-muted truncate">الربط برقم الهاتف مباشرة</p>
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
                  <p className="font-bold text-sm sm:text-base text-white">رمز الباركود (QR Code)</p>
                  <p className="text-xs text-muted truncate">مسح الكاميرا من واتساب</p>
                </div>
              </div>
            </button>
          </div>

          {/* محتوى النمط: كود الاقتران */}
          {mode === "pair" && (
            <div className="card rounded-3xl border border-border/80 bg-surface/80 p-6 sm:p-8 backdrop-blur-md">
              {!pairCode && !loading ? (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-bold text-lg sm:text-xl text-white">أدخل رقم هاتفك في واتساب</h2>
                    <p className="text-xs text-muted mt-1">
                      سنقوم بتوليد كود رسمي من 8 خانات لربط حسابك فوراً بخوادم واتساب الرسمية.
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
                      اكتب الرقم مسبوقاً بمفتاح الدولة (مثال: 967 لليمن، 966 للسعودية، 20 لمصر)
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
                      أوافق على{" "}
                      <Link href="/terms" className="font-semibold text-accent hover:underline">
                        الشروط والأحكام
                      </Link>{" "}
                      و{" "}
                      <Link href="/privacy" className="font-semibold text-accent hover:underline">
                        سياسة الخصوصية
                      </Link>
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleGeneratePairCode}
                    disabled={loading || !phone || !agreed}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-sm sm:text-base font-bold text-accent-fg shadow-lg shadow-accent/30 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                  >
                    <span>احصل على كود الاقتران 🚀</span>
                    <span>←</span>
                  </button>
                </div>
              ) : loading && !pairCode ? (
                /* حالة جلب الكود من المحرك */
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="relative flex h-14 w-14 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40"></span>
                    <span className="h-10 w-10 animate-spin rounded-full border-3 border-accent border-t-transparent"></span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">جارٍ طلب كود الاقتران من خوادم واتساب...</h3>
                    <p className="text-xs text-muted mt-1">يستغرق الأمر من 2 إلى 4 ثوانٍ فقط، انتظر لحظة ⏳</p>
                  </div>
                </div>
              ) : (
                /* بطاقة عرض كود الاقتران الفاخرة */
                <div className="space-y-6 text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>الكود نشط الآن • أدخله في واتساب</span>
                  </div>

                  {/* الصندوق النيوني الفاخر مع فاصل احترافي */}
                  <div className="rounded-2xl border border-accent/40 bg-black/50 p-6 shadow-[inset_0_0_25px_rgba(0,212,255,0.12)]">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">كود الاقتران الخاص بك (Your Pair Code)</p>
                    
                    <div dir="ltr" className="flex items-center justify-center gap-1.5 sm:gap-2.5 select-all my-2">
                      {pairCode!.replace(/[^A-Za-z0-9]/g, "").split("").map((char, index) => (
                        <div key={index} className="flex items-center">
                          {index === 4 && (
                            <span className="text-2xl sm:text-3xl font-black text-accent mx-1 sm:mx-2">-</span>
                          )}
                          <span
                            className="grid h-12 w-9 sm:h-16 sm:w-13 place-items-center rounded-xl sm:rounded-2xl border-2 border-accent/70 bg-elevated font-mono text-2xl sm:text-3xl font-black text-white shadow-[0_0_15px_rgba(0,212,255,0.35)] transition hover:scale-105"
                          >
                            {char}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* شريط العداد التنازلي للانتهاء */}
                    <div className="mt-5 flex items-center justify-between text-xs text-muted max-w-sm mx-auto">
                      <span>صلاحية الكود:</span>
                      <span className="font-mono font-bold text-accent">{countdown} ثانية</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full max-w-sm mx-auto overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-1000"
                        style={{ width: `${(countdown / 120) * 100}%` }}
                      />
                    </div>

                    {/* زر النسخ الفوري */}
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className={`mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all shadow-lg ${
                        copied
                          ? "bg-emerald-500 text-black shadow-emerald-500/30"
                          : "bg-accent text-accent-fg hover:brightness-110 active:scale-95 shadow-accent/25"
                      }`}
                    >
                      {copied ? (
                        <>
                          <span>✓</span>
                          <span>تم نسخ الكود بنجاح!</span>
                        </>
                      ) : (
                        <>
                          <span>📋</span>
                          <span>نسخ الكود بنقرة واحدة</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* الخطوات الإرشادية */}
                  <div className="rounded-2xl border border-border/80 bg-elevated/40 p-5 text-start">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                      طريقة إدخال الكود في تطبيق واتساب:
                    </p>
                    <ol className="space-y-3 text-xs sm:text-sm text-fg/90">
                      <li className="flex items-start gap-2.5">
                        <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                          1
                        </span>
                        <span>افتح تطبيق <b>WhatsApp</b> في هاتفك.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                          2
                        </span>
                        <span>اذهب إلى <b>الإعدادات (Settings)</b> ← <b>الأجهزة المرتبطة (Linked Devices)</b>.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                          3
                        </span>
                        <span>اضغط على <b>ربط جهاز</b> ← ثم اختر <b>الربط باستخدام رقم الهاتف (Link with phone number)</b>.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                          4
                        </span>
                        <span>أدخل الكود الموضح في الأعلى، وسيتصل البوت فوراً وتنتقل لصفحة الإعدادات!</span>
                      </li>
                    </ol>

                    <button
                      type="button"
                      onClick={handleGeneratePairCode}
                      className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs text-muted hover:text-white transition-colors"
                    >
                      <span>🔄</span>
                      <span>طلب كود اقتران جديد</span>
                    </button>
                  </div>
                </div>
              )}

              {/* شارة الأمان */}
              <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted">
                <span>🔒</span>
                <span>اتصال مشفر طرف إلى طرف عبر خوادم واتساب الرسمية (بدون حظر وبدون طرف ثالث)</span>
              </div>
            </div>
          )}

          {/* محتوى النمط: الباركود QR Code */}
          {mode === "qr" && (
            <div className="card rounded-3xl border border-border/80 bg-surface/80 p-6 sm:p-8 backdrop-blur-md text-center space-y-6">
              <div>
                <h2 className="font-bold text-xl text-white">امسح الباركود عبر كاميرا واتساب</h2>
                <p className="text-xs text-muted mt-1">افتح واتساب ووجّه الكاميرا نحو رمز الاستجابة السريعة أدناه.</p>
              </div>

              <div className="mx-auto h-64 w-64 rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-accent/30 flex items-center justify-center">
                {qrCode ? (
                  <img src={qrCode} alt="WhatsApp QR" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted">
                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <span className="text-xs">جارٍ توليد رمز الباركود المباشر...</span>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border/80 bg-elevated/40 p-5 text-start">
                <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">خطوات المسح:</p>
                <ol className="space-y-2.5 text-xs sm:text-sm text-fg/90">
                  <li className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                      1
                    </span>
                    <span>افتح واتساب في جوالك.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                      2
                    </span>
                    <span>الإعدادات ← الأجهزة المرتبطة ← ربط جهاز.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                      3
                    </span>
                    <span>وجّه الكاميرا إلى المربع وسيتصل البوت خلال ثوانٍ.</span>
                  </li>
                </ol>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
