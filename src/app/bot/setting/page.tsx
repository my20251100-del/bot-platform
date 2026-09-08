"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { ContactTab } from "../contact/page";
import { AutoReplyTab } from "../autoreply/page";

type BotSession = {
  id: string;
  name: string;
  status: string;
  linked_number: string;
  link_method: string;
};

const SECTIONS = [
  { id: "autoreply", label: "الرد التلقائي", en: "Auto Reply", icon: "🤖" },
  { id: "status", label: "الحالات والتفاعل", en: "Status", icon: "👁️" },
  { id: "privacy", label: "الخصوصية والحماية", en: "Privacy", icon: "🔒" },
  { id: "config", label: "الأمان والسلوك", en: "Config", icon: "⚙️" },
  { id: "ai", label: "الذكاء الاصطناعي", en: "AI Engine", icon: "🧠" },
  { id: "owner", label: "ملف المالك", en: "Owner", icon: "👑" },
  { id: "contact", label: "جهات الاتصال", en: "Contact", icon: "📇" },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

const DEFAULT_SETTINGS: Record<string, any> = {
  ALLOWS_ONLINE: true,
  CALL_REJECT: true,
  ANTI_DELETE: true,
  ANTI_VIEWONE: true,
  ANTI_SEND: false,
  ANTI_LINK: true,
  ANTI_BOT: true,
  ANTI_MENTION: false,
  ANTI_EDIT: true,
  ANTI_ACTION: "delete",
  ANTI_WERN_COUNT: 3,
  STATUS_VIEW: true,
  STATUS_REACT: true,
  STATUS_REACT_EMOJI: "❤️",
  STATUS_SAVE: true,
  WORK_TYPE: "public",
  LANGUAGE: "arabic",
  PREFIX: ".",
  AUTO_REACT: false,
  AI_REPLY: false,
  GEMINI_API_KYES: "",
  SYSTEM_PROMPT: "",
  GEMINI_LIMIT: 100,
  AI_API_REQUEST: 0,
  OWNER_NAME: "",
  OWNER_FROM: "",
  OWNER_AGE: "",
  OWNER_IMG: "",
  CHANNEL_VOICE: "",
  ANTI_BAD: true,
  ANTI_BADS: [] as string[],
  ANTI_LINKS: ["whatsapp.com"] as string[],
};

const GATE_HINTS = {
  number: "أدخل رقم الواتساب الذي تم ربط البوت به",
  numberPh: "+967 772 847 565",
};

export default function BotSettingPage() {
  const { t, locale } = useI18n();
  const [session, setSession] = useState<BotSession | null>(null);
  const [number, setNumber] = useState(() => {
    if (typeof window === "undefined") return "";
    const sp = new URLSearchParams(window.location.search);
    return (sp.get("number") || sp.get("phone") || "").replace(/\D/g, "");
  });
  const [secret, setSecret] = useState(() => {
    if (typeof window === "undefined") return "";
    const sp = new URLSearchParams(window.location.search);
    return sp.get("secret") || "";
  });
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateLoading, setGateLoading] = useState(false);

  const [activeNav, setActiveNav] = useState<SectionId>("autoreply");
  const [settings, setSettings] = useState<Record<string, any>>({ ...DEFAULT_SETTINGS });
  const [changed, setChanged] = useState(0);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<"idle" | "saving" | "writing" | "done" | "failed">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mediaUploading, setMediaUploading] = useState<"" | "img" | "voice">("");
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const mediaRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<HTMLInputElement>(null);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStream = useRef<MediaRecorder | null>(null);
  const recChunks = useRef<Blob[]>([]);

  const updateSetting = useCallback((key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setChanged((c) => c + 1);
    setPhase("idle");
  }, []);

  const addItem = useCallback((listKey: string, item: string) => {
    const trimmed = String(item || "").trim();
    if (!trimmed) return;
    setSettings((prev) => {
      const list = Array.isArray(prev[listKey]) ? [...prev[listKey]] : [];
      if (list.includes(trimmed)) return prev;
      return { ...prev, [listKey]: [...list, trimmed] };
    });
    setChanged((c) => c + 1);
  }, []);

  const removeItem = useCallback((listKey: string, item: string) => {
    setSettings((prev) => {
      const list = Array.isArray(prev[listKey]) ? prev[listKey].filter((x: string) => x !== item) : [];
      return { ...prev, [listKey]: list };
    });
    setChanged((c) => c + 1);
  }, []);

  const confirmIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = number.replace(/\D/g, "");
    if (!digits || digits.length < 9) {
      setGateError(t("أدخل رقم واتساب صالح مع رمز الدولة"));
      return;
    }
    setGateLoading(true);
    setGateError(null);
    try {
      const res = await fetch("/api/setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: digits, secret: secret.trim(), lang: locale }),
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
        link_method: bot.link_method || "",
      });
      setSettings((prev) => ({
        ...DEFAULT_SETTINGS,
        ...prev,
        ...normalizeSettingsForUi(data.settings || {}),
        ...normalizeSettingsForUi(bot.settings || {}),
      }));
    } catch {
      setGateError(t("تعذّر الوصول إلى الخادم. حاول مرة أخرى."));
    } finally {
      setGateLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setPhase("saving");
    setSaveError(null);
    try {
      const digits = number.replace(/\D/g, "");
      const res = await fetch("/api/setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: digits,
          secret: secret.trim() || undefined,
          action: "update",
          settings: normalizeSettingsForDb(settings),
          lang: locale,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t("فشل الحفظ"));
      setPhase("saving");
      setTimeout(() => {
        setPhase("writing");
        setTimeout(() => {
          setPhase("done");
          setChanged(0);
          setTimeout(() => setPhase("idle"), 2200);
        }, 900);
      }, 400);
    } catch (e: any) {
      setPhase("failed");
      setSaveError(e.message || t("فشل الحفظ"));
      setTimeout(() => setPhase("idle"), 2500);
    } finally {
      setSaving(false);
    }
  };

  const scrollToSection = (id: SectionId) => {
    setActiveNav(id);
    const el = document.getElementById(`section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleOwnerImage = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      setSaveError(t("الصورة يجب أن تكون أقل من 2MB"));
      return;
    }
    setMediaUploading("img");
    const reader = new FileReader();
    reader.onload = () => {
      updateSetting("OWNER_IMG", String(reader.result || ""));
      setMediaUploading("");
    };
    reader.readAsDataURL(f);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recChunks.current = [];
      mr.ondataavailable = (ev) => recChunks.current.push(ev.data);
      mr.onstop = () => {
        const blob = new Blob(recChunks.current, { type: "audio/mp3" });
        const reader = new FileReader();
        reader.onload = () => {
          updateSetting("CHANNEL_VOICE", String(reader.result || ""));
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recStream.current = mr;
      setRecording(true);
      setRecordSecs(0);
      recTimer.current = setInterval(() => {
        setRecordSecs((s) => {
          if (s + 1 >= 5) {
            stopRecording();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setSaveError(t("رفض الوصول إلى الميكروفون. ارفع ملف MP3 بدلاً من ذلك."));
    }
  };

  const stopRecording = () => {
    if (recStream.current && recStream.current.state !== "inactive") recStream.current.stop();
    if (recTimer.current) clearInterval(recTimer.current);
    setRecording(false);
  };

  useEffect(() => () => {
    if (recTimer.current) clearInterval(recTimer.current);
    recStream.current?.stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const toggle = (key: string, value: boolean) => (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => updateSetting(key, !value)}
      className={`relative h-6 w-12 rounded-full transition ${value ? "bg-accent" : "bg-border"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${value ? "left-auto right-0.5 bg-white" : "left-0.5 bg-white/70"}`}
        style={value ? { transform: "translateX(-2px)" } : undefined}
      />
    </button>
  );

  const select = (key: string, value: string, options: { value: string; label: string }[]) => (
    <select
      value={value}
      onChange={(e) => updateSetting(key, e.target.value)}
      className="rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm font-medium text-fg capitalize focus:border-accent focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  const renderLoginGate = () => (
    <div className="mx-auto max-w-md px-4 py-6 sm:py-10">
      <form onSubmit={confirmIdentity} className="card relative p-6 opacity-0 animate-fade-up sm:p-8" style={{ animationDelay: "80ms" }}>
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("التحكم في الوصول")}</h1>
          <p className="mt-1 text-sm text-muted">{t("تحقق من هويتك للمتابعة")}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-fg">{t("أدخل رقم واتسابك")}</label>
            <input
              dir="ltr"
              inputMode="numeric"
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
              placeholder={GATE_HINTS.numberPh}
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm font-mono text-fg focus:border-accent focus:outline-none"
            />
            <span className="mt-1.5 block text-xs text-muted/70">{t(GATE_HINTS.number)}</span>
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
            <span className="mt-1.5 block text-xs text-muted/70">
              {t("أُرسلت إليك في رسالة الترحيب عند ربط البوت.")}
            </span>
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

          <p className="text-center text-xs text-muted/70">
            {t("🔒 محمي من قبل خوادمنا. لا تُخزَّن كلمة سرك كنص صريح.")}
          </p>
        </div>
      </form>
    </div>
  );

  const ChipList = (props: { listKey: string; add: string; bulk?: boolean; hint?: string }) => {
    const [draft, setDraft] = useState("");
    const items = Array.isArray(settings[props.listKey]) ? settings[props.listKey] : [];
    const commit = () => {
      const trimmed = draft.trim();
      if (!trimmed) return;
      if (props.bulk) {
        trimmed
          .split(/[,،\s]+/)
          .map((x) => x.trim())
          .filter(Boolean)
          .forEach((x) => addItem(props.listKey, x));
      } else {
        addItem(props.listKey, trimmed);
      }
      setDraft("");
    };
    return (
      <div className="space-y-3">
        <div className="mb-3 flex min-h-14 flex-wrap gap-2 rounded-xl border border-dashed border-border bg-elevated p-3">
          {items.map((item: string) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1.5 font-mono text-xs text-accent"
            >
              {item}
              <button type="button" onClick={() => removeItem(props.listKey, item)} className="text-accent transition hover:text-danger">
                ✕
              </button>
            </span>
          ))}
          {items.length === 0 && <span className="px-2 py-1 text-xs italic text-muted/70">{t("لا توجد عناصر مضافة بعد")}</span>}
        </div>

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            placeholder={props.add}
            className="field flex-1 text-sm"
          />
          <button type="button" onClick={commit} className="btn-primary px-5 text-sm">
            {t("إضافة")}
          </button>
        </div>
        {props.hint && <p className="text-xs italic text-muted/70">{props.hint}</p>}
      </div>
    );
  };

  if (!session) return renderLoginGate();

  const changedLabel =
    changed > 0
      ? changed === 1
        ? t("إعداد واحد بانتظار الحفظ")
        : locale === "en"
          ? `${changed} settings changed`
          : `${changed} إعدادات بانتظار الحفظ`
      : phase === "done"
        ? t("تم تحديث وحفظ الإعدادات!")
        : t("جميع الإعدادات متزامنة");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32 sm:py-12">
      {/* الرأس ومعلومات الاتصال */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 font-mono text-xs text-accent">
              ● {["connected", "pending", "disconnected"].includes(session.status) ? session.status : t("نشط")}
            </span>
            {session.name && <span className="text-xs text-muted font-mono">{session.name}</span>}
          </div>
          <Link
            href={`/bot/setting?number=${encodeURIComponent(number)}`}
            className="rounded-xl border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-muted transition hover:text-fg hover:border-accent"
          >
            {t("↻ إعادة تحميل")}
          </Link>
        </div>

        <div className="text-center animate-fade-up">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("لوحة تحكم البوت الشاملة")}</h1>
          <p className="mt-1.5 text-sm text-muted">
            {t("صفحة موحدة للتحكم الكامل في كافة إعدادات البوت والردود والحماية والحالات")}
          </p>
        </div>

        {/* شريط أزرار التنقل السريع بين الأقسام */}
        <div className="sticky top-4 z-30 flex flex-wrap justify-center gap-2 rounded-2xl border border-border/80 bg-surface/90 p-2 backdrop-blur-md shadow-lg">
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeNav === sec.id
                  ? "border border-accent bg-accent text-accent-fg shadow-[0_0_12px_rgba(0,212,255,0.3)]"
                  : "border border-border bg-elevated text-muted hover:text-fg hover:border-accent/50"
              }`}
            >
              <span>{sec.icon}</span>
              <span>{sec.label}</span>
            </button>
          ))}
        </div>

        {/* ========================================================= */}
        {/* 1. قسم الرد التلقائي (Auto Reply) أول شيء كما طلب المستخدم */}
        {/* ========================================================= */}
        <section id="section-autoreply" className="scroll-mt-24 space-y-4 pt-4">
          <div className="rounded-2xl border border-accent/30 bg-surface p-4 sm:p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-xl">🤖</span>
                <div>
                  <h2 className="font-display text-lg font-bold text-fg flex items-center gap-2">
                    {t("الرد التلقائي")}
                    <span className="rounded bg-elevated border border-border px-1.5 py-0.5 font-mono text-xs font-normal text-accent">Auto Reply</span>
                  </h2>
                  <p className="text-xs text-muted/80">{t("إعداد ردود البوت الآلية على الكلمات المحددة بالرسائل أو الصور أو الملصقات أو الصوتيات")}</p>
                </div>
              </div>
            </div>
            <AutoReplyTab key={session?.id || "autoreply"} number={number} secret={secret.trim()} />
          </div>
        </section>

        {/* ========================================================= */}
        {/* 2. قسم الحالات والتفاعل (Status) كما طلب المستخدم */}
        {/* ========================================================= */}
        <section id="section-status" className="scroll-mt-24 pt-4">
          <div className="card p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-xl">👁️</span>
              <div>
                <h2 className="font-display text-lg font-bold text-fg flex items-center gap-2">
                  {t("الحالات والتفاعل")}
                  <span className="rounded bg-elevated border border-border px-1.5 py-0.5 font-mono text-xs font-normal text-accent">Status & Stories</span>
                </h2>
                <p className="text-xs text-muted/80">{t("مشاهدة الحالات تلقائياً، والتفاعل بالإيموجي، وإعادة توجيه وسائط الحالات")}</p>
              </div>
            </div>

            <TField
              label={t("مشاهدة الحالات تلقائياً")}
              enBadge="Status View"
              sub={t("يقوم البوت بفتح ورؤية حالات جهات اتصالك فور نشرها تلقائياً")}
              control={toggle("STATUS_VIEW", !!settings.STATUS_VIEW)}
            />
            <TField
              label={t("التفاعل مع الحالات المعروضة")}
              enBadge="Status React"
              sub={t("إرسال تفاعل إيموجي تلقائي على الحالات التي يشاهدها البوت")}
              control={toggle("STATUS_REACT", !!settings.STATUS_REACT)}
            />
            <TField
              label={t("إيموجي التفاعل مع الحالات")}
              enBadge="React Emoji"
              sub={t("اختر الإيموجي الذي سيضعه البوت على حالات أصدقائك")}
              control={
                <div className="flex items-center gap-2">
                  {["❤️", "🔥", "👍", "😍", "🎉"].map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => updateSetting("STATUS_REACT_EMOJI", emo)}
                      className={`rounded-lg border border-border bg-elevated px-2.5 py-1.5 text-base transition ${
                        settings.STATUS_REACT_EMOJI === emo ? "border-accent shadow-[0_0_8px_rgba(0,212,255,0.3)] bg-accent-soft" : ""
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              }
            />
            <TField
              label={t("حفظ وسائط الحالات")}
              enBadge="Status Save"
              sub={t("إعادة توجيه أي صورة أو فيديو حالة ينشرها أصدقاؤك إلى محادثتك الخاصة")}
              control={toggle("STATUS_SAVE", !!settings.STATUS_SAVE)}
            />
            <TField
              label={t("التفاعل مع كل رسالة واردة")}
              enBadge="Auto React"
              sub={t("وضع إيموجي تفاعل تلقائي على كل رسالة يستلمها البوت في الخاص أو المجموعات")}
              control={toggle("AUTO_REACT", !!settings.AUTO_REACT)}
            />
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. قسم ضوابط الخصوصية والحماية (Privacy - اللي سميتها براي) */}
        {/* ========================================================= */}
        <section id="section-privacy" className="scroll-mt-24 pt-4">
          <div className="card p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-xl">🔒</span>
              <div>
                <h2 className="font-display text-lg font-bold text-fg flex items-center gap-2">
                  {t("ضوابط الخصوصية والحماية")}
                  <span className="rounded bg-accent-soft border border-accent/30 px-2 py-0.5 font-mono text-xs font-bold text-accent">Privacy - الخصوصية</span>
                </h2>
                <p className="text-xs text-muted/80">{t("إدارة سرية حسابك واستعادة الرسائل المحذوفة وحظر الإزعاج")}</p>
              </div>
            </div>

            <TField
              label={t("إبقاء البوت متصلاً دائماً")}
              enBadge="Allow Online"
              sub={t("إظهار حالة حساب البوت 'متصل الآن' على مدار الساعة طوال الوقت")}
              control={toggle("ALLOWS_ONLINE", !!settings.ALLOWS_ONLINE)}
            />
            <TField
              label={t("رفض المكالمات تلقائياً")}
              enBadge="Call Reject"
              sub={t("رفض أي مكالمة صوتية أو مرئية واردة لرقم البوت تلقائياً لمنع الإزعاج")}
              control={toggle("CALL_REJECT", !!settings.CALL_REJECT)}
            />
            <TField
              label={t("استعادة الرسائل المحذوفة")}
              enBadge="Anti Delete"
              sub={t("عندما يحذف أي شخص رسالة أرسلها لك، يقوم البوت بإعادة إرسالها إليك فوراً")}
              control={toggle("ANTI_DELETE", !!settings.ANTI_DELETE)}
            />
            <TField
              label={t("حفظ وسائط العرض لمرة واحدة")}
              enBadge="Anti View Once"
              sub={t("الصور والفيديوهات المقيدة بمشاهدة واحدة يحفظها البوت ويرسلها لك لتشاهدها بلا حدود")}
              control={toggle("ANTI_VIEWONE", !!settings.ANTI_VIEWONE)}
            />
            <TField
              label={t("حظر البث العشوائي")}
              enBadge="Anti Send"
              sub={t("حظر ومنع الرسائل الصادرة العشوائية أو رسائل البث غير المرغوبة")}
              control={toggle("ANTI_SEND", !!settings.ANTI_SEND)}
            />
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. قسم الأمان وسلوك وتشغيل البوت (Config) */}
        {/* ========================================================= */}
        <section id="section-config" className="scroll-mt-24 space-y-6 pt-4">
          <div className="card p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-xl">🛡️</span>
              <div>
                <h2 className="font-display text-lg font-bold text-fg flex items-center gap-2">
                  {t("حماية المجموعات والأمان")}
                  <span className="rounded bg-elevated border border-border px-1.5 py-0.5 font-mono text-xs font-normal text-accent">Group Security</span>
                </h2>
                <p className="text-xs text-muted/80">{t("منع الروابط، الكلمات البذيئة، طرد البوتات الدخيلة، ومنع المنشن الجماعي")}</p>
              </div>
            </div>

            <TField
              label={t("حظر روابط المجموعات والمواقع")}
              enBadge="Anti Link"
              sub={t("حظر ومسح روابط الدعوة والمواقع المشبوهة داخل المجموعات")}
              control={toggle("ANTI_LINK", !!settings.ANTI_LINK)}
            />
            {!!settings.ANTI_LINK && (
              <div className="pl-1 -mt-2">
                <ChipList listKey="ANTI_LINKS" add={t("إضافة نطاق مخصص (example.com)")} hint={t("الروابط المطابقة لهذه النطاقات يتم حظرها فوراً.")} />
              </div>
            )}

            <TField
              label={t("تصفية الكلمات المسيئة")}
              enBadge="Anti Bad Words"
              sub={t("رصد الشتائم والكلمات البذيئة ومنعها فوراً في المجموعات")}
              control={toggle("ANTI_BAD", !!settings.ANTI_BAD)}
            />
            {!!settings.ANTI_BAD && (
              <div className="pl-1 -mt-2">
                <ChipList listKey="ANTI_BADS" add={t("إضافة كلمات مفصولة بفواصل")} bulk hint={t("كلمات مفصولة بفواصل يتم حظرها من الرسائل.")} />
              </div>
            )}

            <TField
              label={t("طرد البوتات الدخيلة")}
              enBadge="Anti Bot"
              sub={t("إزالة أي بوت آخر يتم إضافته إلى القروب لحماية المجموعة ومنع التخريب")}
              control={toggle("ANTI_BOT", !!settings.ANTI_BOT)}
            />
            <TField
              label={t("حظر الإشارات والمنشن الجماعي")}
              enBadge="Anti Mention"
              sub={t("منع الإشارات الجماعية المزعجة (@everyone / @all) داخل المجموعات")}
              control={toggle("ANTI_MENTION", !!settings.ANTI_MENTION)}
            />
            <TField
              label={t("كشف تعديل الرسائل")}
              enBadge="Anti Edit"
              sub={t("إذا قام شخص بتعديل رسالته في الخاص، يرسل لك البوت النسخة الأصلية قبل التعديل")}
              control={toggle("ANTI_EDIT", !!settings.ANTI_EDIT)}
            />
          </div>

          <div className="card p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-xl">⚙️</span>
              <div>
                <h2 className="font-display text-lg font-bold text-fg flex items-center gap-2">
                  {t("سلوك وتشغيل البوت")}
                  <span className="rounded bg-elevated border border-border px-1.5 py-0.5 font-mono text-xs font-normal text-accent">Bot Behavior</span>
                </h2>
                <p className="text-xs text-muted/80">{t("الإجراء عند المخالفات، ونوع عمل البوت، واللغة وبادئة الأوامر")}</p>
              </div>
            </div>

            <TField
              label={t("الإجراء العقابي")}
              enBadge="Anti Action"
              sub={t("الإجراء الذي ينفذه البوت عند انتهاك أي قاعدة")}
              control={select("ANTI_ACTION", settings.ANTI_ACTION || "delete", [
                { value: "delete", label: t("حذف الرسالة فقط") },
                { value: "wern", label: t("توجيه تحذير") },
                { value: "kick", label: t("طرد العضو فوراً") },
              ])}
            />
            <TField
              label={t("عدد التحذيرات قبل الطرد")}
              enBadge="Warn Count"
              sub={t("كم مخالفة مسموحة للعضو قبل أن يقوم البوت بطرده تلقائياً")}
              control={
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.ANTI_WERN_COUNT}
                  onChange={(e) => updateSetting("ANTI_WERN_COUNT", Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-20 rounded-lg border border-border bg-elevated px-3 py-1.5 font-mono text-sm text-accent text-center"
                />
              }
            />
            <TField
              label={t("نوع عمل البوت")}
              enBadge="Work Mode"
              sub={t("عام للجميع (Public)، أو خاص بك كمالك فقط (Private)، أو للمشرفين (Admin)")}
              control={select("WORK_TYPE", settings.WORK_TYPE || "public", [
                { value: "public", label: t("عام للجميع (Public)") },
                { value: "private", label: t("خاص بالمالك فقط (Private)") },
                { value: "admin", label: t("لمشرفي القروبات فقط (Admin)") },
              ])}
            />
            <TField
              label={t("لغة البوت")}
              enBadge="Language"
              sub={t("لغة نصوص وقوائم ورسائل البوت")}
              control={select("LANGUAGE", settings.LANGUAGE || "arabic", [
                { value: "arabic", label: "العربية" },
                { value: "english", label: "English" },
                { value: "sinhala", label: "Sinhala" },
              ])}
            />
            <TField
              label={t("رمز وبادئة الأوامر")}
              enBadge="Prefix"
              sub={t("الرمز أو الحرف الواحد الذي يبدأ به أي أمر (مثل . أو ! أو /)")}
              control={
                <input
                  maxLength={1}
                  value={settings.PREFIX}
                  onChange={(e) => updateSetting("PREFIX", e.target.value)}
                  className="w-16 rounded-lg border border-border bg-elevated px-2 py-1.5 text-center font-mono text-base font-bold text-accent"
                />
              }
            />
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. قسم محرك الذكاء الاصطناعي (AI & Gemini Engine) */}
        {/* ========================================================= */}
        <section id="section-ai" className="scroll-mt-24 pt-4">
          <div className="card p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-xl">🧠</span>
              <div>
                <h2 className="font-display text-lg font-bold text-fg flex items-center gap-2">
                  {t("محرك الرد بالذكاء الاصطناعي")}
                  <span className="rounded bg-elevated border border-border px-1.5 py-0.5 font-mono text-xs font-normal text-accent">Gemini AI</span>
                </h2>
                <p className="text-xs text-muted/80">{t("الرد الذكي على المحادثات والأسئلة تلقائياً عبر نموذج Google Gemini")}</p>
              </div>
            </div>

            <TField
              label={t("تفعيل الرد الذكي")}
              enBadge="AI Reply"
              sub={t("تشغيل الذكاء الاصطناعي للإجابة على استفسارات المستخدمين")}
              control={toggle("AI_REPLY", !!settings.AI_REPLY)}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">{t("مفاتيح Google Gemini API Key")}</label>
              <textarea
                value={settings.GEMINI_API_KYES}
                onChange={(e) => updateSetting("GEMINI_API_KYES", e.target.value)}
                placeholder="AIzaSy..."
                rows={2}
                className="field resize-none text-sm font-mono placeholder:text-muted/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">{t("توجيهات وشخصية الذكاء الاصطناعي (System Prompt)")}</label>
              <textarea
                value={settings.SYSTEM_PROMPT}
                onChange={(e) => updateSetting("SYSTEM_PROMPT", e.target.value)}
                placeholder={locale === "en" ? "You are a friendly assistant..." : "أنت مساعد ودود ومحترف تجيب بلباقة واختصار..."}
                rows={3}
                className="field resize-none text-sm placeholder:text-muted/40"
              />
              <span className="mt-1 block text-xs text-muted/70">{t("بحد أقصى 2000 حرف. اتركه فارغاً لاستخدام الشخصية الافتراضية.")}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">{t("الحد اليومي")}</label>
                <input
                  readOnly
                  value={settings.GEMINI_LIMIT}
                  className="w-full rounded-lg border border-border bg-elevated px-3 py-2 font-mono text-sm text-accent"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">{t("طلبات اليوم المستهلكة")}</label>
                <input
                  readOnly
                  value={settings.AI_API_REQUEST}
                  className="w-full rounded-lg border border-border bg-elevated px-3 py-2 font-mono text-sm text-accent"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 6. قسم ملف وهوية المالك (Owner Profile) */}
        {/* ========================================================= */}
        <section id="section-owner" className="scroll-mt-24 pt-4">
          <div className="card p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-xl">👑</span>
              <div>
                <h2 className="font-display text-lg font-bold text-fg flex items-center gap-2">
                  {t("ملف وهوية المالك")}
                  <span className="rounded bg-elevated border border-border px-1.5 py-0.5 font-mono text-xs font-normal text-accent">Owner Profile</span>
                </h2>
                <p className="text-xs text-muted/80">{t("معلومات صاحب البوت التي تظهر في بطاقة التعريف وبداية التشغيل")}</p>
              </div>
            </div>

            <TField
              label={t("اسم مالك البوت")}
              enBadge="Owner Name"
              sub={t("الاسم المعروض كمالك للبوت")}
              control={<TextInput value={settings.OWNER_NAME} onChange={(v) => updateSetting("OWNER_NAME", v)} placeholder={t("اسم المالك")} />}
            />
            <TField
              label={t("الدولة والمدينة")}
              enBadge="Owner From"
              sub={t("الموقع أو البلد")}
              control={<TextInput value={settings.OWNER_FROM} onChange={(v) => updateSetting("OWNER_FROM", v)} placeholder={t("صنعاء، اليمن")} />}
            />
            <TField
              label={t("عمر المالك")}
              enBadge="Owner Age"
              sub={t("يظهر في بطاقة تعريف البوت")}
              control={
                <input
                  inputMode="numeric"
                  value={settings.OWNER_AGE}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    if (v.length <= 3) updateSetting("OWNER_AGE", v);
                  }}
                  placeholder="25"
                  className="w-20 rounded-lg border border-border bg-elevated px-2 py-1.5 text-center font-mono text-sm text-accent"
                />
              }
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border pt-4">
              <div>
                <p className="text-sm font-semibold text-fg">{t("شعار وصورة المالك")}</p>
                <p className="mt-0.5 text-xs text-muted/70">{t("PNG/JPG بحد أقصى 2MB تظهر كأيقونة تعريفية")}</p>
              </div>
              <div className="flex items-center gap-3">
                {settings.OWNER_IMG ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.OWNER_IMG} alt="Owner" className="h-14 w-14 rounded-xl border border-border bg-elevated object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-xl border border-border bg-elevated flex items-center justify-center text-muted">📷</div>
                )}
                <button
                  type="button"
                  disabled={mediaUploading === "img"}
                  onClick={() => mediaRef.current?.click()}
                  className="cursor-pointer rounded-lg border border-dashed border-border px-4 py-2 text-sm transition hover:border-accent disabled:opacity-50"
                >
                  {mediaUploading === "img" ? t("جارٍ الرفع...") : settings.OWNER_IMG ? t("تغيير الصورة") : t("رفع صورة")}
                </button>
              </div>
            </div>
            <input ref={mediaRef} type="file" accept="image/*" hidden onChange={(e) => handleOwnerImage(e.target.files)} />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border pt-4">
              <div>
                <p className="text-sm font-semibold text-fg">{t("بصمة ومقدمة صوتية (MP3 أقل من 5 ثوانٍ)")}</p>
                <p className="mt-0.5 text-xs text-muted/70">{t("مقطع صوتي قصير يُشغل في مقدمة أو تذييل البوت")}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {recording ? (
                  <button type="button" onClick={stopRecording} className="rounded-lg border border-danger/50 bg-danger/10 px-4 py-2 text-sm text-danger animate-pulse">
                    {locale === "en" ? `Stop (${recordSecs}s)` : `إيقاف (${recordSecs}ث)`}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={mediaUploading === "voice"}
                    onClick={startRecording}
                    className="cursor-pointer rounded-lg border border-dashed border-border px-4 py-2 text-sm transition hover:border-accent disabled:opacity-50"
                  >
                    {mediaUploading === "voice" ? t("جارٍ الرفع...") : t("🎙️ تسجيل صوتي")}
                  </button>
                )}
                <span className="text-xs text-muted">{t("أو")}</span>
                <button
                  type="button"
                  disabled={mediaUploading === "voice"}
                  onClick={() => voiceRef.current?.click()}
                  className="cursor-pointer rounded-lg border border-dashed border-border px-4 py-2 text-sm transition hover:border-accent disabled:opacity-50"
                >
                  {t("رفع ملف MP3")}
                </button>
              </div>
            </div>
            <input
              ref={voiceRef}
              type="file"
              accept="audio/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 2 * 1024 * 1024) {
                  setSaveError(t("الملف الصوتي يجب أن يكون أقل من 2MB"));
                  return;
                }
                setMediaUploading("voice");
                const reader = new FileReader();
                reader.onload = () => {
                  updateSetting("CHANNEL_VOICE", String(reader.result || ""));
                  setMediaUploading("");
                };
                reader.readAsDataURL(f);
              }}
            />
          </div>
        </section>

        {/* ========================================================= */}
        {/* 7. قسم حفظ جهات الاتصال (Contact) */}
        {/* ========================================================= */}
        <section id="section-contact" className="scroll-mt-24 space-y-4 pt-4">
          <div className="rounded-2xl border border-accent/30 bg-surface p-4 sm:p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-xl">📇</span>
                <div>
                  <h2 className="font-display text-lg font-bold text-fg flex items-center gap-2">
                    {t("حفظ جهات الاتصال")}
                    <span className="rounded bg-elevated border border-border px-1.5 py-0.5 font-mono text-xs font-normal text-accent">Contact Auto Save</span>
                  </h2>
                  <p className="text-xs text-muted/80">{t("حفظ أرقام الأشخاص الذين يتواصلون مع البوت تلقائياً وتصديرها كملف vCard لهاتفك")}</p>
                </div>
              </div>
            </div>
            <ContactTab key={session?.id || "contact"} number={number} secret={secret.trim()} />
          </div>
        </section>

        {/* ========================================================= */}
        {/* 8. بطاقة "حفظ الكل" في نهاية الصفحة كما طلب المستخدم */}
        {/* ========================================================= */}
        <div className="mt-12 rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-surface via-surface to-accent/5 p-6 sm:p-8 text-center space-y-4 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-3xl shadow-inner">
            💾
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-fg">{t("حفظ وتأكيد كافة الإعدادات")}</h3>
            <p className="text-sm text-muted max-w-md mx-auto mt-1.5">
              {changed > 0
                ? (locale === "en"
                    ? `You have ${changed} changed settings ready to be saved.`
                    : `لديك ${changed} إعدادات معدّلة بانتظار الحفظ. اضغط على الزر لاعتمادها فوراً على البوت.`)
                : t("كافة الإعدادات متزامنة ومحفوظة حالياً على خوادم البوت.")}
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || changed === 0}
              className="btn-primary inline-flex items-center justify-center gap-3 px-10 py-3.5 text-base font-bold shadow-xl shadow-accent/25 transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {saving ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-fg border-t-transparent" />
                  <span>{t("جارٍ حفظ كافة التعديلات...")}</span>
                </>
              ) : (
                <>
                  <span className="text-xl">💾</span>
                  <span>{t("حفظ الكل الآن")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* الشريط العائم المستمر للحفظ السريع أثناء التمرير */}
      <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full border border-accent bg-surface/95 px-6 py-3 shadow-2xl backdrop-blur-md">
        <span className="text-sm font-bold text-fg">{changedLabel}</span>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || changed === 0}
          className="btn-primary px-5 py-2 text-sm font-semibold shadow-lg shadow-accent/20 disabled:opacity-50"
        >
          {saving ? t("جارٍ الحفظ...") : t("حفظ الكل")}
        </button>
      </div>

      {/* شاشة مؤشر الحفظ والكتابة في قاعدة البيانات */}
      {(phase === "saving" || phase === "writing") && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-xs">
          <div className="card flex flex-col items-center gap-4 p-8">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-3 text-sm tracking-widest text-fg">
              {phase === "saving" ? t("جارٍ الحفظ...") : t("جارٍ الكتابة في قاعدة البيانات...")}
            </p>
          </div>
        </div>
      )}

      {/* رسالة نجاح الحفظ */}
      {phase === "done" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="card flex flex-col items-center gap-2 p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
              <span className="h-10 w-10 text-success text-3xl font-bold flex items-center justify-center">✓</span>
            </div>
            <p className="mt-4 text-lg font-bold text-success">{t("تم تحديث كافة الإعدادات بنجاح!")}</p>
          </div>
        </div>
      )}

      {/* رسالة خطأ الحفظ */}
      {phase === "failed" && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-danger/40 bg-surface px-5 py-3 text-sm text-danger shadow-2xl animate-shake">
          ⚠ {saveError || t("فشل الحفظ")}
        </div>
      )}
    </div>
  );
}

function TField({
  label,
  enBadge,
  sub,
  control,
}: {
  label: string;
  enBadge?: string;
  sub: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4 last:border-b-0">
      <div className="min-w-0 flex-1 pe-2">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-fg">{label}</p>
          {enBadge && (
            <span className="rounded bg-elevated border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted">
              {enBadge}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted/80">{sub}</p>
      </div>
      <div className="flex-shrink-0 self-end sm:self-center">{control}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-44 rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-fg placeholder:text-muted/40 sm:w-52"
    />
  );
}

export function normalizeSettingsForUi(raw: Record<string, any>): Record<string, any> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, any> = {};
  const map: Record<string, string> = {
    showOnline: "ALLOWS_ONLINE",
    rejectCalls: "CALL_REJECT",
    antiDelete: "ANTI_DELETE",
    antiViewOnce: "ANTI_VIEWONE",
    antiSend: "ANTI_SEND",
    antiLink: "ANTI_LINK",
    antiBad: "ANTI_BAD",
    antiBot: "ANTI_BOT",
    antiMention: "ANTI_MENTION",
    antiEdit: "ANTI_EDIT",
    antiAction: "ANTI_ACTION",
    antiWarnCount: "ANTI_WERN_COUNT",
    statusView: "STATUS_VIEW",
    statusReact: "STATUS_REACT",
    statusSave: "STATUS_SAVE",
    statusReactEmoji: "STATUS_REACT_EMOJI",
    workMode: "WORK_TYPE",
    language: "LANGUAGE",
    prefix: "PREFIX",
    autoReact: "AUTO_REACT",
    smartReply: "AI_REPLY",
    geminiApiKeys: "GEMINI_API_KYES",
    systemPrompt: "SYSTEM_PROMPT",
    ownerName: "OWNER_NAME",
    ownerFrom: "OWNER_FROM",
    ownerAge: "OWNER_AGE",
    ownerImg: "OWNER_IMG",
    channelVoice: "CHANNEL_VOICE",
    autoReply: "AUTO_REPLY",
  };
  for (const [from, to] of Object.entries(map)) {
    if (raw[from] !== undefined) out[to] = raw[from];
  }
  if (Array.isArray(raw.bannedWords)) out.ANTI_BADS = raw.bannedWords;
  if (Array.isArray(raw.firewallDomains)) out.ANTI_LINKS = raw.firewallDomains;
  else if (typeof raw.firewallDomains === "string" && raw.firewallDomains) out.ANTI_LINKS = [raw.firewallDomains];
  return out;
}

function normalizeSettingsForDb(s: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  const map: Record<string, string> = {
    ALLOWS_ONLINE: "showOnline",
    CALL_REJECT: "rejectCalls",
    ANTI_DELETE: "antiDelete",
    ANTI_VIEWONE: "antiViewOnce",
    ANTI_SEND: "antiSend",
    ANTI_LINK: "antiLink",
    ANTI_BAD: "antiBad",
    ANTI_BOT: "antiBot",
    ANTI_MENTION: "antiMention",
    ANTI_EDIT: "antiEdit",
    ANTI_ACTION: "antiAction",
    ANTI_WERN_COUNT: "antiWarnCount",
    STATUS_VIEW: "statusView",
    STATUS_REACT: "statusReact",
    STATUS_REACT_EMOJI: "statusReactEmoji",
    STATUS_SAVE: "statusSave",
    WORK_TYPE: "workMode",
    LANGUAGE: "language",
    PREFIX: "prefix",
    AUTO_REACT: "autoReact",
    AI_REPLY: "smartReply",
    GEMINI_API_KYES: "geminiApiKeys",
    SYSTEM_PROMPT: "systemPrompt",
    OWNER_NAME: "ownerName",
    OWNER_FROM: "ownerFrom",
    OWNER_AGE: "ownerAge",
    OWNER_IMG: "ownerImg",
    CHANNEL_VOICE: "channelVoice",
    AUTO_REPLY: "autoReply",
  };
  for (const [from, to] of Object.entries(map)) {
    if (s[from] !== undefined) out[to] = s[from];
  }
  if (Array.isArray(s.ANTI_BADS)) out.bannedWords = s.ANTI_BADS.filter(Boolean);
  if (Array.isArray(s.ANTI_LINKS)) out.firewallDomains = s.ANTI_LINKS.filter(Boolean);
  return out;
}