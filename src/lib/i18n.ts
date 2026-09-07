export type Locale = "ar" | "en";

/**
 * قاموس الترجمة — المفتاح هو النص العربي الأصلي، والقيمة زوج عربي/إنجليزي.
 * تُرجِع tr() الترجمة الإنجليزية عند اختيار EN، وإلا النص الأصلي.
 */
export const DICT: Record<string, { ar: string; en: string }> = {
  // ===== الشريط العلوي (Header) =====
  "الرئيسية": { ar: "الرئيسية", en: "Home" },
  "قائمة البوت": { ar: "قائمة البوت", en: "Bot menu" },
  "The Mini Bot (الرئيسية)": { ar: "The Mini Bot (الرئيسية)", en: "The Mini Bot" },
  "Deploy Now (ربط الآن)": { ar: "Deploy Now (ربط الآن)", en: "Deploy Now" },
  "Settings (الإعدادات)": { ar: "Settings (الإعدادات)", en: "Settings" },
  "Auto Reply (الرد الآلي)": { ar: "Auto Reply (الرد الآلي)", en: "Auto Reply" },
  "Auto Save (حفظ الأرقام)": { ar: "Auto Save (حفظ الأرقام)", en: "Auto Save Contacts" },
  "⚡ ربط سريع": { ar: "⚡ ربط سريع", en: "⚡ Quick Link" },
  "المميزات": { ar: "المميزات", en: "Features" },
  "الأسئلة الشائعة": { ar: "الأسئلة الشائعة", en: "FAQ" },
  "اتصل بنا": { ar: "اتصل بنا", en: "Contact Us" },
  "لوحة التحكم": { ar: "لوحة التحكم", en: "Dashboard" },
  "🔑 تسجيل الدخول": { ar: "🔑 تسجيل الدخول", en: "🔑 Sign In" },
  "تسجيل الدخول": { ar: "تسجيل الدخول", en: "Sign In" },
  "مضاد حذف الرسائل والوسائط، ردود ذكية وفورية، وتفاعل تلقائي مع الحالات سحابياً على مدار الساعة دون توقف.": { ar: "مضاد حذف الرسائل والوسائط، ردود ذكية وفورية، وتفاعل تلقائي مع الحالات سحابياً على مدار الساعة دون توقف.", en: "anti-delete for messages and media, smart instant replies, and automatic status interactions running 24/7 in the cloud." },
  "ابدأ مجاناً": { ar: "ابدأ مجاناً", en: "Start Free" },
  "ابدأ مجاناً ✨": { ar: "ابدأ مجاناً ✨", en: "Start Free ✨" },
  "القائمة": { ar: "القائمة", en: "Menu" },
  "The Mini Bot (منصة البوت)": { ar: "The Mini Bot (منصة البوت)", en: "The Mini Bot (Bot Platform)" },
  "Deploy Now (ربط رقم جديد)": { ar: "Deploy Now (ربط رقم جديد)", en: "Deploy Now (Link a New Number)" },
  "Bot Settings (الإعدادات)": { ar: "Bot Settings (الإعدادات)", en: "Bot Settings" },
  "Auto Reply (الرد التلقائي)": { ar: "Auto Reply (الرد التلقائي)", en: "Auto Reply" },
  "المميزات والخصائص": { ar: "المميزات والخصائص", en: "Features & Capabilities" },
  "اتصل بنا والدعم": { ar: "اتصل بنا والدعم", en: "Contact & Support" },
  "دخول": { ar: "دخول", en: "Sign In" },
  "دخول لوحة التحكم 🚀": { ar: "دخول لوحة التحكم 🚀", en: "Open Dashboard 🚀" },

  // ===== الفوتر (Footer) =====
  "منصة عضوية مميزة لنمو قنوات واتساب وأتمتة البوتات — تفاعلات، متابعون، محفظة، وإحالات، كل ذلك في مكان واحد.":
    { ar: "منصة عضوية مميزة لنمو قنوات واتساب وأتمتة البوتات — تفاعلات، متابعون، محفظة، وإحالات، كل ذلك في مكان واحد.", en: "A premium membership platform for growing WhatsApp channels and bot automation — interactions, followers, wallet and referrals, all in one place." },
  "محفظة كريدت": { ar: "محفظة كريدت", en: "Credit Wallet" },
  "تحويل كريدت ذهبي": { ar: "تحويل كريدت ذهبي", en: "Golden Credit Exchange" },
  "نظام إحالات": { ar: "نظام إحالات", en: "Referral System" },
  "ثلاث لغات": { ar: "ثلاث لغات", en: "Multilingual" },
  "آمن": { ar: "آمن", en: "Secure" },
  "التنقل": { ar: "التنقل", en: "Navigation" },
  "إنشاء حساب": { ar: "إنشاء حساب", en: "Create Account" },
  "الخدمات": { ar: "الخدمات", en: "Services" },
  "تفاعلات واتساب": { ar: "تفاعلات واتساب", en: "WhatsApp Interactions" },
  "متابعو واتساب": { ar: "متابعو واتساب", en: "WhatsApp Followers" },
  "البوت المصغّر": { ar: "البوت المصغّر", en: "Mini Bot" },
  "وصول API": { ar: "وصول API", en: "API Access" },
  "تخزين سحابي": { ar: "تخزين سحابي", en: "Cloud Storage" },
  "الشركة": { ar: "الشركة", en: "Company" },
  "حول": { ar: "حول", en: "About" },
  "قانوني": { ar: "قانوني", en: "Legal" },
  "سياسة الخصوصية": { ar: "سياسة الخصوصية", en: "Privacy Policy" },
  "الشروط والأحكام": { ar: "الشروط والأحكام", en: "Terms & Conditions" },
  "منصة Hatem X — جميع الحقوق محفوظة.": { ar: "منصة Hatem X — جميع الحقوق محفوظة.", en: "Hatem X platform — All rights reserved." },
  "تطوير: محمد حاتم (Hatem X) | للتواصل: 772847565 (واتساب)": { ar: "تطوير: محمد حاتم (Hatem X) | للتواصل: 772847565 (واتساب)", en: "Developed by: Mohammed Hatem (Hatem X) | Contact: 772847565 (WhatsApp)" },

  // ===== الرئيسية (Home) =====
  "منصة Hatem X ⚡ — أتمتة واتساب الأقوى 2.0 فائقة السرعة": { ar: "منصة Hatem X ⚡ — أتمتة واتساب الأقوى 2.0 فائقة السرعة", en: "Hatem X Platform ⚡ — The Most Powerful WhatsApp Automation 2.0" },
  "تحكّم بواتسابك، رد بذكاء، واحمِ خصوصيتك 24/7": { ar: "تحكّم بواتسابك، رد بذكاء، واحمِ خصوصيتك 24/7", en: "Control WhatsApp, reply smartly, and protect your privacy 24/7" },
  "منصة سحابية متكاملة مدعومة بالذكاء الاصطناعي من": { ar: "منصة سحابية متكاملة مدعومة بالذكاء الاصطناعي من", en: "A fully cloud-powered, AI-driven platform from" },
  "💬 تواصل مع Hatem X (772847565)": { ar: "💬 تواصل مع Hatem X (772847565)", en: "💬 Chat with Hatem X (772847565)" },
  "⚡ صفحة الربط المباشر": { ar: "⚡ صفحة الربط المباشر", en: "⚡ Direct Link Page" },
  "دخول المشتركين 👤": { ar: "دخول المشتركين 👤", en: "Member Login 👤" },
  "بوت واتساب نشط سحابياً": { ar: "بوت واتساب نشط سحابياً", en: "Active WhatsApp bots in the cloud" },
  "نسبة تشغيل مستمر دون انقطاع": { ar: "نسبة تشغيل مستمر دون انقطاع", en: "Uptime without interruption" },
  "رسالة وحالة تمت معالجتها": { ar: "رسالة وحالة تمت معالجتها", en: "Messages & statuses processed" },
  "سرعة استجابة الرد الذكي": { ar: "سرعة استجابة الرد الذكي", en: "Smart reply response time" },
  "القوة والتحكم الكامل": { ar: "القوة والتحكم الكامل", en: "Power & Full Control" },
  "كل ما تحتاجه لأتمتة واتسابك في مكان واحد": { ar: "كل ما تحتاجه لأتمتة واتسابك في مكان واحد", en: "Everything you need to automate WhatsApp in one place" },
  "المقارنة العادلة": { ar: "المقارنة العادلة", en: "Fair Comparison" },
  "لماذا يفضل الآلاف منصة": { ar: "لماذا يفضل الآلاف منصة", en: "Why do thousands choose" },
  "مقارنة بين نظامنا السحابي المعتمد وبين نسخ واتساب المعدلة غير الآمنة": { ar: "مقارنة بين نظامنا السحابي المعتمد وبين نسخ واتساب المعدلة غير الآمنة", en: "Compare our secure cloud system against unsafe modified WhatsApp versions" },
  "الميزة / المعيار": { ar: "الميزة / المعيار", en: "Feature / Criterion" },
  "التطبيقات المعدلة (GB)": { ar: "التطبيقات المعدلة (GB)", en: "Modified Apps (GB)" },
  "سهل وسريع": { ar: "سهل وسريع", en: "Easy & Fast" },
  "ابدأ في 3 خطوات فقط": { ar: "ابدأ في 3 خطوات فقط", en: "Start in just 3 steps" },
  "لا تحتاج لأي خبرة برمجية — كل شيء جاهز وتلقائي": { ar: "لا تحتاج لأي خبرة برمجية — كل شيء جاهز وتلقائي", en: "No coding skills needed — everything is ready and automatic" },
  "إجابات واضحة": { ar: "إجابات واضحة", en: "Clear Answers" },
  "الأسئلة الأكثر شيوعاً": { ar: "الأسئلة الأكثر شيوعاً", en: "Most Common Questions" },
  "كل ما تود معرفته عن طريقة عمل البوت والحماية والاشتراك": { ar: "كل ما تود معرفته عن طريقة عمل البوت والحماية والاشتراك", en: "Everything you want to know about how the bot works, security and subscription" },
  "جاهز لتحويل واتسابك إلى قوة خارقة؟": { ar: "جاهز لتحويل واتسابك إلى قوة خارقة؟", en: "Ready to turn your WhatsApp into a superpower?" },
  "💬 تواصل مع Hatem X: 772847565": { ar: "💬 تواصل مع Hatem X: 772847565", en: "💬 Chat with Hatem X: 772847565" },
  "⚡ اربط بوتك الآن مجاناً": { ar: "⚡ اربط بوتك الآن مجاناً", en: "⚡ Link your bot now for free" },
  "تواصل مباشر مع Hatem X عبر واتساب 772847565 • إعداد فوري • كل شيء جاهز ومضبوط": { ar: "تواصل مباشر مع Hatem X عبر واتساب 772847565 • إعداد فوري • كل شيء جاهز ومضبوط", en: "Direct contact with Hatem X via WhatsApp 772847565 • Instant setup • Everything ready and tuned" },
  "أدخل رقم هاتفك": { ar: "أدخل رقم هاتفك", en: "Enter your phone number" },
  "أدخل الكود في واتساب": { ar: "أدخل الكود في واتساب", en: "Enter the code in WhatsApp" },
  "استمتع بالأتمتة والحماية": { ar: "استمتع بالأتمتة والحماية", en: "Enjoy automation & protection" },

  // ===== صفحات الدخول/التسجيل =====
  "أتمتة وحماية واتساب الذكية عبر منصة Hatem X — سحابياً 24/7.": { ar: "أتمتة وحماية واتساب الذكية عبر منصة Hatem X — سحابياً 24/7.", en: "Smart WhatsApp automation & protection via Hatem X — cloud 24/7." },
  "أتمتة وحماية واتساب الذكية عبر منصة Hatem X — تفاعلات، مضاد حذف، ومساعد ذكاء اصطناعي في مكان واحد.": { ar: "أتمتة وحماية واتساب الذكية عبر منصة Hatem X — تفاعلات، مضاد حذف، ومساعد ذكاء اصطناعي في مكان واحد.", en: "Smart WhatsApp automation & protection via Hatem X — interactions, anti-delete and an AI assistant in one place." },
  "جارٍ التحميل...": { ar: "جارٍ التحميل...", en: "Loading..." },

  // ===== صفحات عامة =====
  "حول بوت برو": { ar: "حول بوت برو", en: "About Bot Pro" },
  "منصة نمو قنوات واتساب.": { ar: "منصة نمو قنوات واتساب.", en: "A WhatsApp channel growth platform." },
  "جاهز للانضمام؟": { ar: "جاهز للانضمام؟", en: "Ready to join?" },
  "ابدأ نمو قناتك اليوم مجاناً.": { ar: "ابدأ نمو قناتك اليوم مجاناً.", en: "Start growing your channel today, free." },
  "ابدأ الآن": { ar: "ابدأ الآن", en: "Start Now" },
  "كل ما تحتاج معرفته عن بوت برو.": { ar: "كل ما تحتاج معرفته عن بوت برو.", en: "Everything you need to know about Bot Pro." },
  "لديك أسئلة أخرى؟": { ar: "لديك أسئلة أخرى؟", en: "Any other questions?" },
  "تواصل معنا وسنكون سعداء بمساعدتك.": { ar: "تواصل معنا وسنكون سعداء بمساعدتك.", en: "Contact us and we will be happy to help you." },
  "تواصل معنا": { ar: "تواصل معنا", en: "Contact Us" },

  // ===== صفحة الربط (Connect) =====
  "متصل ✓": { ar: "متصل ✓", en: "Connected ✓" },
  "بانتظار إدخال الكود في واتساب...": { ar: "بانتظار إدخال الكود في واتساب...", en: "Waiting for the code to be entered in WhatsApp..." },
  "غير متصل": { ar: "غير متصل", en: "Disconnected" },
  "فشل الاتصال": { ar: "فشل الاتصال", en: "Connection failed" },

  // ===== صفحة الاتصال (Contact) =====
  "فريق الدعم الفني والإدارة متاح الآن 24/7": { ar: "فريق الدعم الفني والإدارة متاح الآن 24/7", en: "Support & management team is available now 24/7" },
  "المدير العام وصاحب المنصة": { ar: "المدير العام وصاحب المنصة", en: "General Director & Platform Owner" },
  "محادثة واتساب فورية": { ar: "محادثة واتساب فورية", en: "Instant WhatsApp Chat" },
  "اتصال صوتي مباشر": { ar: "اتصال صوتي مباشر", en: "Direct Voice Call" },
  "نحن هنا لمساعدتك في تفعيل اشتراكك، ربط بوتك، وتخصيص كافة ميزاتك الذكية. تواصل مباشرة مع الإدارة:": { ar: "نحن هنا لمساعدتك في تفعيل اشتراكك، ربط بوتك، وتخصيص كافة ميزاتك الذكية. تواصل مباشرة مع الإدارة:", en: "We're here to help you activate your subscription, link your bot and customize all your smart features. Contact management directly:" },
};

export function tr(locale: Locale, source: string): string {
  if (locale === "en") return DICT[source]?.en ?? source;
  return source;
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}