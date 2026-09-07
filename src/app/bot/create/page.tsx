"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

const TRUST_CHIPS = ["🔒 تشفير من الطرف إلى الطرف", "⚡ إعداد خلال 30 ثانية", "🔑 لا نخزّن كلمات السر"];

const HOW_TO_STEPS = [
  {
    title: "أدخل رقمك",
    desc: "اكتب رقم واتسابك مع رمز الدولة ووافق على الشروط.",
  },
  {
    title: "احصل على الكود",
    desc: "ولّد كود الاقتران (أو امسح رمز QR) وأدخله في واتساب ← الأجهزة المرتبطة.",
  },
  {
    title: "أصبح متصلاً 🎉",
    desc: "يتصل البوت فوراً. تحكّم بكل شيء من الإعدادات والرد التلقائي.",
  },
];

const WHY_CARDS = [
  {
    icon: "⚡",
    title: "فوري ومجاني",
    desc: "اربط خلال ثوانٍ بكود أو رمز QR. مجاني تماماً وبلا أي تكاليف خفية.",
  },
  {
    icon: "🤖",
    title: "أتمتة قوية",
    desc: "رد تلقائي، مضاد الحذف، مضاد عرض مرة واحدة، تفاعل تلقائي، ضوابط الخصوصية وحفظ جهات الاتصال.",
  },
  {
    icon: "🔒",
    title: "آمن وخاص",
    desc: "جلسات مشفرة وفحص على مستوى الخادم — بياناتك السرية لا تظهر أبداً.",
  },
];

export default function DeployBotPage() {
  const { t, locale } = useI18n();
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
  const [isConnected, setIsConnected] = useState(false);
  const [botSecret, setBotSecret] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

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

  useEffect(() => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || (!pairCode && !loading && !qrCode)) return;

    let active = true;
    const checkInterval = setInterval(async () => {
      try {
        const token = tokenRef.current ? `&token=${encodeURIComponent(tokenRef.current)}` : "";
        const res = await fetch(`/api/connect?number=${encodeURIComponent(cleanPhone)}${token}`);
        const data = await res.json();
        if (!active || !data?.bot) return;

        if (!pairCode && data.bot.pair_code) {
          setPairCode(data.bot.pair_code);
          setLoading(false);
          setCountdown(120);
        }

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

  const handleGeneratePairCode = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMsg(t("أدخل رقم واتساب صحيح مع رمز الدولة (مثال: 967 لليمن)"));
      return;
    }
    if (!agreed) {
      setErrorMsg(t("يرجى الموافقة على الشروط وسياسة الخصوصية"));
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
          token: tokenRef.current,
          lang: locale,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("فشل بدء عملية الاقتران"));
      }

      if (data.connectToken) tokenRef.current = data.connectToken;

      if (data.pairCode || data.bot?.pair_code) {
        setPairCode(data.pairCode || data.bot?.pair_code);
        setLoading(false);
        setCountdown(120);
      }
    } catch (e: any) {
      setErrorMsg(e.message || t("حدث خطأ أثناء الاتصال بالخادم"));
      setLoading(false);
    }
  };

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
          name: "QR Bot",
          token: tokenRef.current,
          lang: locale,
        }),
      });
      const data = await res.json();
      if (data.connectToken) tokenRef.current = data.connectToken;
      if (data.bot?.qr) {
        setQrCode(data.bot.qr);
      }
    } catch (e: any) {
      setErrorMsg(e.message || t("فشل توليد رمز QR"));
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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {isConnected ? (
        <div className="card relative p-6 text-center opacity-0 animate-fade-up sm:p-8">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success/15 text-4xl text-success">
            ✓
          </div>
          <div className="mt-5">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{t("البوت أصبح متصلاً! 🎉")}</h2>
            <p className="mt-2 text-sm text-muted">
              {t("متصل بالرقم")} <span dir="ltr" className="font-mono font-bold text-accent">+{phone}</span> {t("— يعمل 24/7 في السحابة.")}
            </p>
            <p className="mt-1 text-xs text-muted">{t("أرسلنا بياناتك السرية إلى محادثتك الخاصة في واتساب.")}</p>
          </div>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={`/bot/setting?number=${encodeURIComponent(phone.replace(/\D/g, ""))}${
                botSecret ? `&secret=${encodeURIComponent(botSecret)}` : ""
              }`}
              className="btn-primary flex items-center justify-center gap-2 px-6 py-3.5"
            >
              <span>{t("فتح لوحة التحكم")}</span>
              <span>←</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsConnected(false);
                setPairCode(null);
                setQrCode(null);
                setPhone("");
              }}
              className="rounded-2xl border border-border bg-surface px-5 py-3 text-sm text-muted transition hover:text-fg"
            >
              {t("ربط رقم آخر")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center animate-fade-up">
            <span className="inline-block rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
              {t("100% مجاني للأبد")}
            </span>
            <h1 className="mx-auto mt-4 max-w-xl font-display text-3xl font-extrabold sm:text-4xl">
              {t("انشر بوت واتساب المجاني في ثوانٍ")}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
              {t("اربط واتسابك بكود اقتران أو رمز QR — بلا تطبيقات، بلا دفعات، بلا برمجة. Auto Reply، Anti Delete، Anti View Once، أدوات الحالة وأكثر، كل ذلك من لوحة واحدة.")}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {TRUST_CHIPS.map((chip) => (
                <span key={chip} className="rounded-full border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-muted">
                  {t(chip)}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-10 space-y-6">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-1.5">
              <button
                type="button"
                onClick={() => {
                  setMode("pair");
                  setPairCode(null);
                  setQrCode(null);
                }}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  mode === "pair" ? "bg-accent text-accent-fg shadow-[0_0_14px_rgba(0,212,255,0.3)]" : "text-muted hover:text-fg"
                }`}
              >
                {t("📱 كود الاقتران")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("qr");
                  setQrCode(null);
                  if (!qrCode) handleGenerateQr();
                }}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  mode === "qr" ? "bg-accent text-accent-fg shadow-[0_0_14px_rgba(0,212,255,0.3)]" : "text-muted hover:text-fg"
                }`}
              >
                {t("📷 رمز QR")}
              </button>
            </div>

            {mode === "pair" && (
              <div className="card relative p-6 opacity-0 animate-fade-up sm:p-8">
                {!pairCode && !loading ? (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-bold text-lg sm:text-xl">{t("أدخل رقم واتسابك")}</h2>
                      <p className="mt-1 text-xs text-muted">{t("سنولّد كوداً رسمياً من 8 خانات لربط حسابك فوراً.")}</p>
                    </div>

                    <div>
                      <input
                        type="tel"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="967772847565"
                        className="field w-full text-base font-mono tracking-wider sm:text-lg"
                      />
                      <span className="mt-1.5 block text-xs text-muted/70">
                        {t("ضمّن رمز الدولة (مثال: 94 لسريلانكا)")}
                      </span>
                    </div>

                    {errorMsg && <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger animate-fade-in">{errorMsg}</p>}

                    <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
                      />
                      <span>
                        {t("أوافق على")}{" "}
                        <Link href="/terms" className="font-semibold text-accent hover:underline">
                          {t("الشروط والأحكام")}
                        </Link>{" "}
                        {t("و")}{" "}
                        <Link href="/privacy" className="font-semibold text-accent hover:underline">
                          {t("سياسة الخصوصية")}
                        </Link>
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={handleGeneratePairCode}
                      disabled={loading || !phone || !agreed}
                      className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 disabled:opacity-50"
                    >
                      <span>{t("توليد كود الاقتران")}</span>
                      <span>←</span>
                    </button>
                  </div>
                ) : loading && !pairCode ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                    <span className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <div>
                      <h3 className="font-bold text-lg">{t("جارٍ طلب كود الاقتران من واتساب...")}</h3>
                      <p className="mt-1 text-xs text-muted">{t("يستغرق من 2 إلى 4 ثوانٍ فقط، انتظر قليلاً ⏳")}</p>
                    </div>
                  </div>
                ) : pairCode ? (
                  <div className="space-y-6 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3.5 py-1 text-xs font-bold text-success">
                      <span className="h-2 w-2 animate-ping rounded-full bg-success" />
                      <span>{t("الكود نشط — أدخله في واتساب")}</span>
                    </div>

                    <div className="rounded-2xl border border-accent/40 bg-black/50 p-6 shadow-[inset_0_0_25px_rgba(0,212,255,0.12)]">
                      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">{t("كود الاقتران الخاص بك")}</p>

                      <div dir="ltr" className="my-2 flex select-all items-center justify-center gap-1.5 sm:gap-2.5">
                        {pairCode.replace(/[^A-Za-z0-9]/g, "").split("").map((char, index) => (
                          <div key={index} className="flex items-center">
                            {index === 4 && <span className="mx-1 text-2xl font-black text-accent sm:mx-2 sm:text-3xl">-</span>}
                            <span className="grid h-12 w-9 place-items-center rounded-xl border-2 border-accent/70 bg-elevated font-mono text-2xl font-black shadow-[0_0_15px_rgba(0,212,255,0.35)] sm:h-16 sm:w-13 sm:rounded-2xl sm:text-3xl">
                              {char}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mx-auto mt-5 flex max-w-sm items-center justify-between text-xs text-muted">
                        <span>{t("الكود ينتهي خلال:")}</span>
                        <span className="font-mono font-bold text-accent">{locale === "en" ? `${countdown}s` : `${countdown} ث`}</span>
                      </div>
                      <div className="mx-auto mt-1.5 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full bg-gradient-to-r from-accent to-success transition-all duration-1000"
                          style={{ width: `${(countdown / 120) * 100}%` }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={copyToClipboard}
                        className={`mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-lg transition-all ${
                          copied
                            ? "bg-success text-black"
                            : "bg-accent text-accent-fg shadow-accent/25 hover:brightness-110 active:scale-95"
                        }`}
                      >
                        {copied ? (
                          <>
                            <span>✓</span>
                            <span>{t("تم نسخ الكود!")}</span>
                          </>
                        ) : (
                          <>
                            <span>📋</span>
                            <span>{t("نسخ الكود")}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-muted/70">
                      {t("افتح واتساب ← الإعدادات ← الأجهزة المرتبطة ← الربط برقم الهاتف، ثم أدخل هذا الكود.")}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {mode === "qr" && (
              <div className="card relative p-6 text-center opacity-0 animate-fade-up sm:p-8">
                <h2 className="font-bold text-xl">{t("امسح رمز QR بكاميرا واتساب")}</h2>
                <p className="mt-1 text-xs text-muted">{t("افتح واتساب ← الأجهزة المرتبطة ← ربط جهاز ووجّه الكاميرا هنا.")}</p>

                <div className="mx-auto mt-6 flex h-64 w-64 items-center justify-center rounded-2xl bg-white p-3 shadow-2xl">
                  {qrCode ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrCode} alt="WhatsApp QR" className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-muted">
                      <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      <span className="text-xs">{t("جارٍ توليد رمز QR حيّ...")}</span>
                    </div>
                  )}
                </div>

                {errorMsg && <p className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger animate-fade-in">{errorMsg}</p>}
              </div>
            )}
          </div>

          <section className="mt-14 animate-fade-in">
            <div className="mb-6 text-center">
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{t("كيف تتصل؟")}</h2>
              <p className="mt-1 text-sm text-muted">{t("ثلاث خطوات بسيطة. بدون تثبيت.")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {HOW_TO_STEPS.map((step, i) => (
                <div key={step.title} className="card p-5 text-center">
                  <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-accent/15 font-mono text-sm font-black text-accent">
                    {i + 1}
                  </span>
                  <p className="mt-3 font-bold">{t(step.title)}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted/80">{t(step.desc)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14 animate-fade-in">
            <div className="mb-6 text-center">
              <h2 className="font-display text-2xl font-bold sm:text-3xl">{t("لماذا Hatem X بوت مصغّر؟")}</h2>
              <p className="mt-1 text-sm text-muted">{t("كل ما تحتاجه لتفعيل واتسابك بالكامل")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {WHY_CARDS.map((card) => (
                <div key={card.title} className="card p-5 text-center">
                  <span className="text-3xl">{card.icon}</span>
                  <p className="mt-3 font-bold">{t(card.title)}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted/80">{t(card.desc)}</p>
                </div>
              ))}
            </div>
          </section>

          <p className="mt-10 text-center text-xs text-muted/70">
            {t("🔒 اتصال مشفر · لا نخزّن كلمة سر واتساب الخاص بك كنص صريح")}
          </p>
        </>
      )}
    </div>
  );
}