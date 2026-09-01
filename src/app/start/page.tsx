"use client";

import Link from "next/link";
import { Particles } from "@/components/ui/cyber-button";

export default function StartPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">
      <Particles count={30} />

      <div className="relative z-10 w-full max-w-xl">
        <div style={{ animation: "fade-up 0.5s ease both, pop 0.5s ease 0.15s both" }}>
          <div
            className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-accent to-cyber text-4xl shadow-lg shadow-accent/50"
            style={{ animation: "glow-pulse 2.5s infinite" }}
          >
            🤖
          </div>
          <h1 className="cyber-title text-4xl font-bold sm:text-5xl">بوت برو</h1>
          <p className="mt-3 text-muted">أتمتة واتساب مبسّطة — اربط وانشر خلال 30 ثانية</p>
        </div>

        <div
          className="card glass mt-10 space-y-3 p-6 text-right"
          style={{ animation: "fade-up 0.5s ease 0.3s both" }}
        >
          {[
            { icon: "👁️", t: "مضاد العرض مرة واحدة", d: "شاهد الوسائط المقيدة بسهولة دون أن يعرف المرسل." },
            { icon: "🛡️", t: "مضاد الحذف", d: "تتبع الرسائل المحذوفة واحتفظ بها حتى بعد حذفها من الجميع." },
            { icon: "🔐", t: "التحكم بالخصوصية", d: "تحكم كامل بظهورك: علامات القراءة، حالة الكتابة، وآخر ظهور." },
            { icon: "📥", t: "أدوات الوسائط", d: "حمّل الوسائط من المنصات الاجتماعية مباشرة عبر بوتك." },
            { icon: "❤️", t: "تفاعل تلقائي", d: "تفاعلات آلية مع الحالات والرسائل بالإيموجي الذي تختاره." },
          ].map((f, i) => (
            <div
              key={f.t}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-elevated/60 p-3.5"
              style={{ animation: `fade-up 0.4s ease ${0.4 + i * 0.08}s both` }}
            >
              <span className="text-2xl">{f.icon}</span>
              <div>
                <div className="font-semibold">{f.t}</div>
                <div className="text-sm text-muted">{f.d}</div>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/connect"
          className="btn-primary mt-8 w-full !py-4 text-lg"
          style={{ animation: "fade-up 0.5s ease 0.9s both" }}
        >
          ابدأ الآن ←
        </Link>

        <p className="mt-4 text-xs text-muted" style={{ animation: "fade-in 0.5s ease 1s both" }}>
          مستخدم لديك بوت؟{" "}
          <Link href="/setting" className="font-semibold text-accent hover:underline">تسجيل الدخول برقمك وكلمة السر</Link>
        </p>
      </div>
    </main>
  );
}
