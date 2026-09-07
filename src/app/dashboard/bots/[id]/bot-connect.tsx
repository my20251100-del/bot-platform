"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { maskPhone } from "@/lib/phone";

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

export default function BotConnect({ initial }: { initial: BotRow }) {
  const [bot, setBot] = useState<BotRow>(initial);
  const [busy, setBusy] = useState(false);
  const [phoneInput, setPhoneInput] = useState(initial.phone || "");
  const [selectedMethod, setSelectedMethod] = useState<"pair_code" | "qr">(
    (initial.link_method as "pair_code" | "qr") || "pair_code"
  );
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // تحديث بيانات البوت من Supabase مباشرة
  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("bots")
      .select("id, status, command, link_method, pair_code, qr, linked_number, phone")
      .eq("id", initial.id)
      .single();
    if (data) {
      setBot(data);
      if (data.phone) setPhoneInput(data.phone);
      if (data.link_method) setSelectedMethod(data.link_method as any);
    }
  }, [initial.id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("bots")
        .select("id, status, command, link_method, pair_code, qr, linked_number, phone")
        .eq("id", initial.id)
        .single();
      if (alive && data) {
        setBot(data);
        if (data.phone) setPhoneInput(data.phone);
        if (data.link_method) setSelectedMethod(data.link_method as any);
      }
    })();

    const t = setInterval(refresh, 2500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [refresh, initial.id]);

  // تنفيذ الإجراءات عبر الـ API الآمن (خادم مع صلاحيات كاملة)
  async function handleAction(action: "start" | "stop" | "unlink", overrideMethod?: "pair_code" | "qr") {
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/bot/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: bot.id,
          action,
          phone: phoneInput.trim(),
          linkMethod: overrideMethod || selectedMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || "تعذّر تنفيذ الإجراء");
      } else if (data.bot) {
        setBot(data.bot);
      }
      await refresh();
    } catch (e: any) {
      setErrorMessage(e.message || "خطأ في الاتصال بالخادم");
    } finally {
      setBusy(false);
    }
  }

  const isConnected = bot.status === "connected";
  const isLinked = isConnected && !!bot.linked_number;
  const isPending = !isLinked && (
    bot.status === "pending" ||
    !!bot.pair_code ||
    !!bot.qr ||
    (bot.command === "start" && bot.status !== "disconnected")
  );

  return (
    <div className="card mb-6 p-6">
      {/* شريط رأس الحالة */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          {isLinked ? (
            bot.status === "connected" ? (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                متصل 24/7 ✓
              </span>
            ) : bot.command === "start" ? (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                جارٍ إعادة الاتصال التلقائي...
              </span>
            ) : (
              <span className="rounded-full border border-zinc-700 bg-zinc-800/40 px-3 py-1 text-xs font-bold text-zinc-400">
                متوقف مؤقتاً
              </span>
            )
          ) : isPending ? (
            <span className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-400">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              بانتظار إدخال كود الواتساب...
            </span>
          ) : (
            <span className="rounded-full border border-zinc-700 bg-zinc-800/40 px-3 py-1 text-xs font-bold text-zinc-400">
              غير مربوط بعد
            </span>
          )}

          {bot.linked_number && (
            <span dir="ltr" className="text-sm font-mono text-accent">
              {maskPhone(bot.linked_number)}
            </span>
          )}
        </div>

        {/* أزرار التحكم المناسبة للحالة الحقيقية */}
        <div className="flex gap-2">
          {isLinked ? (
            <>
              {bot.status === "connected" ? (
                <button
                  onClick={() => handleAction("stop")}
                  disabled={busy}
                  className="rounded-xl border border-border bg-elevated px-4 py-2 text-sm font-medium hover:bg-border transition"
                >
                  {busy ? "جارٍ الإيقاف..." : "إيقاف مؤقت"}
                </button>
              ) : (
                <button
                  onClick={() => handleAction("start")}
                  disabled={busy}
                  className="btn-primary !py-2 !px-4 text-sm"
                >
                  {busy ? "جارٍ التشغيل..." : "إعادة الاتصال"}
                </button>
              )}

              <button
                onClick={() => {
                  if (confirm("هل أنت متأكد من فك ربط هذا البوت؟ ستحتاج لربطه مجدداً.")) {
                    handleAction("unlink");
                  }
                }}
                disabled={busy}
                className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
              >
                فك الربط
              </button>
            </>
          ) : isPending ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAction("start")}
                disabled={busy}
                className="btn-primary !py-2 !px-3 text-xs"
                title="طلب كود جديد إذا انتهت صلاحية الكود"
              >
                🔄 كود جديد
              </button>
              <button
                onClick={() => handleAction("stop")}
                disabled={busy}
                className="rounded-xl border border-zinc-700 bg-elevated px-3 py-2 text-xs font-medium text-muted hover:text-white transition"
              >
                إلغاء المحاولة
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleAction("start")}
              disabled={busy}
              className="btn-primary !py-2 !px-5 text-sm font-bold shadow-lg shadow-accent/20"
            >
              {busy ? "جارٍ البدء..." : "🔗 ربط واتساب الآن"}
            </button>
          )}
        </div>
      </div>

      {/* رسائل الأخطاء */}
      {errorMessage && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* لوحة الربط — تظهر عندما لا يكون البوت مربوطاً */}
      {!isLinked && (
        <div className="mt-5">
          {isPending ? (
            <div className="flex flex-col items-center gap-5 rounded-2xl border border-border/80 bg-surface/50 p-6 text-center">
              {/* اختيار طريقة العرض أثناء الانتظار */}
              <div className="flex items-center gap-2 border border-border rounded-xl p-1 bg-elevated/40 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod("pair_code");
                    handleAction("start", "pair_code");
                  }}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    selectedMethod === "pair_code"
                      ? "bg-accent text-accent-fg font-bold"
                      : "text-muted hover:text-white"
                  }`}
                >
                  كود اقتران (8 أرقام)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod("qr");
                    handleAction("start", "qr");
                  }}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    selectedMethod === "qr"
                      ? "bg-accent text-accent-fg font-bold"
                      : "text-muted hover:text-white"
                  }`}
                >
                  رمز QR
                </button>
              </div>

              {selectedMethod === "pair_code" ? (
                bot.pair_code ? (
                  <div className="flex w-full flex-col items-center gap-4">
                    <p className="text-sm font-medium text-fg">
                      أدخل هذا الكود في تطبيق واتساب بجوالك:
                    </p>

                    {(() => {
                      const rawCode = bot.pair_code.replace(/[^A-Za-z0-9]/g, "");
                      const chars = rawCode.split("");
                      return (
                        <div className="flex w-full flex-col items-center gap-4">
                          {/* شريط العد التنازلي لصلاحية الكود */}
                          <div className="w-full max-w-md space-y-1 text-xs">
                            <div className="flex justify-between font-semibold text-muted">
                              <span>⏱️ صلاحية الكود (نشط الآن)</span>
                              <span className="text-accent font-mono">أدخله في واتساب قبل الانتهاء</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-surface border border-border/80">
                              <div className="h-full bg-gradient-to-r from-emerald-500 via-accent to-amber-500 animate-pulse w-full" />
                            </div>
                          </div>

                          {/* مربعات الكود الفردية على طريقة Red Queen */}
                          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 my-2" dir="ltr">
                            {chars.map((ch, idx) => (
                              <div key={idx} className="flex items-center">
                                {idx === 4 && (
                                  <span className="text-2xl font-bold text-muted mx-1 sm:mx-2">-</span>
                                )}
                                <div className="grid h-12 w-10 sm:h-16 sm:w-14 place-items-center rounded-xl sm:rounded-2xl border-2 border-accent/60 bg-surface/90 shadow-[0_0_15px_rgba(0,212,255,0.25)] text-2xl sm:text-4xl font-mono font-black text-accent transition-all hover:scale-105">
                                  {ch}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(rawCode);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              }}
                              className="rounded-xl bg-accent px-6 py-3 text-sm font-black text-accent-fg transition hover:opacity-90 active:scale-95 shadow-lg shadow-accent/25 flex items-center gap-2"
                            >
                              {copied ? "تم النسخ بنجاح ✓" : "📋 نسخ الكود بنقرة واحدة"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAction("start")}
                              disabled={busy}
                              className="rounded-xl border border-border bg-elevated px-4 py-3 text-sm font-semibold hover:text-white transition"
                              title="طلب كود اقتران بديل"
                            >
                              🔄 كود جديد
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="mt-3 text-xs text-muted max-w-md text-right space-y-1.5 bg-elevated/40 p-4 rounded-xl border border-border/60">
                      <p className="font-bold text-fg flex items-center gap-1.5">
                        <span className="text-accent">📱</span> خطوات الاقتران في هاتفك:
                      </p>
                      <p>1. افتح <strong>واتساب</strong> على الجوال.</p>
                      <p>2. اضغط على <strong>القائمة ⋮</strong> أو <strong>الإعدادات ⚙️</strong> ← <strong>الأجهزة المرتبطة</strong>.</p>
                      <p>3. اختر <strong>ربط جهاز</strong> ثم انقر <strong>&quot;الربط باستخدام رقم الهاتف بدلاً من ذلك&quot;</strong> أسفل الشاشة.</p>
                      <p>4. أدخل الحروف الظاهرة في المربعات أعلاه بالترتيب وسيرتبط فوراً.</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center gap-3">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <p className="text-sm text-muted">جارٍ طلب كود الاقتران من خوادم واتساب…</p>
                    <p className="text-xs text-muted/70">تأكد من أن محرك البوت يعمل في الخلفية.</p>
                  </div>
                )
              ) : (
                bot.qr ? (
                  <div className="flex flex-col items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bot.qr}
                      alt="رمز QR"
                      width={260}
                      height={260}
                      className="rounded-2xl bg-white p-3 shadow-lg"
                    />
                    <p className="text-sm text-muted">
                      واتساب ← الأجهزة المرتبطة ← ربط جهاز ← وجّه الكاميرا وامسح الرمز
                    </p>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center gap-3">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <p className="text-sm text-muted">جارٍ توليد رمز QR الجديد…</p>
                  </div>
                )
              )}
            </div>
          ) : (
            /* نموذج إعداد وتأكيد الربط للمرة الأولى */
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-2xl text-accent">
                📱
              </div>
              <h3 className="font-bold text-lg text-fg">البوت غير مربوط بحساب واتساب بعد</h3>
              <p className="mt-1 text-sm text-muted max-w-md mx-auto">
                اختر طريقة الربط المفضلة وأدخل رقمك للبدء في تشغيل الأتمتة فوراً.
              </p>

              <div className="mt-5 max-w-sm mx-auto space-y-4 text-right">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">
                    رقم الواتساب (مع مفتاح الدولة)
                  </label>
                  <input
                    dir="ltr"
                    className="input text-left"
                    placeholder="+96777xxxxxxx"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">
                    طريقة الربط
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod("pair_code")}
                      className={`rounded-xl border py-2 text-xs font-semibold transition ${
                        selectedMethod === "pair_code"
                          ? "border-accent bg-accent/20 text-accent"
                          : "border-border bg-elevated text-muted hover:text-white"
                      }`}
                    >
                      كود اقتران (8 أرقام)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod("qr")}
                      className={`rounded-xl border py-2 text-xs font-semibold transition ${
                        selectedMethod === "qr"
                          ? "border-accent bg-accent/20 text-accent"
                          : "border-border bg-elevated text-muted hover:text-white"
                      }`}
                    >
                      رمز QR
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAction("start")}
                  disabled={busy}
                  className="btn-primary w-full !py-3 text-sm font-bold shadow-lg shadow-accent/20"
                >
                  {busy ? "جارٍ إرسال الطلب..." : "🚀 ابدأ ربط الواتساب الآن"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* رسالة النجاح إذا كان متصلاً */}
      {isLinked && bot.status === "connected" && (
        <div className="mt-5 border-t border-border/60 pt-4 flex items-center gap-2 text-sm text-emerald-400">
          <span>✓</span>
          <span>البوت متصل بنجاح ويعمل على مدار الساعة — جميع خيارات الأتمتة المفعّلة أدناه نشطة.</span>
        </div>
      )}
    </div>
  );
}
