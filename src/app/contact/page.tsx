import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

export default function ContactPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="reveal text-center">
            <h1 className="cyber-title text-3xl font-bold sm:text-4xl">اتصل بنا</h1>
            <p className="mt-3 text-muted">نحن هنا لمساعدتك — لا تتردد في التواصل.</p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            <div className="card p-6 reveal">
              <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">💬</span>
              <h2 className="mt-4 font-bold">واتساب</h2>
              <p className="mt-1 text-sm text-muted">أسرع طريقة للرد — راسلنا مباشرة.</p>
              <a href="https://wa.me/" className="btn-primary mt-4 !px-5 !py-2 text-sm">راسلنا الآن</a>
            </div>

            <div className="card p-6 reveal">
              <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">📧</span>
              <h2 className="mt-4 font-bold">البريد الإلكتروني</h2>
              <p className="mt-1 text-sm text-muted">للاستفسارات التفصيلية والشراكات.</p>
              <a href="mailto:support@botpro.example" dir="ltr" className="mt-4 block text-sm font-medium text-accent hover:underline">support@botpro.example</a>
            </div>

            <div className="card p-6 reveal">
              <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">📞</span>
              <h2 className="mt-4 font-bold">اتصل بنا</h2>
              <p className="mt-1 text-sm text-muted">تواصل صوتي خلال ساعات الدعم.</p>
              <span dir="ltr" className="mt-4 block text-sm font-medium text-accent">967 7XXXXXXX</span>
            </div>

            <div className="card p-6 reveal">
              <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">🕒</span>
              <h2 className="mt-4 font-bold">ساعات الدعم</h2>
              <p className="mt-1 text-sm text-muted">متاحون على مدار الساعة.</p>
              <p className="mt-4 text-sm text-accent">24/7</p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}