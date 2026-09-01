import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

export default function AboutPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="reveal text-center">
            <h1 className="cyber-title text-3xl font-bold sm:text-4xl">حول بوت برو</h1>
            <p className="mt-3 text-muted">منصة نمو قنوات واتساب.</p>
          </div>

          <div className="mt-12 space-y-6">
            <section className="card reveal">
              <div className="flex items-start gap-4 p-6 sm:p-8">
                <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">👋</span>
                <div>
                  <h2 className="text-xl font-bold">من نحن</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    بوت برو منصة عضوية مميزة لنمو قنوات واتساب عبر تفاعلات ومتابعين حقيقيين،
                    بالإضافة إلى باقة متنامية من البوتات والأدوات الرقمية.
                  </p>
                </div>
              </div>
            </section>

            <section className="card reveal">
              <div className="flex items-start gap-4 p-6 sm:p-8">
                <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">🎯</span>
                <div>
                  <h2 className="text-xl font-bold">رسالتنا</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    تمكين صنّاع المحتوى والشركات من أتمتة ونمو قنوات واتساب بسهولة،
                    بأدوات بسيطة وأسعار عادلة واقتصاد كريدت في متناول الجميع.
                  </p>
                </div>
              </div>
            </section>

            <section className="card reveal">
              <div className="flex items-start gap-4 p-6 sm:p-8">
                <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">🧰</span>
                <div>
                  <h2 className="text-xl font-bold">ماذا نقدم؟</h2>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
                    <li>• تفاعلات ومتابعون حقيقيون لقنوات واتساب</li>
                    <li>• بوتات مجانية: رد تلقائي، مضاد حذف، مضاد عرض مرة واحدة</li>
                    <li>• محفظة كريدت مع مكافآت يومية وتحويل فوري</li>
                    <li>• نظام إحالات يكافئك أنت وصديقك</li>
                    <li>• أدوات وسائط وتخزين سحابي ووصول API</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="about" className="card reveal">
              <div className="flex items-start gap-4 p-6 sm:p-8">
                <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">🚀</span>
                <div>
                  <h2 className="text-xl font-bold">قريباً</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["بوت تيليجرام مجاني", "تحميل وسائط اجتماعية", "موسيقى خلفية", "بث كريبتو وكريكيت مباشر", "أخبار مباشرة", "تحميل أفلام", "استضافة ويب", "محادثة مباشرة", "أدوات ذكاء اصطناعي"].map((t) => (
                      <span key={t} className="badge !px-3.5 !py-1.5">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="card p-8 text-center reveal relative overflow-hidden">
              <div className="pointer-events-none absolute -top-20 left-1/4 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
              <h2 className="text-xl font-bold">جاهز للانضمام؟</h2>
              <p className="mt-2 text-sm text-muted">ابدأ نمو قناتك اليوم مجاناً.</p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href="/signup" className="btn-primary">ابدأ الآن</Link>
                <Link href="/login" className="btn-primary !bg-elevated hover:!bg-border">تسجيل الدخول</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}