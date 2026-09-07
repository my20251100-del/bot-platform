# تقرير الأمن والتشفير — Bot Platform (Hatem X)

| | |
|---|---|
| **النطاق المفحوص** | `https://bot-platform-delta.vercel.app` |
| **تاريخ الفحص** | 2026-09-07 |
| **نوع النظام** | منصة SaaS لتشغيل بوتات واتساب (Next.js 16 / Supabase / محرك Baileys) |
| **المعيار المتبع** | OWASP Top 10 + أفضل الممارسات في التشفير (Transit / At-rest / Application) |
| **النتيجة العامة** | الحماية أساسية سليمة، والإصلاح في هذا التقرير أُنجز ونُشر |

---

## 1) الخمس طبقات للتشفير الكامل

### L1 — تشفير أثناء النقل (Transport Layer Security)
**الوصف:** كل الاتصال بين المتصفح والخادم مشفّر ببروتوكول TLS، ولا يُقبل أي طلب عبر HTTP عادي.
- البروتوكول الفعلي المقاس: **TLS 1.3** بالخوارزمية **TLS_AES_128_GCM_SHA256**.
- ترويسة **`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`** → المتصفح يجبر HTTPS دائماً لفترة سنة وتحويل حيزي كامل.
- **أين:** موفَّرة من Vercel + مفعّلة عبر `next.config.ts`.

### L2 — تشفير قاعدة البيانات عند الراحة (At-rest)
**الوصف:** قواعد بيانات Supabase (PostgreSQL) مشفّرة تلقائياً على القرص (At-rest encryption) بمفاتيح تُدار من منصة Supabase — أي نسخ القرص أو ملفات DB لا تكشف المحتوى.
- **إضافة:** القيم الحساسة غير محفوظة كنص صريح داخل خلايا DB (انظر L3).

### L3 — تشفير الحقول الحساسة داخل التطبيق (Application-layer AES-256-GCM)
**الوصف:** حتى داخل قاعدة البيانات، الأسرار الحساسة لا تُخزَّن نصاً صريحاً:
- كلمة سر لوحة التحكم للبوت (`settings.secret`) → تُخزَّن بصيغة مشفّرة.
- مفاتيح الذكاء الاصطناعي (`GEMINI_API_KYES`) → تُخزَّن بصيغة مشفّرة.
- النص المفحوص: **`enc:v1:`** + بيانات مشفّرة بنمط **AES-256-GCM** (IV عشوائي 12 بايت + غلاف مصادقة GCM)، والمفتاح **مشتق من سرّ خادمي فقط** (`SUPABASE_SERVICE_ROLE_KEY`) فلا يصل للعميل إطلاقاً.
- **أين:** `src/lib/crypto.ts` + `src/app/api/setting/route.ts` + `engine/index.mjs` (المحرك يخزّن السر مشفّراً أيضاً).

### L4 — حماية المصادقة وسرّ اللوحات
- مقارنة كلمة السر بمقارنة **ثابتة الزمن** (`crypto.timingSafeEqual`) لمنع هجمات Timing.
- **Rate limiting** على بوابة `/api/setting` (8 محاولات/رقم/15د + 20/IP/10د) + على كل مسارات `/api/signup`, `/api/connect`.
- الجلسات عبر Supabase Auth (كلمات المرور مًخزّنة hashed من المنصة) + **OTP** للتحقق من الرقم (ذات انتهاء صلاحية).
- التحقق من ملكية البوت قبل أي عملية حساسة (`bot.user_id === user.id` في `/api/bot/[id]/contacts` وغيرها).

### L5 — إدارة الأسرار وعدم تسريبها
- مفاتيح الـ `SUPABASE_SERVICE_ROLE_KEY` تُستخدم **حصراً** داخل `lib/supabase/admin.ts` (جهة الخادم) — لا يوجد ما يبدأ بـ `NEXT_PUBLIC_` للأسرار.
- لا يوجد ملف `.env` مرتكب في المشروع.
- الرقم المربوط لا يُعرض إطلاقاً: الإجابات من `/api/setting` و`/api/connect` ترجع الرقم **مموهاً** (`•••• •••• 1234`)، وكل واجهات اللوحة تستخدم `maskPhone()`.

---

## 2) نتائج الفحوصات الحية (أدلة)

| الاختبار | النتيجة | الدليل |
|---|---|---|
| TLS | `TLSv1.3` — `TLS_AES_128_GCM_SHA256` | فحص `openssl s_client` |
| HSTS | حاضرة — `includeSubDomains; preload` | `curl -sI` |
| `X-Frame-Options` | `DENY` (ضد Clickjacking) | الترويسات |
| `X-Content-Type-Options` | `nosniff` | الترويسات |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | الترويسات |
| `Permissions-Policy` | كاميرا/ميك/geo/دفع معطّلة | الترويسات |
| CSP | `default-src 'self'` + `frame-ancestors 'none'` + `object-src 'none'`، **وتمت إزالة `unsafe-eval`** | الترويسات |
| `X-Powered-By` | **محذوف** (لم يعد يظهر) | الترويسات |
| Brute-force على بوابة اللوحات | **مُحظر**: أرسلت 25 محاولة متتالية → أول 8 ردت ثم **429 من التاسعة** | فحص يدوي حي |
| فحص التوابع `npm audit` | ثغرات `sharp` عالية الخطورة **أُصلحت** بترقية `sharp@0.35.4` | `npm audit` |

---

## 3) الإصلاحات المطبّقة هذا اليوم

1. إضافة **Rate limiting** لبوابة `/api/setting`.
2. إنشاء **`src/lib/crypto.ts`** (AES-256-GCM) وتشفير `secret` و`GEMINI_API_KYES` عند الراحة.
3. ترقية تلقائية للبيانات القديمة إلى المشفّرة عند أول دخول ناجح (بلا كسر للمستخدمين الحاليين).
4. **Hashing-safe مقارنة زمنية ثابتة** لكلمة السر بدل المقارنة النصية.
5. تشفير السر داخل **المحرك** (`engine/index.mjs`) عند توليده.
6. إزالة **`unsafe-eval`** من CSP + إخفاء **`X-Powered-By`**.
7. ترقية **`sharp@0.35.4`**.
8. **إخفاء الرقم نهائياً**: الردود والواجهات (لوحات البوت + كل صفحات الـ Dashboard) تعرض آخر 4 أرقام فقط أو اسم البوت.

---

## 4) المخاطر المتبقية المعروفة (Accepted Risks)

| المخاطرة | السبب | الإجراء المقترح |
|---|---|---|
| `link-preview-js` (تبعية داخلية لـ Baileys) | لا يوجد إصلاح من المطوّر حتى الآن، والمكتبة غير مستخدمة مباشرة في كودنا | مراقبة ظهور fix وترقية نسخة Baileys |
| CSP يُبقي `'unsafe-inline'` للـ scripts | يحتاجه Next.js للهيدريشن دون إعداد Nonce | اختياري: اعتماد `next-safe` بغير Nonces عند الحاجة للحد الأقصى |
| 3 أخطاء Lint جاهزة في `src/app/dashboard/analytics/page.tsx` | ملف سابق غير متعلق بمشروع الأمن | يُصلَح عند الحاجة |

---

## 5) كيف يتحقق المفحص بنفسه (أدوات مجانية)

1. **الترويسات والأمان:** `https://securityheaders.com/?q=bot-platform-delta.vercel.app`
2. **تقييم Mozilla Observatory:** `https://observatory.mozilla.org/analyze/bot-platform-delta.vercel.app`
3. **مواصفات SSL:** `https://www.ssllabs.com/ssltest/analyze.html?d=bot-platform-delta.vercel.app`
4. **اختبار brute-force:** إرسال أكثر من 8 محاولات متتالية لـ `/api/setting` بسر خاطئ → يُحظر بـ 429.
5. **التوابع:** `npm audit --omit=dev` في مجلد المشروع.

---

## 6) الخلاصة

النظام مطبّق عليه التشفير في **طبقاته الخمس** (نقل TLS 1.3 + راحة في DB + تشفير تطبيقي AES-256-GCM + حماية مصادقة + إدارة أسرار)، مع تغطية لاغلب بنود OWASP Top 10 الأساسية (Injection, Broken Auth, XSS عبر CSP, Clickjacking، والفجوات الأمنية في الاستجابة)، والأدلة القابلة لإعادة التحقق موثقة أعلاه. **الأمن عملية مستمرة** وليس شهادة نهائية، وتركات المخاطر المعروفة موثفة في القسم (4).