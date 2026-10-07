"use client";

import { useState } from "react";

export default function InstagramSimulator() {
  const [activeTab, setActiveTab] = useState<"stories" | "dm_clients" | "dm_friends">("stories");
  const [autoHeart, setAutoHeart] = useState(true);

  return (
    <div className="relative mx-auto mt-16 max-w-4xl px-2 sm:px-4">
      {/* هالة تدرج إنستقرام المحيطة بالمجسم */}
      <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-amber-500/20 blur-2xl opacity-75" />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-2xl">
        {/* شريط رأس المحاكي */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-3.5 sm:px-6 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex items-center gap-2 ps-2 border-s border-white/10">
              <span className="grid h-5 w-5 place-items-center rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-[10px] text-white font-bold">
                📸
              </span>
              <span className="text-xs font-mono font-bold text-slate-200">
                Instagram Engine 2.0 • Live Simulation
              </span>
            </div>
          </div>

          {/* أزرار التبويبات التفاعلية */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/80 p-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab("stories")}
              className={`rounded-lg px-3 py-1.5 transition-all duration-200 ${
                activeTab === "stories"
                  ? "bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold shadow-md shadow-rose-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              👁️ مشاهدة الستوريات والتفاعل
            </button>
            <button
              onClick={() => setActiveTab("dm_clients")}
              className={`rounded-lg px-3 py-1.5 transition-all duration-200 ${
                activeTab === "dm_clients"
                  ? "bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold shadow-md shadow-rose-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              💼 الرد على العملاء
            </button>
            <button
              onClick={() => setActiveTab("dm_friends")}
              className={`rounded-lg px-3 py-1.5 transition-all duration-200 ${
                activeTab === "dm_friends"
                  ? "bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold shadow-md shadow-rose-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              👥 الرد على الأصدقاء والكل
            </button>
          </div>
        </div>

        {/* جسم الشاشة الحية */}
        <div className="relative bg-[#0c1017] p-4 sm:p-7 min-h-[340px] flex flex-col justify-center">
          
          {/* تبويب مشاهدة الستوريات */}
          {activeTab === "stories" && (
            <div className="relative max-w-2xl mx-auto w-full space-y-5">
              {/* مجسم بطاقة الستوري الدائري */}
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl">
                <div className="flex items-center gap-3.5">
                  <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600">
                    <div className="h-12 w-12 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-lg font-bold">
                      📸
                    </div>
                    <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[10px] text-slate-950 font-black">
                      ✓
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">@creative_studio_ye</span>
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                        ستوري جديد منذ دقيقة
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      تمت المشاهدة آلياً بواسطة خادم Hatem X السحابي (في 0.05s)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAutoHeart(!autoHeart)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    autoHeart
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : "bg-slate-800 text-slate-400 border border-white/10"
                  }`}
                >
                  <span>{autoHeart ? "❤️ تم التفاعل" : "🤍 إرسال قلب"}</span>
                </button>
              </div>

              {/* بطاقات الإحصاءات الفورية للستوريات */}
              <div className="grid gap-3.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-center backdrop-blur-md">
                  <span className="text-2xl mb-1 block">👁️</span>
                  <div className="text-3xl font-extrabold text-amber-400 font-mono">1,480</div>
                  <p className="text-xs text-slate-300 mt-1 font-semibold">ستوري تمت مشاهدتها اليوم</p>
                  <span className="inline-block mt-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                    بدون فتح تطبيق انستقرام
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-center backdrop-blur-md">
                  <span className="text-2xl mb-1 block">❤️</span>
                  <div className="text-3xl font-extrabold text-rose-400 font-mono">895</div>
                  <p className="text-xs text-slate-300 mt-1 font-semibold">قلوب وتفاعلات سريعة</p>
                  <span className="inline-block mt-2 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-400">
                    زيادة الظهور في حسابات الأصدقاء
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-center backdrop-blur-md">
                  <span className="text-2xl mb-1 block">⚡</span>
                  <div className="text-3xl font-extrabold text-purple-400 font-mono">100%</div>
                  <p className="text-xs text-slate-300 mt-1 font-semibold">استقرار سحابي 24/7</p>
                  <span className="inline-block mt-2 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-400">
                    نظام فواصل بشرية لمنع الحظر
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* تبويب الرد على العملاء */}
          {activeTab === "dm_clients" && (
            <div className="relative space-y-4 max-w-2xl mx-auto w-full">
              {/* رسالة الزبون في الدايركت */}
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs text-slate-300">
                  🛍️
                </div>
                <div className="rounded-2xl rounded-tr-none bg-slate-800/90 p-3.5 text-sm text-slate-100 shadow-md max-w-md border border-white/5">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-rose-400 font-mono mb-1">
                    <span>الزبون (@client_account)</span>
                    <span className="text-slate-400">03:15 م</span>
                  </div>
                  <p className="leading-relaxed">مرحباً، كم سعر الاشتراك الشهري وهل يتضمن الرد التلقائي على الواتساب والانستقرام معاً؟</p>
                </div>
              </div>

              {/* الرد التلقائي المخصص للعملاء من الذكاء الاصطناعي */}
              <div className="flex items-start justify-end gap-2.5">
                <div className="rounded-2xl rounded-tl-none bg-gradient-to-br from-purple-900/90 via-pink-900/80 to-slate-900 p-4 text-sm text-white shadow-xl max-w-lg border border-rose-500/30">
                  <div className="flex items-center justify-between gap-4 text-[11px] mb-1.5 pb-1 border-b border-white/10">
                    <span className="font-bold flex items-center gap-1.5 text-rose-200">
                      <span>🤖 رد ذكي (وضع العملاء التجاري)</span>
                      <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[9px] text-rose-300">Gemini Pro</span>
                    </span>
                    <span className="text-emerald-400 font-mono text-[10px]">استجابة في 0.08 ثانية ⚡</span>
                  </div>
                  <p className="leading-relaxed text-slate-100">
                    أهلاً بك يا غالي! 🌟 <br />
                    نعم بالتأكيد! منصة Hatem X توفر لك باقة متكاملة سحابياً تشمل أتمتة واتساب (مضاد الحذف ومشاهدة الحالات والرد الذكي) مع أتمتة إنستقرام (مشاهدة الستوريات ورد الدايركت الفوري).
                    <br />
                    للتفعيل الفوري تواصل مع المهندس محمد حاتم عبر واتساب: <strong className="text-rose-300 font-mono">772847565</strong>.
                  </p>
                  <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-rose-200/80">
                    <span>03:15 م</span>
                    <span className="text-cyan-300 font-bold">Seen ✓</span>
                  </div>
                </div>
                <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-white font-black text-xs shadow-md">
                  X
                </div>
              </div>
            </div>
          )}

          {/* تبويب الرد على الأصدقاء والكل */}
          {activeTab === "dm_friends" && (
            <div className="relative space-y-4 max-w-2xl mx-auto w-full">
              {/* رسالة الصديق */}
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs text-slate-300">
                  👋
                </div>
                <div className="rounded-2xl rounded-tr-none bg-slate-800/90 p-3.5 text-sm text-slate-100 shadow-md max-w-md border border-white/5">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-purple-400 font-mono mb-1">
                    <span>صديق مقرب (@my_friend)</span>
                    <span className="text-slate-400">08:20 م</span>
                  </div>
                  <p className="leading-relaxed">يا حاتم وينك اليوم ما شفناك؟ فاتح الحساب ولا مشغول؟</p>
                </div>
              </div>

              {/* الرد البشري الطبيعي المختصر */}
              <div className="flex items-start justify-end gap-2.5">
                <div className="rounded-2xl rounded-tl-none bg-gradient-to-br from-indigo-900/90 via-slate-900 to-slate-900 p-4 text-sm text-white shadow-xl max-w-lg border border-purple-500/30">
                  <div className="flex items-center justify-between gap-4 text-[11px] mb-1.5 pb-1 border-b border-white/10">
                    <span className="font-bold flex items-center gap-1.5 text-purple-200">
                      <span>🤖 رد طبيعي (وضع الأصدقاء)</span>
                      <span className="rounded-full bg-purple-500/20 px-1.5 py-0.2 text-[9px] text-purple-300">Persona AI</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">استجابة بشرية</span>
                  </div>
                  <p className="leading-relaxed text-slate-100">
                    هلا يا غالي! والله كنت مشغول شوي بأعمال المنصة، بشرني عنك كيفك اليوم وإيش أخبارك؟ ❤️
                  </p>
                  <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-purple-200/80">
                    <span>08:20 م</span>
                    <span className="text-cyan-300 font-bold">Seen ✓</span>
                  </div>
                </div>
                <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-white font-black text-xs shadow-md">
                  X
                </div>
              </div>
            </div>
          )}
        </div>

        {/* الشريط السفلي للحالة الحية */}
        <div className="border-t border-white/10 bg-slate-900/60 px-5 py-3 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <span className="flex items-center gap-2 text-rose-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            محرك Instagram Cloud Engine متصل ومستقر على مدار الساعة
          </span>
          <span className="font-mono text-slate-300 text-[11px]">Safe Human-Like Rate Limiter | Anti-Ban Active</span>
        </div>
      </div>
    </div>
  );
}
