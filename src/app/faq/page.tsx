import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import FaqAccordion from "./faq-accordion";
import { getServerLocale } from "@/lib/server-locale";
import { tr } from "@/lib/i18n";

const faqs = [
  {
    q: "ما هو بوت برو؟",
    a: "بوت برو منصة عضوية لنمو قنوات واتساب عبر تفاعلات ومتابعين حقيقيين، بالإضافة إلى باقة متنامية من البوتات المجانية والأدوات الرقمية.",
  },
  {
    q: "هل إنشاء الحساب مجاني؟",
    a: "نعم، إنشاء الحساب مجاني تماماً وتحصل على كريدت ترحيبي فوراً عند التسجيل.",
  },
  {
    q: "ما هو الكريدت وكيف يعمل التحويل؟",
    a: "الكريدت والكريدت الذهبي عملتا المنصة الداخليتان. الكريدت يُربح يومياً وعبر الإحالات، والذهبي هو العملة المميزة. يمكنك تحويل 50 كريدت إلى 1 كريدت ذهبي في أي وقت.",
  },
  {
    q: "كيف يعمل نظام الإحالة؟",
    a: "شارك رابطك المرجعي — عندما يسجل شخص جديد عبره، يحصل كل منكما على 10 كريدت فوراً. لا حدود لعدد الأصدقاء الذين يمكنك دعوتهم.",
  },
  {
    q: "كيف أشحن كريدت؟",
    a: "استخدم صفحة المحفظة لشراء كريدت أو كريدت ذهبي بشكل آمن عبر واتساب بأسعار محلية مناسبة.",
  },
  {
    q: "ما ميزة العضوية برو؟",
    a: "برو تمنحك حدوداً يومية أعلى، والقدرة على التفاعل مع أي قناة دون تحقق، والمزيد — بتكلفة كريدت ذهبي بسيطة لكل 30 يوماً.",
  },
  {
    q: "هل بياناتي آمنة؟",
    a: "نعم، بيانات اعتمادك لا تُكشف أبداً، وجلساتك محمية، وكل العمليات الحساسة تُتحقق من خوادمنا. راجع سياسة الخصوصية للتفاصيل.",
  },
  {
    q: "ما هي المزايا القادمة؟",
    a: "نضيف بوتات واتساب وتيليجرام مجانية، تحميل وسائط اجتماعية، موسيقى خلفية، بث كريبتو وكريكيت مباشر، أخبار مباشرة، تحميل أفلام، استضافة ويب، محادثة مباشرة، أدوات ذكاء اصطناعي وأكثر.",
  },
];

export default async function FaqPage() {
  const locale = await getServerLocale();
  const t = (s: string) => tr(locale, s);
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="reveal text-center">
            <h1 className="cyber-title text-3xl font-bold sm:text-4xl">{t("الأسئلة الشائعة")}</h1>
            <p className="mt-3 text-muted">{t("كل ما تحتاج معرفته عن بوت برو.")}</p>
          </div>
          <FaqAccordion items={faqs} />
          <div className="card mt-8 p-8 text-center reveal">
            <h2 className="text-xl font-bold">{t("لديك أسئلة أخرى؟")}</h2>
            <p className="mt-2 text-sm text-muted">{t("تواصل معنا وسنكون سعداء بمساعدتك.")}</p>
            <a href="/contact" className="btn-primary mt-6">{t("تواصل معنا")}</a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}