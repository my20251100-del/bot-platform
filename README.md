# WABot Manager — منصة "مكنون" لإدارة بوتات واتساب

لوحة تحكم شاملة (Dashboard) مبنية على **Next.js 16** و **Vercel** مع **Supabase** كقاعدة بيانات ومخزن حالة، تدعم المصادقة بالبريد/الواتساب، ربط البوتات عبر **Baileys** (كود اقتران / QR)، وجدولة المهام.

---

## 🏗️ المعمارية (Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│  Vercel (Serverless)                                        │
│  ├─ Frontend (Next.js App Router)                          │
│  ├─ API Routes: Auth, Bots, Settings, Scheduling           │
│  ├─ Cron Job: /api/bot/cron (كل دقيقة)                      │
│  └─ Supabase Client (Anon/Service Role)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL + Realtime)                          │
│  ├─ auth.users + profiles                                   │
│  ├─ bots (الحالة، الأمر، QR، كود الاقتران)                   │
│  ├─ bot_auth / bot_keys (حالة مصادقة Baileys)              │
│  ├─ bot_metadata (خريطة LID)                                │
│  ├─ notify_queue (طابور رسائل OTP/إشعارات)                 │
│  ├─ scheduled_posts (منشورات مجدولة)                       │
│  ├─ channel_follows (متابعة القنوات)                       │
│  └─ bot_logs (سجل الأحداث)                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  محرك Baileys المستقل (ضروري للاتصال الدائم)               │
│  ├─ يعمل على VPS / Railway / Render / محلياً                │
│  ├─ يقرأ/يكتب نفس جداول Supabase                            │
│  ├─ يدير اتصالات WebSocket دائمة مع واتساب                 │
│  └─ يُدار عبر PM2 / systemd / Docker                        │
└─────────────────────────────────────────────────────────────┘
```

> **⚠️ ملاحظة مهمة:** Vercel Serverless **لا يدعم الاتصالات الدائمة (WebSocket)**. محرك `Baileys` يحتاج لاتصال WebSocket دائم مع واتساب، لذا **يجب تشغيله كخدمة مستقلة** (VPS، Railway، Render، أو محلياً مع pm2). الـ Cron Job في Vercel يعالج فقط المهام الصادرة (طابور الإشعارات، المنشورات المجدولة، أوامر البوت) ولا يحل محل المحرك الدائم.

---

## 🚀 البدء السريع

### 1. المتطلبات
- Node.js 20+
- حساب Supabase (مشروع جديد)
- حساب Vercel
- (اختياري) خادم VPS للمحرك المستقل

### 2. إعداد Supabase
1. أنشئ مشروعاً جديداً في Supabase
2. شغّل ملفات SQL في `supabase/` بالترتيب:
   - `schema.sql` — الجداول الأساسية
   - `migration-bot-engine.sql` — أعمدة `qr`، `command`، `linked_number`
   - `auth-engine.sql` — جداول `bot_auth`، `bot_keys`، `bot_metadata`
3. فعّل **Row Level Security** (مفعل مسبقاً في SQL)
4. انسخ `Project URL` و `anon key` و `service_role key`

### 3. متغيرات البيئة (`.env.local`)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# التطبيق
APP_URL=https://your-app.vercel.app

# اختياري: حماية Cron
CRON_SECRET=random-long-string
```

### 4. النشر على Vercel
```bash
# تثبيت الاعتماديات
npm install

# بناء محلي للتحقق
npm run build

# النشر
vercel --prod
```
- أضف متغيرات البيئة في لوحة Vercel (Settings → Environment Variables)
- سيتم تفعيل Cron Job تلقائياً عبر `vercel.json` (كل دقيقة)

### 5. تشغيل المحرك المستقل (Baileys) — **إجباري**
المحرك هو الذي يتصل فعلياً بواتساب ويستقبل الرسائل/الحالات.

**خيار A: PM2 (مُوصى به)**
```bash
# على الخادم (VPS / Railway / Render)
git clone <repo> /opt/bot-platform
cd /opt/bot-platform
npm install --production

# نسخ .env.local مع مفاتيح Supabase
cp .env.example .env.local
# عدل القيم...

# تشغيل عبر PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**خيار B: systemd (Linux)**
```bash
sudo cp bot-engine.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bot-engine
sudo systemctl start bot-engine
journalctl -u bot-engine -f
```

**خيار C: Docker**
```bash
docker build -t wabot-engine .
docker run -d --name wabot-engine --env-file .env.local wabot-engine
```

---

## 📁 هيكل المشروع

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/callback/route.ts      # OAuth callback
│   │   │   ├── bot/cron/route.ts           # Vercel Cron endpoint
│   │   │   ├── connect/route.ts            # ربط البوت (إنشاء/QR/كود)
│   │   │   ├── login/step1/route.ts        # تسجيل دخول: تحقق كلمة مرور + إرسال OTP
│   │   │   ├── login/step2/route.ts        # تسجيل دخول: تحقق OTP + منح جلسة
│   │   │   ├── setting/route.ts            # إعدادات البوت (حفظ/قراءة)
│   │   │   ├── signup/route.ts             # تسجيل جديد + إرسال OTP
│   │   │   └── signup/verify/route.ts      # تحقق OTP التسجيل
│   │   ├── connect/page.tsx                # صفحة ربط البوت (QR/كود)
│   │   ├── dashboard/                      # لوحة التحكم المحمية
│   │   ├── login/page.tsx                  # صفحة تسجيل الدخول
│   │   ├── signup/page.tsx                 # صفحة التسجيل
│   │   └── layout.tsx                      # التخطيط العام + Providers
│   ├── components/                         # مكونات UI مشتركة
│   ├── lib/
│   │   ├── backend.ts                      # دوال الاتصال بـ Supabase (بديل Backend قديم)
│   │   ├── otp.ts                          # توليد/إرسال OTP عبر notify_queue
│   │   └── supabase/                       # عملاء Supabase (admin, server, client)
│   └── middleware.ts                       # حماية المسارات (اختياري)
├── engine/
│   ├── index.mjs                           # محرك Baileys الرئيسي (خدمة مستقلة)
│   └── auth-store.mjs                      # تخزين حالة مصادقة Baileys في Supabase
├── supabase/
│   ├── schema.sql                          # الجداول الأساسية
│   ├── migration-bot-engine.sql            # ترحيلات الأعمدة
│   └── auth-engine.sql                     # جداول مصادقة Baileys
├── scripts/
│   ├── deploy_bot.sh                       # نشر المحرك على الخادم (PM2)
│   └── setup_server.sh                     # إعداد خادم Ubuntu (Node, PM2, UFW)
├── ecosystem.config.js                     # إعداد PM2 للمحرك
├── bot-engine.service                      # خدمة systemd
├── vercel.json                             # إعدادات Vercel + Cron
├── .env.example                            # قالب متغيرات البيئة
└── package.json
```

---

## 🔧 نقاط النهاية (API)

| المسار | الطريقة | الوصف |
|----------|---------|---------|
| `/api/auth/callback` | GET | استدعاء Supabase OAuth |
| `/api/bot/cron` | GET | **Cron Job** — معالجة الطوابير (يتطلب `Authorization: Bearer <CRON_SECRET>`) |
| `/api/connect` | GET/POST | ربط بوت جديد / قراءة حالة QR/كود |
| `/api/login/step1` | POST | تحقق كلمة مرور + إرسال OTP واتساب |
| `/api/login/step2` | POST | تحقق OTP + منح جلسة |
| `/api/setting` | GET/POST | قراءة/حفظ إعدادات البوت |
| `/api/signup` | POST | تسجيل حساب جديد + إرسال OTP |
| `/api/signup/verify` | POST | تحقق OTP التسجيل |

---

## ⏰ Vercel Cron Job

ملف `vercel.json` يفعّل Cron Job يستدعي `/api/bot/cron` **كل دقيقة**:

```json
{
  "crons": [{ "path": "/api/bot/cron", "schedule": "*/1 * * * *" }]
}
```

المعالجة تشمل:
- `notify_queue` — إرسال رسائل OTP والإشعارات
- `scheduled_posts` — نشر المنشورات المجدولة المستحقة
- `channel_follows` — وضع طلبات متابعة القنوات في طابور المعالجة
- `bots.command` — تنفيذ أوامر `unlink`/`stop`

> **الحماية:** أضف `CRON_SECRET` في متغيرات البيئة، وسيتطلب الاستدعاء هيدر `Authorization: Bearer <CRON_SECRET>`.

---

## 🤖 المحرك المستقل (Baileys Engine)

`engine/index.mjs` هو الخدمة التي:
1. تقرأ البوتات ذات `command: "start"` من Supabase
2. تفتح اتصال WebSocket دائم مع واتساب عبر Baileys
3. تولد QR / كود اقتران وتخزنه في `bots.qr` / `bots.pair_code`
4. تستقبل الرسائل، الحالات، الأحداث وتخزن السجلات في `bot_logs`
5. ترسل الرسائل من `notify_queue` و `scheduled_posts`
6. تخزن حالة المصادقة (`creds` + `keys`) في جداول `bot_auth` / `bot_keys` — **لا ملفات محلية**

### متطلبات المحرك
- Node.js 20+
- نفس متغيرات `.env.local` (خاصة `SUPABASE_SERVICE_ROLE_KEY`)
- لا يحتاج `NEXT_PUBLIC_*` — فقط مفاتيح الخدمة

### مراقبة المحرك
```bash
pm2 logs wabot-engine -f
# أو
journalctl -u bot-engine -f
```

---

## 🔐 المصادقة والتحقق (OTP via WhatsApp)

1. المستخدم يدخل البريد + كلمة المرور (`/api/login/step1`)
2. النظام يتحقق من كلمة المرور، يقرأ رقم واتساب من `profiles.phone`
3. يولد OTP (6 أرقام)، يخزنه في `user_metadata.pending_otp`
4. يضيف رسالة في `notify_queue` للبوت النظامي (MOH)
5. المحرك يقرأ `notify_queue` ويرسل OTP عبر واتساب
6. المستخدم يدخل OTP في الخطوة الثانية (`/api/login/step2`)
7. النظام يتحقق، يمسح `pending_otp`، ويمنح جلسة Supabase (كوكيز)

---

## 📦 النصوص البرمجية (Scripts)

| السكريبت | الغرض |
|-----------|-------|
| `npm run dev` | تشغيل محلي للواجهة (Next.js) |
| `npm run build` | بناء للإنتاج |
| `npm run start` | تشغيل الإنتاج محلياً |
| `npm run engine` | تشغيل المحرك محلياً (`node --env-file=.env.local engine/index.mjs`) |
| `npm run lint` | فحص ESLint |
| `scripts/setup_server.sh` | إعداد خادم Ubuntu جديد (Node, PM2, UFW) |
| `scripts/deploy_bot.sh` | نشر المحرك على خادم موجود (PM2 + ecosystem.config.js) |

---

## 🛡️ الأمان

- **Row Level Security** على جميع جداول Supabase
- **Service Role Key** يستخدم فقط في Route Handlers (Server) والمحرك — **لا يُعرض للعميل**
- **CRON_SECRET** يحمي نقطة نهاية Cron من الاستدعاء الخارجي
- جلسات Baileys مخزنة في Supabase (`bot_auth` + `bot_keys`) — لا ملفات على القرص
- كلمات سر البوتات مخزنة في `bots.settings.secret` (مشفر/مجزأ مستقبلاً)

---

## 📝 الترخيص

مشروع خاص — جميع الحقوق محفوظة لفريق "مكنون".