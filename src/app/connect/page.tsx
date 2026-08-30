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
};

const statusLabels: Record<string, string> = {
  connected: "متصل ✓",
  pending: "بانتظار الربط...",
  disconnected: "غير متصل",
};

export default function ConnectPage() {
  const [number, setNumber] = useState("");
  const [botName, setBotName] = useState("");
  const [step, setStep] = useState<"input" | "linking" | "connected" | "error">("input");
  const [bot, setBot] = useState<BotState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const refresh = useCallback(async (num: string, silent = false) => {
    try {
      const res = await fetch(`/api/connect?number=${encodeURIComponent(num)}`);
      const data = await res.json();
      if (!data.ok) { if (!silent) { stopPoll(); setError(data.error || "لم نجد بوتاً لهذا الرقم"); setStep("error"); } return; }
      setBot(data.bot);
      if (data.bot.status === "connected") {
        stopPoll();
        setStep("connected");
      }
    } catch {
      if (!silent) { setError("تعذّر الاتصال"); setStep("error"); }
    }
  }, []);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1) إنشاء/تأكيد وجود البوت لهذا الرقم (Supabase) كما كان سابقاً
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, action: "start", name: botName }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "تعذّر بدء الربط");
        setStep("error");
        setLoading(false);
        return;
      }

      let nextBot = data.bot;

      // 2) طلب كود الإقران من الـ Backend (Express whatsapp-web.js)
      if (nextBot?.id && nextBot.link_method === "pair_code") {
        try {
          const { requestPairing } = await import("@/lib/backend");
          const pair = await requestPairing(nextBot.id, number);
          if (pair.pairingCode) {
            nextBot = { ...nextBot, pair_code: pair.pairingCode, isPending: true };
          } else if (pair.error) {
            console.warn("[pair]", pair.error);
          }
        } catch (pairErr) {
          console.warn("[pair] backend غير متاح:", pairErr);
        }
      }

      setBot(nextBot);
      setStep("linking");
      if (nextBot.status === "connected") setStep("connected");
      else {
        stopPoll();
        pollRef.current = setInterval(() => refresh(number, true), 2000);
      }
    } catch {
      setError("تعذّر الاتصال بالخادم");
      setStep("error");
    }
    setLoading(false);
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <Particles count={24} />

      <div className="relative z-10 w-full max-w-lg">
        <Link href="/start" className="mb-6 inline-block text-sm text-muted hover:text-white">→ رجوع للبداية</Link>

        <div style={{ animation: "fade-up 0.5s ease both" }}>
          <h1 className="cyber-title text-3xl font-bold">ربط واتسابك</h1>
          <p className="mt-2 text-sm text-muted">أدخل رقمك لربط بوت M aknoon بحسابك.</p>
        </div>

        {step === "input" && (
          <form onSubmit={start} className="card glass mt-6 space-y-4 p-6" style={{ animation: "fade-up 0.5s ease 0.15s both" }}>
            {/* مؤشر الخطوات */}
            <div className="flex items-center justify-center gap-2 text-xs font-medium">
              <span className="flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-accent"><b>١</b> رقمك</span>
              <span className="h-px w-6 bg-border" />
              <span className="flex items-center gap-1 rounded-full px-3 py-1 text-muted"><b>٢</b> اربط</span>
              <span className="h-px w-6 bg-border" />
              <span className="rounded-full px-3 py-1 text-muted">٣ خلاص</span>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="num">رقم الواتساب (بالتنسيق الدولي)</label>
              <input id="num" dir="ltr" className="input text-left" inputMode="tel" placeholder="+967771234567"
                value={number} onChange={(e) => setNumber(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="bname">
                اسم البوت <span className="font-normal text-muted">(اختياري — يظهر في البداية فقط)</span>
              </label>
              <input id="bname" className="input" placeholder="بوتي" value={botName}
                onChange={(e) => setBotName(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "جارٍ إنشاء البوت وربطه..." : "أنشئ بوتي وابدأ الربط"}
            </button>
            <p className="text-center text-xs text-muted">
              لا حاجة لإنشاء حساب — بوتك يُنشأ تلقائياً برقمك ويصلك كل شيء على الواتساب.
            </p>
          </form>
        )}

        {step === "error" && (
          <div className="card glass mt-6 space-y-4 border-blood/40 p-6 text-center" style={{ animation: "pop 0.4s ease both" }}>
            <div className="text-4xl">🔄</div>
            <p className="text-sm text-red-300">{error || "خطأ غير متوقع، حاول مرة أخرى"}</p>
            <Link href="/connect" className="btn-primary w-full">حاول مرة أخرى</Link>
          </div>
        )}

        {step === "linking" && bot && (
          <div className="card glass mt-6 flex flex-col items-center gap-4 p-6 text-center" style={{ animation: "fade-up 0.4s ease both" }}>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${bot.status === "connected" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
              {statusLabels[bot.status]}
            </span>

            {bot.qr ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bot.qr} alt="QR" width={240} height={240} className="rounded-xl bg-white p-3" />
                <p className="text-sm text-muted">واتساب ← الإعدادات ← الأجهزة المرتبطة ← ربط جهاز ← امسح الرمز</p>
              </>
            ) : bot.pair_code ? (
              <>
                <p className="text-sm text-muted">أدخل هذا الكود في جوالك:</p>
                <p dir="ltr" className="font-mono text-4xl font-bold tracking-[0.35em] text-accent">{bot.pair_code}</p>
                <p className="text-sm text-muted">واتساب ← الإعدادات ← الأجهزة المرتبطة ← ربط برقم الهاتف</p>
              </>
            ) : (
              <p className="animate-pulse text-sm text-muted">جارٍ توليد الكود…</p>
            )}
          </div>
        )}

        {step === "connected" && bot && (
          <div className="card glass mt-6 space-y-4 p-6 text-center" style={{ animation: "pop 0.4s ease both" }}>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-3xl" style={{ animation: "ring-pulse 0.6s ease-out forwards" }}>
              ✓
            </div>
            <h2 className="text-xl font-bold text-emerald-400">تم ربط البوت بنجاح!</h2>
            <p className="text-sm text-muted">
              بوت <b>{bot.name}</b> متصل الآن بالرقم <span dir="ltr">{bot.linked_number}</span>.
            </p>
            <p className="text-sm text-muted">
              أرسلنا لك رسالة في محادثة البوت فيها <b>كلمة السر</b> الخاصة بك لفتح المميزات.
            </p>
            <div className="flex flex-col gap-3 pt-1">
              <Link href="/setting" className="btn-primary w-full">فتح المميزات (أدخل رقمك وكلمة السر)</Link>
              <button onClick={() => window.location.reload()} className="rounded-xl px-4 py-3 text-sm text-muted hover:text-white">
                ربط رقم آخر
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
