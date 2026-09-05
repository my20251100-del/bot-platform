"use client";

import { useState } from "react";

export default function HomeBotSimulation() {
  const [activeTab, setActiveTab] = useState<"auto_reply" | "anti_delete" | "status_views">("auto_reply");

  return (
    <div className="relative mx-auto mt-16 max-w-4xl px-4">
      {/* التوهج الخلفي المحيط بالمجسم */}
      <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-accent/20 via-cyber/20 to-matrix/20 blur-2xl opacity-60" />

      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface/95 shadow-2xl backdrop-blur-2xl">
        {/* شريط التحكم التفاعلي بالتبويبات */}
        <div className="flex flex-wrap items-center justify-between border-b border-border/70 bg-elevated/60 px-5 py-3.5 gap-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span className="h-3 w-3 rounded-full bg-green-500/80" />
            <span className="me-2 text-xs font-mono text-muted">WhatsApp Engine Live Simulation</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface/70 p-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab("auto_reply")}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === "auto_reply" ? "bg-accent text-accent-fg font-bold shadow-md shadow-accent/20" : "text-muted hover:text-white"
              }`}
            >
              🤖 الرد التلقائي الذكي
            </button>
            <button
              onClick={() => setActiveTab("anti_delete")}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === "anti_delete" ? "bg-accent text-accent-fg font-bold shadow-md shadow-accent/20" : "text-muted hover:text-white"
              }`}
            >
              🛡️ كاشف الرسائل المحذوفة
            </button>
            <button
              onClick={() => setActiveTab("status_views")}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === "status_views" ? "bg-accent text-accent-fg font-bold shadow-md shadow-accent/20" : "text-muted hover:text-white"
              }`}
            >
              👁️ مشاهدة الحالات والتفاعل
            </button>
          </div>
        </div>

        {/* جسم الشاشة الحية والمحادثة */}
        <div className="p-6 sm:p-8">
          {activeTab === "auto_reply" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-border text-sm">
                  👤
                </div>
                <div className="rounded-2xl rounded-tr-none bg-elevated p-3.5 text-sm text-fg shadow-sm max-w-md">
                  <p className="font-semibold text-xs text-muted mb-1">العميل (+967 77xxx)</p>
                  <p>السلام عليكم، هل البوت شغال لما أقفل جوالي أو يخلص النت عندي؟</p>
                  <span className="block mt-1 text-[10px] text-muted text-end">10:42 م</span>
                </div>
              </div>

              <div className="flex items-start justify-end gap-3">
                <div className="rounded-2xl rounded-tl-none bg-gradient-to-br from-emerald-950/80 to-accent/20 border border-accent/40 p-4 text-sm text-fg shadow-lg max-w-md">
                  <div className="flex items-center justify-between gap-3 text-xs mb-1">
                    <span className="font-bold text-accent">🤖 بوت Hatem X (استجابة في 0.08 ثانية)</span>
                    <span className="text-emerald-400 text-[11px]">✓✓ مقروءة</span>
                  </div>
                  <p className="leading-relaxed">
                    وعليكم السلام يا غالي! 🌟 <br />
                    نعم، البوت يعمل سحابياً على خوادمنا 24/7 دون توقف حتى لو نفدت بطارية جوالك أو أغلقت الإنترنت تماماً، ويتكفل بالرد على عملائك وحفظ رسائلك أولاً بأول! ⚡
                  </p>
                  <span className="block mt-1 text-[10px] text-accent/80 text-end">10:42 م</span>
                </div>
                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-accent text-accent-fg font-bold text-sm shadow-md shadow-accent/30">
                  PRO
                </div>
              </div>
            </div>
          )}

          {activeTab === "anti_delete" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-red-500/20 text-red-400 text-sm">
                  🚫
                </div>
                <div className="rounded-2xl rounded-tr-none border border-red-500/30 bg-red-950/20 p-3.5 text-sm text-red-200 shadow-sm max-w-md">
                  <p className="font-semibold text-xs text-red-400 mb-1">المرسل قام بحذف الرسالة للجميع</p>
                  <p className="italic opacity-80">🚫 تم حذف هذه الرسالة من قِبل المرسل</p>
                  <span className="block mt-1 text-[10px] text-muted text-end">11:15 م</span>
                </div>
              </div>

              <div className="flex items-start justify-end gap-3">
                <div className="rounded-2xl rounded-tl-none bg-surface border border-matrix/50 p-4 text-sm text-fg shadow-lg max-w-md">
                  <div className="flex items-center justify-between gap-3 text-xs mb-1">
                    <span className="font-bold text-matrix">🛡️ جدار حماية مضاد الحذف (Anti-Delete)</span>
                    <span className="text-matrix text-[11px]">مستعادة بنجاح ✓</span>
                  </div>
                  <p className="text-xs text-muted mb-2">تم رصد الرسالة المحذوفة وحفظها في محادثتك الخاصة:</p>
                  <div className="rounded-xl border border-border bg-elevated/70 p-2.5 text-sm text-emerald-300 font-mono">
                    &quot;أرسل لي رقم الحساب البنكي لتحويل المبلغ فوراً&quot;
                  </div>
                  <span className="block mt-1.5 text-[10px] text-muted text-end">11:15 م</span>
                </div>
                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-matrix text-black font-bold text-sm">
                  🛡️
                </div>
              </div>
            </div>
          )}

          {activeTab === "status_views" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-elevated/50 p-4 text-center">
                <span className="text-3xl mb-2 block">👁️</span>
                <div className="text-2xl font-bold text-accent">548</div>
                <p className="text-xs text-muted mt-1">حالة تمت مشاهدتها تلقائياً اليوم</p>
              </div>
              <div className="rounded-2xl border border-border bg-elevated/50 p-4 text-center">
                <span className="text-3xl mb-2 block">❤️</span>
                <div className="text-2xl font-bold text-pink-400">312</div>
                <p className="text-xs text-muted mt-1">تفاعل إيموجي آلي مع حالات أصدقائك</p>
              </div>
              <div className="rounded-2xl border border-border bg-elevated/50 p-4 text-center">
                <span className="text-3xl mb-2 block">⚡</span>
                <div className="text-2xl font-bold text-matrix">0.2s</div>
                <p className="text-xs text-muted mt-1">سرعة المشاهدة فور نشر الحالة</p>
              </div>
            </div>
          )}
        </div>

        {/* الشريط السفلي للحالة الحية */}
        <div className="border-t border-border/70 bg-elevated/40 px-6 py-3 flex flex-wrap items-center justify-between text-xs text-muted gap-2">
          <span className="flex items-center gap-1.5 text-matrix font-medium">
            <span className="h-2 w-2 rounded-full bg-matrix animate-pulse" />
            سيرفر Baileys متصل ونشط على مدار الساعة
          </span>
          <span className="font-mono text-fg">Latency: 14ms | Memory: 38MB</span>
        </div>
      </div>
    </div>
  );
}
