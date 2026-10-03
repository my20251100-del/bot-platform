"use client";

import { useState } from "react";

const faqs = [
  {
    q: "هل أحتاج إلى إبقاء هاتفي متصلاً بالإنترنت ليعمل البوت؟",
    a: "لا على الإطلاق! البوت يعمل على خوادمنا السحابية فائقة السرعة 24 ساعة يومياً طوال الأسبوع. يمكنك إغلاق هاتفك أو نفاد بطاريته أو انقطاع الإنترنت وسيبقى البوت شغالاً ويرد على الرسائل ويشاهد الحالات باستمرار.",
  },
  {
    q: "هل رقمي معرّض للحظر في واتساب عند استخدام المنصة؟",
    a: "منصة hatem X تعتمد على أحدث بروتوكولات واتساب الرسمية (Multi-Device Baileys) مع محاكاة المتصفحات البشرية ومعدلات تأخير ذكية وتوزيع حمولة تمنع حظر الرقم تماماً على عكس التطبيقات المعدلة غير الآمنة (مثل GBWhatsApp).",
  },
  {
    q: "كيف تتم عملية ربط البوت؟ وهل هي معقدة؟",
    a: "الربط بسيط جداً ويستغرق أقل من 10 ثوانٍ! فقط اكتب رقم هاتفك مع الرمز الدولي في خانة الربط السريع، وسيظهر لك كود اقتران من 8 خانات. ادخل واتساب > الأجهزة المرتبطة > ربط برقم الهاتف، واكتب الكود ليتصل البوت فوراً دون الحاجة لمسح كاميرا.",
  },
  {
    q: "هل يمكنني تعديل الرسائل والردود التلقائية وميزات البوت؟",
    a: "نعم وبكل سهولة! بمجرد ربط البوت يرسل لك كلمة سر خاصة، يمكنك الدخول بها إلى صفحة الإعدادات أو لوحة التحكم لتفعيل وإيقاف أي ميزة بضغطة زر وتخصيص الردود بالكامل.",
  },
  {
    q: "هل بياناتي ورسائلي ومحادثاتي مشفرة وآمنة؟",
    a: "نعم، كافة الاتصالات مشفرة بتشفير طرف إلى طرف (End-to-End Encryption) وفق معايير Signal التشفيرية المعتمدة من واتساب، ولا نقوم بقراءة أو مشاركة أي من رسائلك أو وسائطك الخاصة نهائياً.",
  },
];

export default function HomeFaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {faqs.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={faq.q}
            className={`rounded-2xl border transition-all ${
              isOpen
                ? "border-accent/50 bg-surface shadow-lg shadow-accent/5"
                : "border-border/70 bg-elevated/40 hover:border-border"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="flex w-full items-center justify-between p-5 text-start font-semibold text-fg text-base sm:text-lg"
            >
              <span>{faq.q}</span>
              <span
                className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl bg-surface border border-border/80 text-accent transition-transform duration-200 ms-3 ${
                  isOpen ? "rotate-180 bg-accent text-accent-fg font-bold" : ""
                }`}
              >
                ▼
              </span>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-1 text-sm sm:text-base leading-relaxed text-muted border-t border-border/40">
                {faq.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
