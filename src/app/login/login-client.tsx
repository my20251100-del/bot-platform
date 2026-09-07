"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Particles } from "@/components/ui/cyber-button";
import { useToast } from "@/components/ui/toast";

export default function LoginClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "otp" | "forgot_request" | "forgot_confirm">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [devResetOtp, setDevResetOtp] = useState<string | null>(null);

  async function handleForgotRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("يرجى كتابة بريدك الإلكتروني");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || "تعذر إرسال رمز الاستعادة");
        setShake(true);
        setTimeout(() => setShake(false), 450);
        return;
      }
      setStep("forgot_confirm");
      if (data?.dev_otp) {
        setDevResetOtp(data.dev_otp);
        setResetCode(data.dev_otp);
      }
      toast(data?.message || "أرسلنا لك رمز التحقق 👈 أدخله هنا");
    } catch {
      setError("حدث خطأ في الاتصال، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!resetCode.trim() || !newPassword.trim()) {
      setError("يرجى إدخال رمز التحقق وكلمة المرور الجديدة");
      return;
    }
    if (newPassword.trim().length < 6) {
      setError("يجب أن تتكون كلمة المرور من 6 خانات على الأقل");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: resetCode.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || "تعذر إعادة تعيين كلمة المرور");
        setShake(true);
        setTimeout(() => setShake(false), 450);
        return;
      }
      toast("تم تعيين كلمة المرور بنجاح! مرحباً بك 👋");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("حدث خطأ، حاول مجدداً");
    } finally {
      setLoading(false);
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
        setError("تسجيل الدخول عبر Google/GitHub غير مفعّل في إعدادات Supabase حالياً. يرجى استخدام البريد الإلكتروني وكلمة المرور.");
      } else {
        setError(e?.message || `تعذّر تسجيل الدخول عبر ${provider === "google" ? "Google" : "GitHub"}`);
      }
    }
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
      if (!data?.success) {
        setError(data?.message || "حدث خطأ بسيط، حاول مرة أخرى");
        setShake(true);
        setTimeout(() => setShake(false), 450);
        return;
      }
      setStep("otp");
      if (data?.dev_otp) {
        setDevOtp(data.dev_otp);
        setOtp(data.dev_otp);
      } else {
        setOtp("");
      }
      toast(data.message || "أرسلنا رمز التحقق إلى بريدك الإلكتروني 👈 أدخله");
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
      if (!data?.success) {
        setError(data?.message || data?.error || "الرمز غير صحيح");
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

  const inputCls = `w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20 ${shake ? "border-blood !ring-blood/30" : ""}`;

  return (
    <>
      {/* البصمة البصرية (يسار في RTL — تظهر فقط على الجوال) */}
      <div className="mb-8 text-center md:hidden">
        <div className="pointer-events-none mx-auto h-42 w-42">
          <Particles count={20} />
          <div className="grid h-42 w-42 place-items-center rounded-3xl bg-gradient-to-br from-accent/20 to-cyber/20 text-6xl shadow-lg shadow-accent/30" style={{ animation: "glow-pulse 2.5s infinite" }}>
            🤖
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-10 reveal w-full">
        <h1 className="text-2xl sm:text-3xl font-bold">مرحباً بعودتك</h1>
        <p className="mt-1.5 text-sm sm:text-base text-muted">سجّل الدخول لإدارة بوتاتك.</p>

        <div className="mt-6 w-full">
          {step === "otp" ? (
            <form onSubmit={handleVerify} className="space-y-4">
              {devOtp && (
                <div className="rounded-xl border border-accent/40 bg-accent/10 p-3.5 text-center">
                  <p className="text-xs text-muted mb-1">💡 رمز التحقق السريع (وضع التجربة):</p>
                  <button
                    type="button"
                    onClick={() => setOtp(devOtp)}
                    className="font-mono text-2xl font-bold tracking-[0.3em] text-accent hover:underline"
                  >
                    {devOtp}
                  </button>
                  <p className="text-[11px] text-accent/80 mt-1">تمت تعبئته تلقائياً في الخانة أدناه 🚀</p>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">رمز التحقق (وصل إلى بريدك أو واتسابك)</label>
                <input
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  className={`${inputCls} text-center text-2xl tracking-[0.5em]`}
                />
              </div>
              {error && <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-300" style={{ animation: "fade-in 0.3s ease" }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                {loading ? "جارٍ التحقق..." : "تأكيد الرمز"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("form"); setOtp(""); setError(null); }}
                className="w-full text-center text-sm text-muted hover:text-white"
              >
                ← العودة لتسجيل الدخول
              </button>
            </form>
          ) : step === "forgot_request" ? (
            <form onSubmit={handleForgotRequest} className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-fg">استعادة كلمة المرور</h2>
                <p className="text-xs text-muted mt-1">أدخل بريدك الإلكتروني لإرسال رمز التحقق وتعيين كلمة سر جديدة فوراً.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">البريد الإلكتروني</label>
                <input
                  type="email"
                  dir="ltr"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  className={inputCls}
                />
              </div>
              {error && <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-300" style={{ animation: "fade-in 0.3s ease" }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                {loading ? "جارٍ الإرسال..." : "إرسال رمز التحقق 🚀"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("form"); setError(null); }}
                className="w-full text-center text-sm text-muted hover:text-white"
              >
                ← العودة لتسجيل الدخول
              </button>
            </form>
          ) : step === "forgot_confirm" ? (
            <form onSubmit={handleForgotConfirm} className="space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-fg">تعيين كلمة المرور الجديدة</h2>
                <p className="text-xs text-muted mt-1">أدخل رمز التحقق الذي وصلك، ثم اكتب كلمة سرك الجديدة.</p>
              </div>
              {devResetOtp && (
                <div className="rounded-xl border border-accent/40 bg-accent/10 p-3.5 text-center">
                  <p className="text-xs text-muted mb-1">💡 رمز التحقق السريع (وضع التجربة):</p>
                  <button
                    type="button"
                    onClick={() => setResetCode(devResetOtp)}
                    className="font-mono text-2xl font-bold tracking-[0.3em] text-accent hover:underline"
                  >
                    {devResetOtp}
                  </button>
                  <p className="text-[11px] text-accent/80 mt-1">تمت تعبئته تلقائياً في الخانة أدناه 🚀</p>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">رمز التحقق (6 أرقام)</label>
                <input
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="000000"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  className={`${inputCls} text-center text-2xl tracking-[0.5em]`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  dir="ltr"
                  placeholder="•••••••• (6 خانات على الأقل)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              {error && <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-300" style={{ animation: "fade-in 0.3s ease" }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور والدخول 🚀"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("forgot_request"); setError(null); }}
                className="w-full text-center text-sm text-muted hover:text-white"
              >
                ← إعادة طلب رمز جديد
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">البريد الإلكتروني أو رقم الهاتف</label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="you@example.com أو 967xxxxxxxxx"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    dir="ltr"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={`${inputCls} pe-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute inset-y-0 end-0 flex items-center px-4 text-muted transition hover:text-fg focus:outline-none"
                    aria-label={showPw ? "إخفاء" : "إظهار"}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {showPw ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              <div className="text-end">
                <button
                  type="button"
                  onClick={() => { setError(null); setStep("forgot_request"); }}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  نسيت كلمة السر؟
                </button>
              </div>
              {error && <p className="rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-red-300" style={{ animation: "fade-in 0.3s ease" }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                {loading ? "جارٍ إرسال الرمز..." : "تسجيل الدخول"}
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

              <p className="mt-1 text-center text-xs text-muted">🔒 نتحقق من هويتك برمز يُرسل لبريدك الإلكتروني في كل دخول.</p>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          ليس لديك حساب؟{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">أنشئ حساباً مجانياً</Link>
        </p>
      </div>
    </>
  );
}
