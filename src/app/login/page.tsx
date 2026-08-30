"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CyberButton, { Particles } from "@/components/ui/cyber-button";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  async function handleForgot() {
    if (!email.trim()) {
      toast("اكتب بريدك أولاً ثم اضغط نسيت كلمة السر");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/login/step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "reset-check" }),
      });
    } catch {}
    setLoading(false);
    // رابط استعادة كلمة السر عبر Supabase
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error: rErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/auth/callback?next=%2Fdashboard",
    });
    if (rErr) {
      setError("تعذّر إرسال الرابط، تأكد من البريد وحاول مجدداً");
      return;
    }
    toast("أرسلنا لك رابط استعادة كلمة السر 👈 تحقق من بريدك");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login/step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "حدث خطأ بسيط، حاول مرة أخرى");
        setShake(true);
        setTimeout(() => setShake(false), 450);
        return;
      }
      setStep("otp");
      toast("أرسلنا رمز التحقق إلى واتسابك 👈 أدخله");
    } catch {
      setError("حدث خطأ، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login/step2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, code: otp }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "الرمز غير صحيح");
        setShake(true);
        setTimeout(() => setShake(false), 450);
        return;
      }
      toast("أهلاً بعودتك 👋");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("حدث خطأ، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center overflow-hidden px-4 py-12">
      <Particles />
      <div className="relative z-10 text-center">
        <div style={{ animation: "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both, pop 0.5s ease 0.1s both" }}>
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-accent to-cyber text-3xl shadow-lg shadow-accent/40" style={{ animation: "glow-pulse 2.5s infinite" }}>
            💀
          </div>
          <h1 className="cyber-title text-3xl font-bold">M aknoon</h1>
          <p className="mt-2 text-sm text-muted">نظام الأمن السيبراني — سجّل الدخول لإدارة بوتاتك.</p>
        </div>

        {step === "otp" ? (
          <form onSubmit={handleVerify} className="card glass mt-8 space-y-4 p-6 text-right" style={{ animation: "fade-up 0.4s ease both" }}>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="otp">رمز التحقق (وصل واتسابك)</label>
              <input id="otp" dir="ltr" inputMode="numeric" className={`input text-center text-2xl tracking-[0.5em] ${shake ? "input-error" : ""}`}
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} required placeholder="000000" />
            </div>
            {error && <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            <CyberButton type="submit" status={loading ? "loading" : "idle"} loadingLabel="جارٍ التحقق..." className="w-full">
              تأكيد الرمز
            </CyberButton>
            <button type="button" onClick={() => { setStep("form"); setOtp(""); setError(null); }}
              className="w-full text-center text-sm text-muted hover:text-white">← العودة لتسجيل الدخول</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="card glass mt-8 space-y-4 p-6 text-right" style={{ animation: "fade-up 0.6s ease 0.2s both" }}>
            <div className={shake ? "space-y-4" : "space-y-4"}>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="email">البريد الإلكتروني</label>
                <input id="email" type="email" dir="ltr" className={`input ${shake ? "input-error" : ""}`} value={email} required
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="password">كلمة المرور</label>
                <input id="password" type="password" dir="ltr" className={`input ${shake ? "input-error" : ""}`} value={password} required
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={handleForgot} disabled={loading}
                className="text-sm font-medium text-accent hover:underline disabled:opacity-50">
                نسيت كلمة السر؟
              </button>
            </div>

            {error && <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-300" style={{ animation: "fade-in 0.3s ease" }}>{error}</p>}

            <CyberButton type="submit" status={loading ? "loading" : "idle"} loadingLabel="جارٍ إرسال الرمز..." className="w-full">
              تسجيل الدخول
            </CyberButton>
            <p className="text-center text-xs text-muted">🔒 نتحقق من هويتك برمز يُرسل لواتسابك في كل دخول.</p>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted" style={{ animation: "fade-in 0.5s ease 0.4s both" }}>
          ليس لديك حساب؟{" "}
          <Link href="/signup" className="font-semibold text-accent hover:underline">أنشئ حساباً مجانياً</Link>
        </p>
      </div>
    </main>
  );
}
