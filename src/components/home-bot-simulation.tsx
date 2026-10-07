"use client";

import { useState } from "react";

export default function HomeBotSimulation() {
  const [activeTab, setActiveTab] = useState<"auto_reply" | "anti_delete" | "status_views">("auto_reply");

  return (
    <div className="relative mx-auto mt-16 max-w-4xl px-2 sm:px-4">
      {/* التوهج المحيط بالمجسم */}
      <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-cyan-500/15 to-indigo-500/15 blur-2xl opacity-70" />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-2xl">
        {/* شريط رأس المحاكي بنمط macOS / iOS الحديث */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-slate-900/70 px-4 py-3 sm:px-6 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex items-center gap-2 ps-2 border-s border-white/10">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
              </span>
              <span className="text-xs font-mono font-medium text-slate-300">Hatem X Cloud Engine • Live Simulation</span>
            </div>
          </div>

          {/* أزرار التبويبات التفاعلية */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/80 p-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab("auto_reply")}
              className={`rounded-lg px-3 py-1.5 transition-all duration-200 ${
                activeTab === "auto_reply"
                  ? "bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              🤖 الرد الذكي
            </button>
            <button
              onClick={() => setActiveTab("anti_delete")}
              className={`rounded-lg px-3 py-1.5 transition-all duration-200 ${
                activeTab === "anti_delete"
                  ? "bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              🛡️ كاشف المحذوف
            </button>
            <button
              onClick={() => setActiveTab("status_views")}
              className={`rounded-lg px-3 py-1.5 transition-all duration-200 ${
                activeTab === "status_views"
                  ? "bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              👁️ مشاهدة الحالات
            </button>
          </div>
        </div>

        {/* واجهة محادثة واتساب الرسمية فائقة الدقة */}
        <div className="relative bg-[#0b141a] p-4 sm:p-7 min-h-[300px] flex flex-col justify-center">
          {/* نمط خلفية محادثة واتساب الخفيف */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
            }}
          />

          {activeTab === "auto_reply" && (
            <div className="relative space-y-4 max-w-2xl mx-auto w-full">
              {/* رسالة العميل القادمة */}
              <div className="flex items-start gap-2.5">
                <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-slate-800 text-xs border border-white/10 text-slate-300">
                  👤
                </div>
                <div className="relative rounded-2xl rounded-tr-none bg-[#202c33] p-3.5 text-sm text-slate-100 shadow-md max-w-md border border-white/5">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-emerald-400 font-mono mb-1">
                    <span>العميل (+967 77xxxxxxx)</span>
                    <span className="text-slate-400">10:42 م</span>
                  </div>
                  <p className="leading-relaxed">السلام عليكم، هل البوت شغال لما أقفل جوالي أو يخلص النت عندي؟</p>
                </div>
              </div>

              {/* رد البوت السحابي الفوري */}
              <div className="flex items-start justify-end gap-2.5">
                <div className="relative rounded-2xl rounded-tl-none bg-[#005c4b] p-4 text-sm text-white shadow-xl max-w-lg border border-emerald-400/20">
                  <div className="flex items-center justify-between gap-4 text-[11px] mb-1.5 pb-1 border-b border-white/10">
                    <span className="font-bold flex items-center gap-1.5 text-emerald-200">
                      <span>🤖 بوت Hatem X السحابي</span>
                      <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.2 text-[9px] text-emerald-300">AI Gemini</span>
                    </span>
                    <span className="text-emerald-300 font-mono text-[10px]">استجابة: 0.08 ثانية ⚡</span>
                  </div>
                  <p className="leading-relaxed text-slate-100">
                    وعليكم السلام ورحمة الله وبركاته يا غالي! 🌟 <br />
                    نعم بالتأكيد، البوت يعمل سحابياً على خوادمنا 24/7 حتى لو نفدت بطارية هاتفك أو أغلقت الإنترنت تماماً. يتكفل بالرد على عملائك، وتفاعل الحالات، وحفظ الرسائل فورياً دون أي انقطاع!
                  </p>
                  <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-emerald-200/80">
                    <span>10:42 م</span>
                    <span className="text-cyan-300 font-bold">✓✓</span>
                  </div>
                </div>
                <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 font-black text-xs shadow-md">
                  X
                </div>
              </div>
            </div>
          )}

          {activeTab === "anti_delete" && (
            <div className="relative space-y-4 max-w-2xl mx-auto w-full">
              {/* رسالة محذوفة من المرسل */}
              <div className="flex items-start gap-2.5">
                <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-red-950/40 border border-red-500/30 text-xs text-red-400">
                  🚫
                </div>
                <div className="relative rounded-2xl rounded-tr-none border border-red-500/20 bg-red-950/20 p-3.5 text-sm text-red-200 shadow-md max-w-md">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-red-400 mb-1">
                    <span>المرسل قام بحذف الرسالة للجميع</span>
                    <span className="text-slate-500">11:15 م</span>
                  </div>
                  <p className="italic opacity-75 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    تم حذف هذه الرسالة
                  </p>
                </div>
              </div>

              {/* التقام وحفظ الرسالة من قبل البوت في المحادثة الخاصة */}
              <div className="flex items-start justify-end gap-2.5">
                <div className="relative rounded-2xl rounded-tl-none bg-[#1f2c34] border border-emerald-500/30 p-4 text-sm text-white shadow-xl max-w-lg">
                  <div className="flex items-center justify-between gap-3 text-[11px] mb-2 pb-1.5 border-b border-white/10">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>🛡️ مضاد الحذف السحابي (Anti-Delete)</span>
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 font-semibold">
                      تم الالتقاط فوراً ✓
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-2">
                    التقط البوت نص الرسالة الأصلية قبل حذفها وأرسلها لمحفظتك الخاصة:
                  </p>
                  <div className="rounded-xl border border-emerald-500/20 bg-slate-950/70 p-3 text-sm text-emerald-300 font-sans leading-relaxed">
                    💬 &quot;أرسل لي رقم الحساب البنكي لتحويل المبلغ فوراً&quot;
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span>حفظ مشفر في محادثتك مع النفس</span>
                    <span className="text-cyan-300 font-bold">11:15 م ✓✓</span>
                  </div>
                </div>
                <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-emerald-500 text-slate-950 font-bold text-xs shadow-md">
                  🛡️
                </div>
              </div>
            </div>
          )}

          {activeTab === "status_views" && (
            <div className="relative max-w-2xl mx-auto w-full">
              <div className="grid gap-3.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-center backdrop-blur-md">
                  <span className="text-3xl mb-1.5 block">👁️</span>
                  <div className="text-3xl font-extrabold text-emerald-400 font-mono">548</div>
                  <p className="text-xs text-slate-300 mt-1 font-medium">حالة تمت مشاهدتها اليوم</p>
                  <span className="inline-block mt-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                    تلقائياً وبدون فتح الواتساب
                  </span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-center backdrop-blur-md">
                  <span className="text-3xl mb-1.5 block">❤️</span>
                  <div className="text-3xl font-extrabold text-pink-400 font-mono">312</div>
                  <p className="text-xs text-slate-300 mt-1 font-medium">تفاعل بالقلوب والإيموجي</p>
                  <span className="inline-block mt-2 rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] text-pink-400">
                    تفاعل فوري مع الأصدقاء
                  </span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-center backdrop-blur-md">
                  <span className="text-3xl mb-1.5 block">⚡</span>
                  <div className="text-3xl font-extrabold text-cyan-400 font-mono">0.1s</div>
                  <p className="text-xs text-slate-300 mt-1 font-medium">سرعة المشاهدة اللحظية</p>
                  <span className="inline-block mt-2 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-400">
                    فور نشر الحالة في جهات اتصالك
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* الشريط السفلي للحالة الحية */}
        <div className="border-t border-white/10 bg-slate-900/60 px-5 py-3 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <span className="flex items-center gap-2 text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            سيرفر Baileys v6 سحابي متصل ومستقر على مدار الساعة
          </span>
          <span className="font-mono text-slate-300 text-[11px]">Latency: 12ms | Memory: 42MB | Cloud AWS EC2</span>
        </div>
      </div>
    </div>
  );
}
