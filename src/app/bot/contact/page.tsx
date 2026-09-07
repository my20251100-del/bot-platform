"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/components/i18n-provider";

type GateBot = { id: string; name?: string; status: string; linked_number: string; contact_count?: number; settings?: any };

export default function AutoContactSavePage() {
  const { t } = useI18n();
  useEffect(() => {
    const sp = new URLSearchParams(globalThis.location?.search || "");
    const q = new URLSearchParams();
    q.set("tab", "contact");
    if (sp.get("number")) q.set("number", sp.get("number") || "");
    if (sp.get("secret")) q.set("secret", sp.get("secret") || "");
    globalThis.location.replace(`/bot/setting?${q.toString()}`);
  }, []);
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
      {t("جارٍ فتح لوحة التحكم...")}
    </div>
  );
}

export function ContactTab({ number, secret }: { number: string; secret: string }) {
  return <ContactCore embedded={{ number, secret }} />;
}

function ContactCore({ embedded }: { embedded?: { number: string; secret: string } }) {
  const { t, locale } = useI18n();
  const [session, setSession] = useState<GateBot | null>(null);
  const [number, setNumber] = useState(() =>
    embedded?.number ??
    (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("number")?.replace(/\D/g, "") ?? "")
  );
  const [secret, setSecret] = useState(() =>
    embedded?.secret ??
    (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("secret") || "")
  );
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateLoading, setGateLoading] = useState(false);
  const [autoSaveOn, setAutoSaveOn] = useState(true);
  const [contactCount, setContactCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);

  const authorize = async (digits: string, sec: string) => {
    setGateLoading(true);
    setGateError(null);
    try {
      const res = await fetch("/api/setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: digits, secret: sec.trim(), lang: locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setGateError(data.error || t("تعذّر التحقق من هويتك. تحقق من الرقم وكلمة السر."));
        setGateLoading(false);
        return;
      }
      const bot = data.bot || {};
      setSession({
        id: bot.id || "",
        name: bot.name || "",
        status: bot.status || "",
        linked_number: bot.linked_number || "",
        settings: bot.settings || data.settings || {},
      });
      setContactCount(Number(bot.contact_count ?? data.contact_count ?? (data.settings?.savedContacts?.length ?? 0)));
    } catch {
      setGateError(t("تعذّر الوصول إلى الخادم. حاول مرة أخرى."));
    } finally {
      setGateLoading(false);
    }
  };

  const confirmIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = number.replace(/\D/g, "");
    if (!digits || digits.length < 9) {
      setGateError(t("أدخل رقم واتساب صحيح مع رمز الدولة"));
      return;
    }
    await authorize(digits, secret.trim());
  };

  useEffect(() => {
    if (!embedded || session) return;
    const id = setTimeout(() => {
      void authorize(embedded.number.replace(/\D/g, ""), embedded.secret.trim());
    }, 0);
    return () => clearTimeout(id);
  }, [embedded?.number, embedded?.secret]);

  const handleDownload = async (format: "vcf" | "csv") => {
    if (!session?.id) return;
    setDownloading(true);
    try {
      window.open(`/api/bot/${session.id}/contacts?format=${format}`, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  const changeAccount = () => {
    setChangeLoading(true);
    setTimeout(() => {
      setSession(null);
      setSecret("");
      setConfirmOpen(false);
      setChangeLoading(false);
    }, 600);
  };

  if (!session) {
    if (embedded) {
      return (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-sm text-muted">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            {gateError ? <p className="text-center text-danger">⚠ {gateError}</p> : t("جارٍ تحميل الحفظ التلقائي...")}
          </div>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-md px-4 py-6 sm:py-10">
        <form
          onSubmit={confirmIdentity}
          className="card relative p-6 opacity-0 animate-fade-up sm:p-8"
          style={{ animationDelay: "80ms" }}
        >
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("الحفظ التلقائي لجهات الاتصال")}</h1>
            <p className="mt-1 text-sm text-muted">{t("سجّل الدخول إلى لوحة التحكم")}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-fg">{t("أدخل رقم واتسابك")}</label>
              <input
                dir="ltr"
                inputMode="numeric"
                value={number}
                onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="+967 772 847 565"
                className="w-full rounded-lg border border-border bg-elevated px-3 py-2 font-mono text-sm text-fg focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-fg">{t("كلمة السر / الرمز السري")}</label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="••••••••••"
                className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
              />
            </div>

            {gateError && <p className="text-center text-sm text-danger animate-fade-in">⚠ {gateError}</p>}

            <button
              type="submit"
              disabled={gateLoading}
              className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              {gateLoading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-fg border-t-transparent" />
                  {t("جارٍ التحقق...")}
                </>
              ) : (
                <>{t("تأكيد الهوية ←")}</>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  const connected = ["connected", "idle"].includes(session.status) || !!session.settings;

  return (
    <div className={embedded ? "w-full" : "mx-auto max-w-4xl px-4 py-12 sm:py-16"}>
      <div className="space-y-10">
        <header className="mb-2 flex flex-col items-center text-center animate-fade-up">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
              connected ? "border-accent/30 bg-accent-soft text-accent" : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-accent animate-ping" : "bg-danger"}`} />
            {connected ? t("متصل ✓") : t("غير متصل ✗")}
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">{t("حفظ جهات الاتصال تلقائياً")}</h1>
          <p className="mt-1 text-sm text-muted">
            {session.name
              ? locale === "en"
                ? <>Bot “{session.name}” synced successfully.</>
                : <>تمت مزامنة البوت «{session.name}» بنجاح.</>
              : t("تمت مزامنة البوت بنجاح.")}
          </p>
        </header>

        <div className="card p-6 animate-fade-in sm:p-8">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <p className="text-sm font-medium">{t("الحفظ التلقائي")}</p>
              <p className="mt-0.5 text-xs text-muted/70">{t("منح البوت صلاحية حفظ جهات الاتصال الجديدة تلقائياً إلى لوحة التحكم.")}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSaveOn}
              onClick={() => setAutoSaveOn(!autoSaveOn)}
              className={`relative h-6 w-12 flex-shrink-0 rounded-full transition ${autoSaveOn ? "bg-accent" : "bg-border"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                  autoSaveOn ? "left-auto right-0.5 translate-x-[-2px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 py-5">
            <div className="rounded-2xl border border-border bg-elevated/50 p-4 text-center">
              <p className="text-xs text-muted">{t("حالة جهات الاتصال")}</p>
              <p className={`mt-1 text-sm font-bold ${autoSaveOn ? "text-accent" : "text-muted"}`}>
                {autoSaveOn ? t("الحفظ التلقائي نشط") : t("الحفظ التلقائي متوقف")}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-elevated/50 p-4 text-center">
              <p className="text-xs text-muted">{t("جهات الاتصال المحفوظة")}</p>
              <p className="mt-1 font-mono text-2xl font-black text-accent">{contactCount || 0}</p>
            </div>
          </div>

          {autoSaveOn && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleDownload("vcf")}
                disabled={downloading || !session.id}
                className="flex items-center justify-center gap-2.5 rounded-2xl bg-accent px-5 py-3.5 text-sm font-bold text-accent-fg shadow-lg shadow-accent/25 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                <span>📥</span>
                <span>{t("تحميل جهات الاتصال (.vcf)")}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload("csv")}
                disabled={downloading || !session.id}
                className="flex items-center justify-center gap-2.5 rounded-2xl border border-border bg-elevated px-5 py-3.5 text-sm font-bold text-fg transition hover:border-accent hover:text-accent active:scale-95 disabled:opacity-50"
              >
                <span>📊</span>
                <span>{t("تصدير ورقة (.csv)")}</span>
              </button>
            </div>
          )}
        </div>

        {!embedded && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="mx-auto flex items-center gap-2 rounded-2xl border border-border bg-elevated px-6 py-3 text-sm font-semibold text-muted transition hover:border-accent hover:text-fg"
          >
            <span>🔁</span>
            <span>{t("تغيير الحساب")}</span>
          </button>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card max-w-sm p-6 text-center sm:p-8">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-2xl text-accent">⚠️</div>
            <h3 className="mt-4 text-lg font-bold">{t("هل أنت متأكد؟")}</h3>
            <p className="mt-1 text-sm text-muted">{t("قطع الاتصال وتغيير الحساب؟")}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border border-border bg-elevated px-4 py-2.5 text-sm font-medium text-muted transition hover:text-fg"
              >
                {t("لا")}
              </button>
              <button
                type="button"
                disabled={changeLoading}
                onClick={changeAccount}
                className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
              >
                {changeLoading ? t("جارٍ قطع الاتصال...") : t("نعم")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}