import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import LoginClient from "./login-client";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="grid min-h-[calc(100dvh-4rem)] md:grid-cols-2 overflow-x-hidden">
          {/* البصمة البصرية — يسار في LTR / يمين في RTL */}
          <div className="hidden md:flex flex-col items-center justify-center bg-accent/5 p-10">
            <div className="pointer-events-none w-80 h-80 relative">
              <div className="absolute inset-0 grid place-items-center rounded-full bg-gradient-to-br from-accent/10 to-cyber/10 blur-3xl" />
              <div className="relative grid h-80 w-80 place-items-center text-[120px] drop-shadow-lg" style={{ animation: "drift 8s ease-in-out infinite" }}>
                🤖
              </div>
            </div>
            <div className="mt-8 text-center">
              <h2 className="text-2xl font-bold">بوت برو <span className="text-accent">PRO</span></h2>
              <p className="mt-2 max-w-xs text-sm text-muted">أتمتة واتساب مبسّطة — رد تلقائي، مضاد حذف، وتفاعل ذكي. مجاني للأبد.</p>
            </div>
          </div>

          {/* نموذج تسجيل الدخول */}
          <div className="relative flex flex-col justify-center px-4 py-12 md:px-10 md:py-24 w-full">
            <div className="mx-auto w-full max-w-md md:max-w-lg">
              <LoginClient />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
