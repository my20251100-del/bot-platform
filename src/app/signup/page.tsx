"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import CyberButton, { Particles } from "@/components/ui/cyber-button";

function SignupForm() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState(
    () => searchParams.get("ref") ?? ""
  );
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (!data.ok) {
        setError(data.error || "تعذّر إنشاء الحساب");
        return;
      }
      setStep("otp");
      toast("أرسلنا رمز التحقق إلى واتسابك 👈 تحقق منه");
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
      if (!data.ok) {
        setError(data.error || "الرمز غير صحيح");
        return;
      }
      toast("تم تفعيل حسابك 🎉 سجّل دخولك");
      window.location.href = "/login";
    } catch {
      setError("حدث خطأ، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  if (step === "otp") {
    return (
      <main className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center overflow-hidden px-4 py-12">
        <Particles />
        <div className="relative z-10">
          <h1 className="text-center text-3xl font-bold">تحقق من واتسابك</h1>
          <p className="mt-2 text-center text-sm text-muted">
            أرسلنا رمزاً من 6 أرقام إلى <span dir="ltr" className="font-semibold">+{phone}</span> — أدخله هنا
          </p>
          <form onSubmit={handleVerify} className="card glass mt-8 space-y-4 p-6">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="otp">رمز التحقق</label>
            <input id="otp" dir="ltr" inputMode="numeric" className="input text-center text-2xl tracking-[0.5em]"
              value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} required placeholder="000000" />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "جارٍ التحقق..." : "تأكيد الرمز"}
            </button>
          </form>
          {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center overflow-hidden px-4 py-12">
      <Particles />
      <div className="relative z-10">
        <h1 className="text-center text-3xl font-bold">أنشئ حسابك</h1>
        <p className="mt-2 text-center text-sm text-muted">
          مجاني للأبد — سنرسل رمز تحقق لواتسابك لتأكيد الحساب.
        </p>
        <form onSubmit={handleSubmit} className="card glass mt-8 space-y-4 p-6 text-right">
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="name">الاسم الكامل</label>
            <input id="name" className="input" value={fullName} required
              onChange={(e) => setFullName(e.target.value)} placeholder="محمد أحمد" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="email">البريد الإلكتروني</label>
            <input id="email" type="email" dir="ltr" className="input" value={email} required
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="password">كلمة المرور</label>
            <input id="password" type="password" dir="ltr" className="input" value={password} required minLength={6}
              onChange={(e) => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="phone">رقم واتساب (يصل إليه رمز التحقق)</label>
            <input id="phone" type="tel" dir="ltr" className="input" value={phone} required
              onChange={(e) => setPhone(e.target.value)} placeholder="9677xxxxxxxx" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="ref">كود الإحالة <span className="font-normal text-muted">(اختياري)</span></label>
            <input id="ref" dir="ltr" className="input" value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)} placeholder="مثال: a1b2c3d4" />
          </div>

          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

          <CyberButton type="submit" status={loading ? "loading" : "idle"} loadingLabel="جارٍ الإرسال..." className="w-full">
            إنشاء حساب
          </CyberButton>
          <p className="text-center text-xs text-muted">🔒 نرسل رمزاً لرقمك، دون الحاجة لتأكيد بريد إلكتروني.</p>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-accent hover:underline">سجّل الدخول</Link>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
