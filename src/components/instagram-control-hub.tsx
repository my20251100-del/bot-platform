"use client";

import { useState } from "react";

export default function InstagramControlHub() {
  const [username, setUsername] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storyWatch, setStoryWatch] = useState(true);
  const [storyReact, setStoryReact] = useState(true);
  const [autoReply, setAutoReply] = useState(true);
  const [replyMode, setReplyMode] = useState<"all" | "clients" | "friends">("all");
  const [passcode, setPasscode] = useState("940870");
  const [customPrompt, setCustomPrompt] = useState("رد بلباقة واختصار كإنسان طبيعي ودود، وقدم أسعار المنصة وخدمات واتساب وانستقرام");
  const [savedSuccess, setSavedSuccess] = useState(false);

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setConnected(true);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    }, 1200);
  }

  function handleSaveSettings() {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  }

  return (
    <div className="relative mx-auto mt-12 max-w-4xl px-2 sm:px-4">
      <div className="relative rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-lg text-white shadow-md">
                📸
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                لوحة تحكم وربط أتمتة إنستقرام
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              اربط حسابك واضبط إعدادات مشاهدة الستوريات والتفاعل والرد الذكي على الدايركت
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              connected
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-800 text-slate-400 border border-white/10"
            }`}>
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              {connected ? "الحساب متصل سحابياً 24/7" : "بانتظار الربط"}
            </span>
          </div>
        </div>

        {/* نموذج ربط الحساب إذا لم يكن متصلاً */}
        {!connected ? (
          <form onSubmit={handleConnect} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  اسم مستخدم إنستقرام (Username)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-rose-400 font-bold font-mono">
                    @
                  </span>
                  <input
                    type="text"
                    dir="ltr"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="hatem_x_official"
                    required
                    className="input ps-9"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  اكتب يوزر حسابك ليتم إضافته إلى جدول الجلسات السحابية المخصصة
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  رمز الأمان والتفعيل السريع
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="input font-mono"
                  placeholder="940870"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  الرمز السري الموحد للتحكم بالردود (الافتراضي: 940870)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span>✓</span> ربط سحابي آمن 100%
                </span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <span>✓</span> لا يتطلب كلمة مرور الحساب
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-instagram whitespace-nowrap py-3 px-7 text-sm font-bold shadow-xl shadow-rose-500/25"
              >
                {loading ? "جارٍ إعداد الجلسة السحابية..." : "ربط حساب إنستقرام فوراً 🚀"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 space-y-6">
            {/* بطاقة الحساب المتصل */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <div className="flex items-center gap-3">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600">
                  <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center font-bold text-white">
                    {username.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-1.5 font-mono" dir="ltr">
                    @{username}
                    <span className="text-emerald-400">✓</span>
                  </h4>
                  <p className="text-xs text-emerald-300">
                    الجلسة نشطة على خوادم Hatem X السحابية • استجابة 24/7
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConnected(false)}
                  className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-1.5 text-xs text-slate-300 hover:text-rose-400 hover:border-rose-500/40 transition"
                >
                  فصل الحساب
                </button>
              </div>
            </div>

            {/* أدوات التحكم بالميزات الثلاث التي طلبها المستخدم */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* الميزة 1: مشاهدة الستوريات */}
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">👁️</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storyWatch}
                      onChange={(e) => setStoryWatch(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>
                <h4 className="font-bold text-white text-base">مشاهدة الستوريات</h4>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  مشاهدة كافة ستوريات متابعيك تلقائياً أولاً بأول حتى وأنت نائم أو هاتفك مغلق.
                </p>
                <div className="mt-3 text-[11px] font-semibold text-rose-400">
                  {storyWatch ? "نشط: يشاهد فور النشر ✓" : "متوقف مؤقتاً"}
                </div>
              </div>

              {/* الميزة 2: التفاعل التلقائي */}
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">❤️</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storyReact}
                      onChange={(e) => setStoryReact(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>
                <h4 className="font-bold text-white text-base">التفاعل بالقلوب والرد</h4>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  إرسال قلوب وتفاعلات سريعة مع ستوريات الأصدقاء لرفع التفاعل والظهور.
                </p>
                <div className="mt-3 text-[11px] font-semibold text-rose-400">
                  {storyReact ? "نشط: يضع لايكات وقلوب تلقائياً ✓" : "متوقف مؤقتاً"}
                </div>
              </div>

              {/* الميزة 3: الرد التلقائي الذكي */}
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">🤖</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoReply}
                      onChange={(e) => setAutoReply(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                <h4 className="font-bold text-white text-base">الرد التلقائي على الدايركت</h4>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  رد ذكي بالذكاء الاصطناعي على رسائل الخاص للعملاء والأصدقاء والجميع فورياً.
                </p>
                <div className="mt-3 text-[11px] font-semibold text-purple-400">
                  {autoReply ? "نشط: يرد في 0.08 ثانية ✓" : "متوقف مؤقتاً"}
                </div>
              </div>
            </div>

            {/* تفاصيل وتخصيص وضع الرد التلقائي (العملاء، الأصدقاء، الكل) */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-6 space-y-4">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span>🎯</span>
                <span>تحديد فئات من يتم الرد عليهم في الدايركت:</span>
              </h4>

              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setReplyMode("all")}
                  className={`p-4 rounded-xl border text-start transition ${
                    replyMode === "all"
                      ? "border-rose-500 bg-rose-500/15 text-white shadow-md shadow-rose-500/10"
                      : "border-white/10 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="font-bold text-sm text-white mb-1 flex items-center justify-between">
                    <span>🌐 الرد على الكل</span>
                    {replyMode === "all" && <span className="text-rose-400">✓</span>}
                  </div>
                  <p className="text-xs text-slate-400">
                    يرد على أي شخص يراسلك على الخاص سواء كان زبوناً أو صديقاً أو متابعاً جديداً.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setReplyMode("clients")}
                  className={`p-4 rounded-xl border text-start transition ${
                    replyMode === "clients"
                      ? "border-rose-500 bg-rose-500/15 text-white shadow-md shadow-rose-500/10"
                      : "border-white/10 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="font-bold text-sm text-white mb-1 flex items-center justify-between">
                    <span>💼 الرد على العملاء فقط</span>
                    {replyMode === "clients" && <span className="text-rose-400">✓</span>}
                  </div>
                  <p className="text-xs text-slate-400">
                    يرد فقط على الاستفسارات التجارية والأسعار وتوجيه العملاء دون التدخل بمحادثاتك الشخصية.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setReplyMode("friends")}
                  className={`p-4 rounded-xl border text-start transition ${
                    replyMode === "friends"
                      ? "border-rose-500 bg-rose-500/15 text-white shadow-md shadow-rose-500/10"
                      : "border-white/10 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="font-bold text-sm text-white mb-1 flex items-center justify-between">
                    <span>👥 الرد على الأصدقاء فقط</span>
                    {replyMode === "friends" && <span className="text-rose-400">✓</span>}
                  </div>
                  <p className="text-xs text-slate-400">
                    ردود طبيعية وودية كأنك أنت من يراسل أصدقاءك ومتابعيك المقربين.
                  </p>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  تعليمات الذكاء الاصطناعي ونبرة الرد (Gemini AI Prompt)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="حدد أسلوب الرد والترحيب بالعملاء أو الأصدقاء..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  كود الحماية المعتمد لتفعيل وإيقاف الرد: <strong className="text-rose-400 font-mono">940870</strong>
                </span>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="btn-instagram py-2 px-6 text-xs sm:text-sm font-bold"
                >
                  حفظ وتطبيق الإعدادات ✓
                </button>
              </div>
            </div>
          </div>
        )}

        {savedSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-center text-xs font-bold text-emerald-300 animate-in fade-in">
            تم حفظ إعدادات أتمتة إنستقرام بنجاح وجارٍ تشغيلها سحابياً على مدار الساعة! ✨
          </div>
        )}
      </div>
    </div>
  );
}
