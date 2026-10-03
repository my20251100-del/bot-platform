import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

export default function TermsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="reveal">
            <h1 className="cyber-title text-3xl font-bold sm:text-4xl">الشروط والأحكام</h1>
            <p className="mt-3 text-sm text-muted">آخر تحديث: {new Date().getFullYear()}</p>
          </div>
          <div className="card mt-8 space-y-6 p-6 sm:p-8 text-sm leading-relaxed text-muted reveal">
            <section>
              <h2 className="text-lg font-bold text-white">1. قبول الشروط</h2>
              <p className="mt-2">باستخدامك hatem X فإنك توافق على هذه الشروط. إذا لم توافق، يرجى عدم استخدام المنصة.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-white">2. الحسابات</h2>
              <p className="mt-2">أنت مسؤول عن الحفاظ على سرية بيانات اعتمادك وعن كل النشاطات التي تحدث عبر حسابك. تُمنع الحسابات المزيفة أو المضللة.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-white">3. الاستخدام المقبول</h2>
              <p className="mt-2">يُحظر استخدام المنصة لأي نشاط غير قانوني أو مضايقة أو إساءة. لا نضمن الفترة الزمنية الدقيقة لتنفيذ التفاعلات والمتابعين.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-white">4. العملات الافتراضية</h2>
              <p className="mt-2">الكريدت والكريدت الذهبي عملات افتراضية داخل المنصة بلا قيمة نقدية خارجها. عمليات الشراء نهائية ولا تُسترد إلا وفق سياسة المنصة.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-white">5. عدم الانتماء</h2>
              <p className="mt-2">hatem X غير تابع لواتساب أو ميتا. واتساب علامة تجارية لمالكها. استخدام البوتات يخضع أيضاً لشروط واتساب.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-white">6. إخلاء المسؤولية</h2>
              <p className="mt-2">نقدم المنصة &quot;كما هي&quot; دون ضمانات صريحة أو ضمنية بشأن توفرها أو عدم انقطاعها. قد نعدّل الشروط مستقبلاً وسيُنشر أي تعديل هنا.</p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}