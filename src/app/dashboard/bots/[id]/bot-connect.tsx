"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type BotRow = {
  id: string;
  status: string;
  command: string;
  link_method: string;
  pair_code: string | null;
  qr: string | null;
  linked_number: string | null;
  phone?: string | null;
};

const statusStyles: Record<string, string> = {
  connected: "bg-emerald-500/15 text-emerald-400",
  pending: "bg-amber-500/15 text-amber-400",
  disconnected: "bg-red-500/15 text-red-400",
};

const statusLabels: Record<string, string> = {
  connected: "متصل ✓",
  pending: "بانتظار الربط...",
  disconnected: "غير متصل",
};

export default function BotConnect({ initial }: { initial: BotRow }) {
  const [bot, setBot] = useState<BotRow>(initial);
  const [busy, setBusy] = useState(false);
  
  // الحالة الحقيقية تأتي من Supabase مباشرة (لا خلفية خارجية بعد الآن).
  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("bots")
      .select(
        "id, status, command, link_method, pair_code, qr, linked_number, phone"
      )
      .eq("id", initial.id)
      .single();
    if (data) {
      setBot(data);
    }
  }, [initial.id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("bots")
        .select(
          "id, status, command, link_method, pair_code, qr, linked_number, phone"
        )
        .eq("id", initial.id)
        .single();
      if (alive && data) setBot(data);
    })();
    const t = setInterval(refresh, 2500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [refresh, initial.id]);

  async function setCommand(command: string) {
    setBusy(true);
    const supabase = createClient();
    if (command === "start") {
      // 1) مسح الكود القديم + تعليم البدء (أمر يقرؤه المحرك/الزامن).
      await supabase.from("bots").update({ command, qr: null, pair_code: null, status: "pending" }).eq("id", bot.id);
      // مسح بيانات المصادقة السابقة إذا لم يكن متصلاً لبدء جلسة اقتران نظيفة
      if (bot.status !== "connected") {
        await supabase.from("bot_auth").delete().eq("bot_id", bot.id);
        await supabase.from("bot_keys").delete().eq("bot_id", bot.id);
      }
      // 2) تشغيل الـ WhatsApp Client فعلياً عبر الـ Backend.
      try {
        const { initBot } = await import("@/lib/backend");
        await initBot(bot.id);
      } catch (initErr) {
        console.warn("[init] backend غير متاح:", initErr);
      }
      // 3) إن كان الربط عبر كود اقتران برقم، اطلب الكود من الـ Backend.
      const targetPhone = bot.phone || bot.linked_number;
      if (bot.link_method === "pair_code" && targetPhone) {
        try {
          const { requestPairing } = await import("@/lib/backend");
          await requestPairing(bot.id, targetPhone);
        } catch (pairErr) {
          console.warn("[pair] backend غير متاح:", pairErr);
        }
      }
      // 4) تحديث فوري يعكس حالة/QR الـ Backend الحقيقية.
      await refresh();
    } else {
      await supabase.from("bots").update({ command, qr: null, pair_code: null }).eq("id", bot.id);
      if (command === "stop" || command === "unlink") {
        try {
          const { stopBot } = await import("@/lib/backend");
          await stopBot(bot.id);
        } catch {
          /* غير حرج — الـ synchronizer أوقفه عبر command=stop */
        }
      }
      await refresh();
    }
    setBusy(false);
  }

  const isPending = bot.status === "pending" || !!bot.qr || (!!bot.pair_code && !bot.linked_number && bot.command === "start");

  return (
    <div className="card mb-6 p-6">

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[bot.status]}`}
          >
            {statusLabels[bot.status] ?? bot.status}
          </span>
          {bot.linked_number && (
            <span dir="ltr" className="text-sm text-muted">+{bot.linked_number}</span>
          )}
        </div>

        <div className="flex gap-2">
          {bot.command !== "start" ? (
            <button onClick={() => setCommand("start")} disabled={busy} className="btn-primary !py-2 !px-4 text-sm">
              {bot.linked_number ? "إعادة تشغيل البوت" : "ربط واتساب"}
            </button>
          ) : (
            <>
              {!isPending && (
                <button onClick={() => setCommand("stop")} disabled={busy} className="btn-primary !bg-elevated hover:!bg-border !py-2 !px-4 text-sm">
                  إيقاف
                </button>
              )}
              <button onClick={() => setCommand("unlink")} disabled={busy} className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10">
                فك الربط
              </button>
            </>
          )}
        </div>
      </div>

      {/* لوحة الربط */}
      {isPending && (
        <div className="mt-6 flex flex-col items-center gap-3 border-t border-border/60 pt-6">
          {bot.link_method === "qr" ? (
            bot.qr ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL وليس ملفاً ثابتاً */}
                <img src={bot.qr} alt="رمز QR" width={260} height={260} className="rounded-xl bg-white p-3" />
                <p className="text-sm text-muted">
                  واتساب ← الأجهزة المرتبطة ← ربط جهاز ← امسح الرمز
                </p>
              </>
            ) : (
              <p className="animate-pulse text-sm text-muted">جارٍ توليد رمز QR…</p>
            )
          ) : (
            bot.pair_code ? (
              <>
                <p className="text-sm text-muted">أدخل هذا الكود في جوالك:</p>
                <p dir="ltr" className="font-mono text-4xl font-bold tracking-[0.35em] text-accent">
                  {bot.pair_code}
                </p>
                <p className="text-sm text-muted">
                  واتساب ← الأجهزة المرتبطة ← ربط برقم الهاتف
                </p>
              </>
            ) : bot.qr ? (
              <>
                {/* fallback QR if pairing code failed */}
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL وليس ملفاً ثابتاً */}
                <img src={bot.qr} alt="رمز QR" width={260} height={260} className="rounded-xl bg-white p-3" />
                <p className="text-sm text-muted">
                  تعذّر كود الاقتران، يمكنك مسح الرمز: واتساب ← الأجهزة المرتبطة ← ربط جهاز
                </p>
              </>
            ) : (
              <p className="animate-pulse text-sm text-muted">جارٍ طلب كود الاقتران من واتساب…</p>
            )
          )}
        </div>
      )}

      {bot.status === "connected" && (
        <p className="mt-5 border-t border-border/60 pt-5 text-sm text-emerald-400">
          البوت يعمل الآن — الأتمتة المفعّلة أدناه نشطة على مدار الساعة.
        </p>
      )}
    </div>
  );
}
