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
            <h1 className="text-2xl font-bold">أهلاً{fullName ? `، ${fullName}` : " بك"} 👋</h1>
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

      {/* شريط الميزات الفورية النشطة (الحالات، الرسائل، الخصوصية) */}
      <Reveal delay={0.55}>
        <div className="my-8 rounded-2xl border border-accent/60 bg-gradient-to-br from-surface/90 to-surface/40 p-6 shadow-[0_0_40px_rgba(0,212,255,0.15)] backdrop-blur-xl relative overflow-hidden">
          {/* خلفية جمالية */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-matrix/10 blur-[80px]" />

          <div className="relative z-10 flex items-center justify-between border-b border-border/50 pb-4 mb-5">
            <div className="flex items-center gap-3 font-bold text-lg text-white">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/20 text-accent">👑</span>
              <span>محرك QUEEN الخارق النشط</span>
            </div>
            <span className="rounded-full bg-matrix/20 border border-matrix/40 px-3 py-1 text-xs font-bold text-matrix animate-pulse shadow-[0_0_10px_rgba(0,255,65,0.4)]">
              يعمل بقوة 100% ✓
            </span>
          </div>

          <div className="relative z-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/dashboard/queen"
              className="group rounded-xl border border-border/70 bg-elevated/40 p-4 transition-all hover:-translate-y-1 hover:border-accent hover:bg-elevated hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] flex flex-col items-start gap-3"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/15 text-accent text-2xl group-hover:scale-110 transition-transform shadow-inner">
                🖼️
              </span>
              <div>
                <h4 className="font-bold text-sm text-white">صانع الملصقات</h4>
                <p className="text-xs text-muted mt-1 leading-relaxed">أرسل .s لأي صورة لصنع ملصق</p>
              </div>
            </Link>

            <Link
              href="/dashboard/queen"
              className="group rounded-xl border border-border/70 bg-elevated/40 p-4 transition-all hover:-translate-y-1 hover:border-blood hover:bg-elevated hover:shadow-[0_0_20px_rgba(255,50,50,0.3)] flex flex-col items-start gap-3"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-blood/15 text-blood text-2xl group-hover:scale-110 transition-transform shadow-inner">
                🛡️
              </span>
              <div>
                <h4 className="font-bold text-sm text-white">حماية المجموعات</h4>
                <p className="text-xs text-muted mt-1 leading-relaxed">طرد، إغلاق، ترحيب تلقائي</p>
              </div>
            </Link>

            <Link
              href="/dashboard/status-hub"
              className="group rounded-xl border border-border/70 bg-elevated/40 p-4 transition-all hover:-translate-y-1 hover:border-emerald-500 hover:bg-elevated hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] flex flex-col items-start gap-3"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400 text-2xl group-hover:scale-110 transition-transform shadow-inner">
                👁️
              </span>
              <div>
                <h4 className="font-bold text-sm text-white">تفاعل الحالات</h4>
                <p className="text-xs text-muted mt-1 leading-relaxed">مشاهدة وردود سريعة ذكية</p>
              </div>
            </Link>

            <Link
              href="/dashboard/gemini"
              className="group rounded-xl border border-border/70 bg-elevated/40 p-4 transition-all hover:-translate-y-1 hover:border-purple-500 hover:bg-elevated hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] flex flex-col items-start gap-3"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-purple-500/15 text-purple-400 text-2xl group-hover:scale-110 transition-transform shadow-inner">
                🧠
              </span>
              <div>
                <h4 className="font-bold text-sm text-white">فهم الصور والردود</h4>
                <p className="text-xs text-muted mt-1 leading-relaxed">الذكاء الاصطناعي يحلل كل شيء</p>
              </div>
            </Link>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.6}>
        <CreateBotForm hasBot={bots.length > 0} />
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
