"use client";

import { useState } from "react";

const faqs = [
  {
    q: "هل أحتاج إلى إبقاء هاتفي متصلاً بالإنترنت ليعمل البوت؟",
    a: "لا على الإطلاق! البوت يعمل على خوادمنا السحابية فائقة السرعة 24 ساعة يومياً طوال الأسبوع. يمكنك إغلاق هاتفك أو نفاد بطاريته أو انقطاع الإنترنت وسيبقى البوت شغالاً ويرد على الرسائل ويشاهد الحالات باستمرار.",
  },
  {
    q: "هل رقمي معرّض للحظر في واتساب عند استخدام المنصة؟",
    a: "منصة Hatem X تعتمد على أحدث بروتوكولات واتساب الرسمية (Multi-Device Baileys) مع محاكاة المتصفحات البشرية ومعدلات تأخير ذكية وتوزيع حمولة تمنع حظر الرقم تماماً على عكس التطبيقات المعدلة غير الآمنة (مثل GBWhatsApp).",
  },
  {
    q: "كيف تتم عملية ربط البوت؟ وهل هي معقدة؟",
    a: "الربط بسيط جداً ويستغرق أقل من 10 ثوانٍ! فقط اكتب رقم هاتفك مع الرمز الدولي في خانة الربط السريع، وسيظهر لك كود اقتران من 8 خانات. ادخل واتساب > الأجهزة المرتبطة > ربط برقم الهاتف، واكتب الكود ليتصل البوت فوراً دون الحاجة لمسح كاميرا.",
  },
  {
    q: "هل يمكنني تعديل الرسائل والردود التلقائية وميزات البوت؟",
    a: "نعم وبكل سهولة! بمجرد ربط البوت يرسل لك كلمة سر خاصة، يمكنك الدخول بها إلى صفحة الإعدادات أو لوحة التحكم لتفعيل وإيقاف أي ميزة بضغطة زر وتخصيص الردود بالكامل، كما يمكنك قفل أو فتح الردود بالرمز 940870.",
  },
  {
    q: "هل بياناتي ورسائلي ومحادثاتي مشفرة وآمنة؟",
    a: "نعم، كافة الاتصالات مشفرة بتشفير طرف إلى طرف (End-to-End Encryption) وفق معايير Signal التشفيرية المعتمدة من واتساب، ولا نقوم بقراءة أو مشاركة أي من رسائلك أو وسائطك الخاصة نهائياً.",
  },
];

export default function HomeFaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-3.5">
      {faqs.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={faq.q}
            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
              isOpen
                ? "border-emerald-500/40 bg-slate-900/80 shadow-lg shadow-emerald-500/5 backdrop-blur-xl"
                : "border-white/10 bg-slate-900/40 hover:border-white/20 hover:bg-slate-900/60"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="flex w-full items-center justify-between p-5 text-start font-bold text-white text-base sm:text-lg transition"
            >
              <span>{faq.q}</span>
              <span
                className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl border border-white/10 text-emerald-400 transition-transform duration-200 ms-3 ${
                  isOpen ? "rotate-180 bg-emerald-500 text-slate-950 font-bold border-transparent" : "bg-slate-950/60"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-0 text-sm sm:text-base leading-relaxed text-slate-300 border-t border-white/5 pt-3">
                {faq.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
