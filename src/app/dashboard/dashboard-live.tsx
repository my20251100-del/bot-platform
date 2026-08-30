"use client";

import Link from "next/link";
import { Reveal, AnimatedNumber, Ring } from "@/components/ui/motion";
import CreateBotForm from "./create-bot-form";

const statusStyles: Record<string, string> = {
  connected: "bg-emerald-500/15 text-emerald-400",
  pending: "bg-amber-500/15 text-amber-400",
  disconnected: "bg-red-500/15 text-red-400",
};
const statusLabels: Record<string, string> = {
  connected: "متصل",
  pending: "بانتظار الربط",
  disconnected: "غير متصل",
};

const tips = [
  "فعّل جدار الحماية لتحمي مجموعاتك من الروابط الخطرة 🔥",
  "استخدم وضع العمل 'مقيّد' ليرد البوت على جهاتك فقط.",
  "اربط مفاتيح Gemini لردود ذكية تلقائية 🧠",
  "جدوِل رسائلك مسبقاً من صفحة المجدول.",
  "فعّل رفض المكالمات لإخفاء رقمك تماماً 📵",
  "حاول مشاهدة الحالات بفعل زر المتابعين لتزيد قناتك.",
];

const inlineStyle = (n: number) => ({ animationDelay: `${n}s` });
const cardMotion =
  "reveal hover:scale-[1.02] hover:border-accent/70 hover:shadow-[0_0_26px_rgba(0,212,255,0.22)] transition-transform";

export default function DashboardLive({
  bots,
  fullName,
  referralCode,
}: {
  bots: any[];
  fullName: string | null;
  referralCode: string | null;
}) {
  const dayIndex = new Date().getDate() % tips.length;
  const connectedCount = bots.filter((b) => b.status === "connected").length;
  const activePct = bots.length ? Math.round((connectedCount / bots.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl">
      {/* التحية + نصيحة اليوم */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Reveal delay={0}>
            <h1 className="text-2xl font-bold">أهلاً{fullName ? `، ${fullName}` : "، M aknoon"} 👋</h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-1 flex items-start gap-2 text-sm text-accent/90">
              <span>💡</span>
              <span>{tips[dayIndex]}</span>
            </p>
          </Reveal>
        </div>
        {referralCode && (
          <Reveal delay={0.1}>
            <Link href="/dashboard/wallet" className="badge hover:border-accent/60 hover:text-white">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/></svg>
              كودك: <span dir="ltr" className="font-mono text-accent">{referralCode}</span>
            </Link>
          </Reveal>
        )}
      </div>

      {/* البطاقات الإحصائية: تظهر متدرجة */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Reveal delay={0.3} className={cardMotion}>
          <div className="card glass p-5">
            <div className="text-sm text-muted">إجمالي البوتات</div>
            <div className="tech mt-1 text-3xl font-bold">
              <AnimatedNumber value={bots.length} />
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.4} className={cardMotion}>
          <div className="card glass p-5">
            <div className="text-sm text-muted">متصل الآن</div>
            <div className="tech mt-1 text-3xl font-bold">
              <AnimatedNumber value={connectedCount} />
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.5} className={cardMotion}>
          <div className="card glass flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-muted">نسبة النشاط</div>
              <div className="mt-1 text-2xl font-bold tech">
                <AnimatedNumber value={activePct} suffix="%" />
              </div>
            </div>
            <Ring value={activePct} size={56} color="#00ff41" label={`${activePct}%`} />
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.6}>
        <CreateBotForm />
      </Reveal>

      <Reveal delay={0.7}>
        <h2 className="mb-4 mt-10 text-lg font-semibold">بوتاتك</h2>
      </Reveal>

      {!bots?.length ? (
        <Reveal delay={0.8}>
          <div className="card glass p-10 text-center text-muted">
            لا توجد بوتات بعد — أنشئ أول بوت من الأعلى.
          </div>
        </Reveal>
      ) : (
        <div className="grid gap-3">
          {bots.map((bot, i) => (
            <Link
              key={bot.id}
              href={`/dashboard/bots/${bot.id}`}
              style={inlineStyle(0.8 + i * 0.1)}
              className={`card glass flex items-center justify-between gap-4 p-5 transition-transform hover:border-accent/70 hover:shadow-[0_0_26px_rgba(0,212,255,0.22)] hover:scale-[1.01] ${cardMotion}`}
            >
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{bot.name}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[bot.status]}`}>
                    {statusLabels[bot.status] ?? bot.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {bot.linked_number ? `+${bot.linked_number}` : (bot.phone || "بدون رقم")} · عبر{" "}
                  {bot.link_method === "qr" ? "رمز QR" : "كود اقتران"}
                </p>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted rotate-180"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
