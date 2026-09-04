"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Particles } from "@/components/ui/cyber-button";

type BotState = {
  id: string;
  name: string;
  status: string;
  linked_number: string;
  link_method: string;
  pair_code: string | null;
  qr: string | null;
  isPending: boolean;
  secret: string | null;
  last_error?: string | null;
  attempt?: number;
};

const statusLabels: Record<string, string> = {
  connected: "متصل ✓",
  pending: "بانتظار إدخال الكود في واتساب...",
  disconnected: "غير متصل",
  failed: "فشل الاتصال",
};

const LINK_TIMEOUT_MS = 180_000;

export default function ConnectPage() {
  const [number, setNumber] = useState("");
  const [botName, setBotName] = useState("");
  const [step, setStep] = useState<"input" | "linking" | "connected" | "error">("input");
  const [bot, setBot] = useState<BotState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(120);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // قراءة الرقم من الرابط ?phone= أو ?number=
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const p = sp.get("phone") || sp.get("number");
      if (p) {
        setNumber(p.replace(/\D/g, ""));
      }
    }
  }, []);

  // عداد تنازلي لصلاحية الكود
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (bot?.pair_code && countdown > 0 && step === "linking") {
      timer = setInterval(() => {
        setCountdown((c) => (c <= 1 ? 0 : c - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [bot?.pair_code, countdown, step]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const failLink = useCallback((message: string) => {
    stopPoll();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setError(message);
    setStep("error");
  }, []);

  const refresh = useCallback(
    async (num: string, silent = false) => {
      try {
        const clean = num.replace(/\D/g, "");
        const res = await fetch(`/api/connect?number=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (!data.ok) {
          if (!silent) failLink(data.error || "لم نجد بوتاً لهذا الرقم");
          return;
        }

        setBot(data.bot);

        if (data.bot.status === "connected") {
          stopPoll();
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setStep("connected");
        } else if (data.bot.status === "failed") {
          failLink(data.bot.last_error || "تعذّر إكمال الاتصال. تحقق من اتصال WhatsApp وحاول مرة أخرى.");
        }
      } catch {
        if (!silent) failLink("تعذّر الاتصال بالخادم");
      }
    },
    [failLink]
  );

  async function start(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanNumber = number.replace(/\D/g, "");
    if (!cleanNumber || cleanNumber.length < 9) {
      setError("يرجى إدخال رقم واتساب صالح مع مفتاح الدولة (مثال: 967772847565)");
      setStep("error");
      return;
    }

    setError(null);
    setLoading(true);
    setCountdown(120);

    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: cleanNumber, action: "start", name: botName }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "تعذّر بدء الربط");
        setStep("error");
        setLoading(false);
        return;
      }

      setBot(data.bot);
      setStep("linking");

      if (data.bot.status === "connected") {
        setStep("connected");
      } else {
        stopPoll();
        pollRef.current = setInterval(() => refresh(cleanNumber, true), 1800);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          failLink("انتهت مهلة انتظار الربط. تأكد من إدخال الكود في واتساب وحاول مرة أخرى.");
        }, LINK_TIMEOUT_MS);
      }
    } catch {
      setError("تعذّر الاتصال بالخادم");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  const copyCode = () => {
    if (!bot?.pair_code) return;
    const raw = bot.pair_code.replace(/[^A-Za-z0-9]/g, "");
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <Particles count={24} />

      <div className="relative z-10 w-full max-w-lg">
        <Link href="/" className="mb-6 inline-block text-sm text-muted hover:text-white transition">
          → رجوع للرئيسية
        </Link>

        <div style={{ animation: "fade-up 0.5s ease both" }}>
          <h1 className="cyber-title text-3xl font-extrabold text-white">ربط واتسابك سحابياً</h1>
          <p className="mt-2 text-sm text-muted">احصل على كود الاقتران المباشر واربط بوتك خلال ثوانٍ.</p>
        </div>

        {step === "input" && (
          <form
            onSubmit={start}
            className="card glass mt-6 space-y-5 p-6 sm:p-8"
            style={{ animation: "fade-up 0.5s ease 0.15s both" }}
          >
            {/* مؤشر الخطوات */}
            <div className="flex items-center justify-center gap-2 text-xs font-medium">
              <span className="flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-accent font-bold">
                <b>١</b> رقمك
              </span>
              <span className="h-px w-6 bg-border" />
              <span className="flex items-center gap-1 rounded-full px-3 py-1 text-muted">
                <b>٢</b> الكود
              </span>
              <span className="h-px w-6 bg-border" />
              <span className="rounded-full px-3 py-1 text-muted">٣ متصل</span>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="num">
                رقم الواتساب مع المفتاح الدولي (International Format)
              </label>
              <input
                id="num"
                dir="ltr"
                className="input text-left font-mono text-base"
                inputMode="tel"
                placeholder="967772847565"
                value={number}
                onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
                required
              />
              <span className="mt-1 block text-xs text-muted">
                مثال: 967 لليمن، 966 للسعودية، 20 لمصر (بدون أصفار أو فواصل)
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="bname">
                اسم البوت <span className="font-normal text-muted">(اختياري)</span>
              </label>
              <input
                id="bname"
                className="input"
                placeholder="بوتي الذكي"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading || !number} className="btn-primary w-full py-3.5 text-base font-bold shadow-lg shadow-accent/25">
              {loading ? "جارٍ تجهيز كود الاقتران..." : "احصل على كود الربط 🚀"}
            </button>

            <p className="text-center text-xs text-muted">
              🔒 اتصال مباشر عبر خوادم واتساب الرسمية — بدون تطبيقات خارجية وبدون حظر.
            </p>
          </form>
        )}

        {step === "error" && (
          <div className="card glass mt-6 space-y-4 border-blood/40 p-6 text-center" style={{ animation: "pop 0.4s ease both" }}>
            <div className="text-4xl">⚠️</div>
            <p className="text-sm text-red-300">{error || "خطأ غير متوقع، حاول مرة أخرى"}</p>
            <button
              type="button"
              onClick={() => {
                stopPoll();
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = null;
                }
                setError(null);
                setStep("input");
              }}
              className="btn-primary w-full"
            >
              🔄 حاول مرة أخرى الآن
            </button>
          </div>
        )}

        {step === "linking" && bot && (
          <div className="card glass mt-6 flex flex-col items-center gap-5 p-6 sm:p-8 text-center" style={{ animation: "fade-up 0.4s ease both" }}>
            <span
              className={`rounded-full px-3.5 py-1 text-xs font-bold ${
                bot.status === "connected"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-accent/15 text-accent border border-accent/30"
              }`}
            >
              {statusLabels[bot.status] || "بانتظار إدخال الكود..."}
            </span>

            <div className="flex flex-col items-center gap-5 w-full">
              {bot.pair_code ? (
                <div className="flex w-full flex-col items-center gap-4">
                  <p className="text-sm font-medium text-fg">أدخل هذا الكود في تطبيق واتساب بجوالك:</p>

                  {/* مربعات الكود الفاخرة مع الفاصل النيوني */}
                  <div dir="ltr" className="flex items-center justify-center gap-1.5 sm:gap-2.5 select-all my-2">
                    {bot.pair_code.replace(/[^A-Za-z0-9]/g, "").split("").map((char, index) => (
                      <div key={index} className="flex items-center">
                        {index === 4 && (
                          <span className="text-2xl sm:text-3xl font-black text-accent mx-1 sm:mx-2">-</span>
                        )}
                        <span className="grid h-12 w-9 sm:h-16 sm:w-13 place-items-center rounded-xl sm:rounded-2xl border-2 border-accent/70 bg-elevated font-mono text-2xl sm:text-3xl font-black text-white shadow-[0_0_15px_rgba(0,212,255,0.35)]">
                          {char}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* شريط الصلاحية والنسخ */}
                  <div className="w-full max-w-xs flex items-center justify-between text-xs text-muted">
                    <span>صلاحية الكود:</span>
                    <span className="font-mono font-bold text-accent">{countdown} ثانية</span>
                  </div>

                  <button
                    type="button"
                    onClick={copyCode}
                    className={`rounded-xl px-6 py-3 text-sm font-bold transition shadow-lg ${
                      copied ? "bg-emerald-500 text-black shadow-emerald-500/25" : "bg-accent text-accent-fg hover:brightness-110 shadow-accent/25"
                    }`}
                  >
                    {copied ? "تم النسخ بنجاح ✓" : "📋 نسخ الكود بنقرة واحدة"}
                  </button>

                  <div className="rounded-xl border border-border/70 bg-surface/50 p-4 text-start text-xs text-muted w-full space-y-1.5 mt-2">
                    <p className="font-bold text-fg">خطوات الإدخال:</p>
                    <p>1. افتح واتساب ← الإعدادات (Settings) ← الأجهزة المرتبطة (Linked Devices).</p>
                    <p>2. اضغط <b>ربط جهاز</b> ← ثم <b>الربط برقم الهاتف (Link with phone number)</b>.</p>
                    <p>3. ألصق الكود أعلاه وسيتم الاتصال تلقائياً فوراً!</p>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center gap-3">
                  <div className="relative flex h-12 w-12 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40"></span>
                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent"></span>
                  </div>
                  <p className="animate-pulse text-sm text-muted">جارٍ طلب كود الربط من خوادم واتساب…</p>
                </div>
              )}

              {bot.qr && !bot.pair_code && (
                <div className="flex flex-col items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bot.qr} alt="QR" width={220} height={220} className="rounded-xl bg-white p-3 shadow-lg" />
                  <p className="text-xs text-muted">امسح الرمز بكاميرا واتساب من الأجهزة المرتبطة</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "connected" && bot && (
          <div className="card glass mt-6 space-y-5 p-8 text-center" style={{ animation: "pop 0.4s ease both" }}>
            <div
              className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 text-3xl border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
            >
              ✓
            </div>
            <h2 className="text-2xl font-black text-white">تم ربط البوت بنجاح!</h2>
            <p className="text-sm text-muted">
              بوتك متصل الآن بالرقم <span dir="ltr" className="font-mono font-bold text-emerald-400">+{bot.linked_number || number}</span>.
            </p>
            <p className="text-xs text-muted">
              أرسلنا لك رسالة في محادثتك بواتساب تحتوي على كلمة السر الخاصة بإعداداتك.
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <Link
                href={`/setting?number=${encodeURIComponent(bot.linked_number || number)}${bot.secret ? `&secret=${encodeURIComponent(bot.secret)}` : ""}`}
                className="btn-primary w-full py-3.5 text-base font-bold shadow-lg shadow-accent/25"
              >
                فتح المميزات ولوحة التحكم 🚀
              </Link>
              <button onClick={() => window.location.reload()} className="rounded-xl px-4 py-2 text-xs text-muted hover:text-white transition">
                ربط رقم آخر
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
