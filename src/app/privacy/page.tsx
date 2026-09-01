import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="reveal">
            <h1 className="cyber-title text-3xl font-bold sm:text-4xl">سياسة الخصوصية</h1>
            <p className="mt-3 text-sm text-muted">آخر تحديث: {new Date().getFullYear()}</p>
          </div>
          <div className="card mt-8 space-y-6 p-6 sm:p-8 text-sm leading-relaxed text-muted reveal">
            <section>
              <h2 className="text-lg font-bold text-white">1. البيانات التي نجمعها</h2>
              <p className="mt-2">نجمع البيانات اللازمة لتشغيل المنصة: البريد الإلكتروني، رقم واتساب، اسم العرض، وسجل استخدام البوتات والمحفظة.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-white">2. استخدام البيانات</h2>
              <p className="mt-2">نستخدم بياناتك لتشغيل الخدمة، إدارة البوتات المتصلة، معالجة المعاملات داخل المنصة، وتحسينها. لا نبيع بياناتك لأي طرف ثالث.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-white">3. جلسات واتساب</h2>
              <p className="mt-2">تبقى جلسات واتساب المتصلة مشفرة ومخزنة بأمان، ولا تُستخدم إلا لتشغيل الخدمات التي طلبتها. يمكنك قطع الجلسة من لوحة التحكم في أي وقت.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-white">4. حماية البيانات</h2>
              <p className="mt-2">نستخدم تشفيراً في النقل والاتصال، وقيود وصول صارمة، وتدقيقاً دورياً للأنظمة الحساسة، وكل العمليات الحساسة تُتحقق على خوادمنا.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-white">5. حقوقك</h2>
              <p className="mt-2">يحق لك طلب نسخة من بياناتك أو حذفها في أي وقت عبر الاتصال بفريق الدعم.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-white">6. التواصل</h2>
              <p className="mt-2">لأي استفسار حول الخصوصية، راسلنا عبر صفحة الاتصال.</p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}