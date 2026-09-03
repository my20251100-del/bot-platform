"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export default function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState(
    () => searchParams.get("ref") ?? ""
  );
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "otp") return;
    if (countdown <= 0) return;

    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [step, countdown]);

  async function resendOtp() {
    if (loading || resendLoading || countdown > 0) return;
    setError(null);
    setResendLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          phone,
          referral_code: referralCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || "تعذّر إعادة إرسال الرمز");
        return;
      }
      if (data?.dev_otp) {
        setDevOtp(data.dev_otp);
        setOtp(data.dev_otp);
      }
      setOtp("");
      setCountdown(60);
      toast(data.message || "تم إرسال رمز جديد إلى بريدك الإلكتروني");
    } catch {
      setError("حدث خطأ أثناء إعادة إرسال الرمز");
    } finally {
      setResendLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    setError(null);
    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=%2Fdashboard`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (e: any) {
      setLoading(false);
      const msg = String(e?.message || "");
      if (/provider.*not enabled|unsupported provider/i.test(msg)) {
        setError("إنشاء الحساب عبر Google/GitHub غير مفعّل في إعدادات Supabase حالياً. يرجى إكمال النموذج بالبريد الإلكتروني وكلمة المرور.");
      } else {
        setError(e?.message || `تعذّر إنشاء الحساب عبر ${provider === "google" ? "Google" : "GitHub"}`);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          phone,
          referral_code: referralCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || "تعذّر إنشاء الحساب");
        return;
      }
      if (data?.dev_otp) {
        setDevOtp(data.dev_otp);
        setOtp(data.dev_otp);
      } else {
        setOtp("");
      }
      setCountdown(60);
      toast(data.message || "أرسلنا رمز التحقق إلى بريدك الإلكتروني 👈 تحقق منه");
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
      const res = await fetch("/api/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, code: otp }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || "الرمز غير صحيح");
        return;
      }
      toast("تم تفعيل حسابك 🎉 سجّل دخولك");
      router.push("/login");
    } catch {
      setError("حدث خطأ، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = `w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20`;

  if (step === "otp") {
    return (
      <>
        <div className="mb-8 text-center md:hidden">
          <div className="pointer-events-none mx-auto h-42 w-42">
            <div className="grid h-42 w-42 place-items-center rounded-3xl bg-gradient-to-br from-accent/20 to-cyber/20 text-6xl shadow-lg shadow-accent/30" style={{ animation: "glow-pulse 2.5s infinite" }}>
              ✉️
            </div>
          </div>
        </div>
        <div className="card p-5 sm:p-10 reveal w-full">
          <h1 className="text-2xl sm:text-3xl font-bold">تحقق من بريدك الإلكتروني</h1>
          <p className="mt-1.5 text-sm sm:text-base text-muted">
            أرسلنا رمز التحقق المكون من 6 أرقام إلى بريدك <span dir="ltr" className="font-semibold text-accent">{email}</span> — أدخله للمتابعة
          </p>

          {devOtp && (
            <div className="mt-4 rounded-xl border border-accent/40 bg-accent/10 p-3.5 text-center">
              <p className="text-xs text-muted mb-1">✉️ رمز التحقق لبريدك الإلكتروني (تعبئة فورية):</p>
              <button
                type="button"
                onClick={() => setOtp(devOtp)}
                className="font-mono text-2xl font-bold tracking-[0.3em] text-accent hover:underline"
              >
                {devOtp}
              </button>
              <p className="text-[11px] text-accent/80 mt-1">تمت تعبئته تلقائياً أدناه لتسجيل الدخول السريع 🚀</p>
            </div>
          )}

          <form onSubmit={handleVerify} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted" htmlFor="otp">رمز التحقق</label>
              <input id="otp" dir="ltr" inputMode="numeric" placeholder="000000"
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required className={`${inputCls} text-center text-2xl tracking-[0.5em]`} />
            </div>
            {error && <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-300" style={{ animation: "fade-in 0.3s ease" }}>{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2">
              {loading ? "جارٍ التحقق..." : "تأكيد الرمز"}
            </button>

            <div className="flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                onClick={resendOtp}
                disabled={resendLoading || countdown > 0 || loading}
                className="text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resendLoading ? "جارٍ إعادة الإرسال..." : countdown > 0 ? `إعادة الإرسال خلال ${countdown}s` : "إعادة إرسال الرمز"}
              </button>

              <button type="button" onClick={() => { setStep("form"); setOtp(""); setError(null); setCountdown(60); }}
                className="text-muted hover:text-white">← العودة</button>
            </div>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-8 text-center md:hidden">
        <div className="pointer-events-none mx-auto h-42 w-42">
          <div className="grid h-42 w-42 place-items-center rounded-3xl bg-gradient-to-br from-accent/20 to-cyber/20 text-6xl shadow-lg shadow-accent/30" style={{ animation: "glow-pulse 2.5s infinite" }}>
            🚀
          </div>
        </div>
      </div>
      <div className="card p-5 sm:p-10 reveal w-full">
        <h1 className="text-2xl sm:text-3xl font-bold">أنشئ حسابك</h1>
        <p className="mt-1.5 text-sm sm:text-base text-muted">
          مجاني للأبد — سنرسل رمز تحقق إلى بريدك الإلكتروني لتأكيد الحساب.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted" htmlFor="name">الاسم الكامل</label>
            <input id="name" placeholder="محمد أحمد" value={fullName} required
              onChange={(e) => setFullName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted" htmlFor="email">البريد الإلكتروني</label>
            <input id="email" type="email" dir="ltr" placeholder="you@example.com" value={email} required
              onChange={(e) => setEmail(e.target.value)} autoComplete="username" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted" htmlFor="password">كلمة المرور</label>
            <div className="relative">
              <input id="password" type={showPw ? "text" : "password"} dir="ltr" placeholder="6 أحرف على الأقل"
                value={password} required minLength={6} autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pe-12`} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute inset-y-0 end-0 flex items-center px-4 text-muted transition hover:text-fg focus:outline-none"
                aria-label={showPw ? "إخفاء" : "إظهار"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showPw ? (<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>) : (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>)}
                </svg>
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted" htmlFor="phone">رقم واتساب (يصل إليه رمز التحقق)</label>
            <input id="phone" type="tel" dir="ltr" placeholder="9677xxxxxxxx" value={phone} required
              onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted" htmlFor="ref">كود الإحالة <span className="font-normal text-muted/70">(اختياري)</span></label>
            <input id="ref" dir="ltr" placeholder="مثال: a1b2c3d4" value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)} className={inputCls} />
          </div>
          {error && <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-300" style={{ animation: "fade-in 0.3s ease" }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2">
            {loading ? "جارٍ الإرسال..." : "إنشاء حساب"}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase text-muted">
              <span className="bg-surface px-2">أو</span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOAuth("google")}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg transition hover:border-accent/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden="true">G</span>
              Google
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOAuth("github")}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg transition hover:border-accent/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden="true">◉</span>
              GitHub
            </button>
          </div>

          <p className="text-center text-xs text-muted">🔒 نرسل رمزاً لرقمك، دون الحاجة لتأكيد بريد إلكتروني.</p>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">سجّل الدخول</Link>
        </p>
      </div>
    </>
  );
}
