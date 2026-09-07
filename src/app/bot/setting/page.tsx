"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { ContactTab } from "../contact/page";
import { AutoReplyTab } from "../autoreply/page";

type Section = "privacy" | "status" | "config" | "owner" | "contact" | "autoreply";

type BotSession = {
  id: string;
  name: string;
  status: string;
  linked_number: string;
  link_method: string;
};

const TABS: { id: Section; label: string }[] = [
  { id: "privacy", label: "Privacy" },
  { id: "status", label: "Status" },
  { id: "config", label: "Config" },
  { id: "owner", label: "Owner" },
  { id: "contact", label: "Contact" },
  { id: "autoreply", label: "Auto Reply" },
];

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

  const [activeSection, setActiveSection] = useState<Section>(() => {
    if (typeof window === "undefined") return "privacy";
    const tab = new URLSearchParams(window.location.search).get("tab") as Section | null;
    return tab && TABS.some((t) => t.id === tab) ? tab : "privacy";
  });
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

  const renderFieldRows = (section: Section) => {
    switch (section) {
      case "privacy":
        return (
          <div className="card p-4 space-y-5">
            <h3 className="mb-4 border-b border-border pb-2 font-display text-lg font-bold text-fg">{t("ضوابط الخصوصية")}</h3>
            <TField label="Allow Online" sub={t("إبقاء حالة البوت متصلة دائماً")} control={toggle("ALLOWS_ONLINE", !!settings.ALLOWS_ONLINE)} />
            <TField label="Call Reject" sub={t("رفض المكالمات الواردة تلقائياً")} control={toggle("CALL_REJECT", !!settings.CALL_REJECT)} />
            <TField label="Anti Delete" sub={t("استعادة الرسائل المحذوفة إلى محادثتك")} control={toggle("ANTI_DELETE", !!settings.ANTI_DELETE)} />
            <TField label="Anti View Once" sub={t("حفظ الوسائط المقيدة بلا حدود")} control={toggle("ANTI_VIEWONE", !!settings.ANTI_VIEWONE)} />
            <TField label="Anti Send" sub={t("حظر البث الصادر الخاطئ")} control={toggle("ANTI_SEND", !!settings.ANTI_SEND)} />
          </div>
        );
      case "status":
        return (
          <div className="card p-4 space-y-5">
            <h3 className="mb-4 border-b border-border pb-2 font-display text-lg font-bold text-fg">{t("عرض الحالة والتفاعل")}</h3>
            <TField label="Status View" sub={t("عرض حالات المتابعين فوراً")} control={toggle("STATUS_VIEW", !!settings.STATUS_VIEW)} />
            <TField label="Status React" sub={t("التفاعل مع القصص المعروضة")} control={toggle("STATUS_REACT", !!settings.STATUS_REACT)} />
            <TField
              label="React Emoji"
              sub={t("الإيموجي المُرسل مع كل حالة")}
              control={
                <div className="flex items-center gap-2">
                  {["❤️", "🔥", "👍", "😍", "🎉"].map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => updateSetting("STATUS_REACT_EMOJI", emo)}
                      className={`rounded-lg border border-border bg-elevated px-2 py-1 text-sm transition ${
                        settings.STATUS_REACT_EMOJI === emo ? "border-accent shadow-[0_0_8px_rgba(0,212,255,0.3)]" : ""
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              }
            />
            <TField label="Status Save" sub={t("إعادة توجيه وسائط الحالة إلى محادثتك")} control={toggle("STATUS_SAVE", !!settings.STATUS_SAVE)} />
            <TField label="Auto React" sub={t("التفاعل مع كل رسالة واردة")} control={toggle("AUTO_REACT", !!settings.AUTO_REACT)} />
          </div>
        );
      case "config":
        return (
          <div className="space-y-6">
            <div className="card p-4 space-y-5">
              <h3 className="mb-4 border-b border-border pb-2 font-display text-lg font-bold text-fg">{t("الأمان والمجموعات")}</h3>
              <TField label="Anti Link" sub={t("حظر روابط الدعوة في المجموعات")} control={toggle("ANTI_LINK", !!settings.ANTI_LINK)} />
              {!!settings.ANTI_LINK && (
                <div className="pl-1 -mt-2">
                  <ChipList listKey="ANTI_LINKS" add={t("إضافة نطاق مخصص (example.com)")} hint={t("الروابط المطابقة لهذه النطاقات يتم حظرها.")} />
                </div>
              )}
              <TField label="Anti Bad Words" sub={t("تصفية الكلمات المسيئة")} control={toggle("ANTI_BAD", !!settings.ANTI_BAD)} />
              {!!settings.ANTI_BAD && (
                <div className="pl-1 -mt-2">
                  <ChipList listKey="ANTI_BADS" add={t("إضافة كلمات مفصولة بفواصل")} bulk hint={t("كلمات مفصولة بفواصل (الحد الأقصى 100 كلمة).")} />
                </div>
              )}
              <TField label="Anti Bot" sub={t("إزالة البوتات الثانوية غير الرسمية")} control={toggle("ANTI_BOT", !!settings.ANTI_BOT)} />
              <TField label="Anti Mention" sub={t("حظر الإشارات الجماعية @")} control={toggle("ANTI_MENTION", !!settings.ANTI_MENTION)} />
              <TField label="Anti Edit" sub={t("تسجيل التعديلات في محادثتك الخاصة")} control={toggle("ANTI_EDIT", !!settings.ANTI_EDIT)} />
            </div>

            <div className="card p-4 space-y-5">
              <h3 className="mb-4 border-b border-border pb-2 font-display text-lg font-bold text-fg">{t("سلوك البوت")}</h3>
              <TField
                label="Anti Action"
                sub={t("الإجراء عند تفعيل قاعدة")}
                control={select("ANTI_ACTION", settings.ANTI_ACTION || "delete", [
                  { value: "delete", label: t("حذف") },
                  { value: "wern", label: t("تحذير") },
                  { value: "kick", label: t("طرد") },
                ])}
              />
              <TField
                label="Warn Count"
                sub={t("التحذيرات قبل الطرد")}
                control={
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.ANTI_WERN_COUNT}
                    onChange={(e) => updateSetting("ANTI_WERN_COUNT", Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-16 rounded-lg border border-border bg-elevated px-2 py-1 font-mono text-sm text-accent"
                  />
                }
              />
              <TField
                label="Work Type"
                sub={t("عام للجميع، أو خاص بالمالك")}
                control={select("WORK_TYPE", settings.WORK_TYPE || "public", [
                  { value: "public", label: t("عام") },
                  { value: "private", label: t("خاص") },
                  { value: "admin", label: t("مشرف") },
                ])}
              />
              <TField
                label="Language"
                sub={t("لغة الردود والقوائم")}
                control={select("LANGUAGE", settings.LANGUAGE || "arabic", [
                  { value: "english", label: "English" },
                  { value: "sinhala", label: "Sinhala" },
                  { value: "arabic", label: "العربية" },
                ])}
              />
              <TField
                label="Prefix (single char)"
                sub={t("رمز واحد قبل الأوامر")}
                control={
                  <input
                    maxLength={1}
                    value={settings.PREFIX}
                    onChange={(e) => updateSetting("PREFIX", e.target.value)}
                    className="w-14 rounded-lg border border-border bg-elevated px-2 py-1 text-center font-mono text-sm text-accent"
                  />
                }
              />
            </div>
          </div>
        );
      case "owner":
        return (
          <div className="space-y-6">
            <div className="card p-4 space-y-5">
              <h3 className="mb-4 border-b border-border pb-2 font-display text-lg font-bold text-fg">{t("ملف المالك")}</h3>
              <TField label="Owner Name" sub={t("اسم مالك البوت")} control={<TextInput value={settings.OWNER_NAME} onChange={(v) => updateSetting("OWNER_NAME", v)} placeholder={t("اسم المالك")} />} />
              <TField label="Owner From" sub={t("الدولة / المدينة")} control={<TextInput value={settings.OWNER_FROM} onChange={(v) => updateSetting("OWNER_FROM", v)} placeholder={t("المدينة، الدولة")} />} />
              <TField
                label="Owner Age"
                sub={t("يظهر في بطاقة ملف البوت")}
                control={
                  <input
                    inputMode="numeric"
                    value={settings.OWNER_AGE}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      if (v.length <= 3) updateSetting("OWNER_AGE", v);
                    }}
                    placeholder="25"
                    className="w-16 rounded-lg border border-border bg-elevated px-2 py-1 text-center font-mono text-sm text-accent"
                  />
                }
              />

              <div className="flex items-center justify-between border-t border-border pt-4">
                <div>
                  <p className="text-sm font-medium text-fg">{t("شعار المالك")}</p>
                  <p className="mt-0.5 text-xs text-muted/70">{t("PNG/JPG بحد أقصى 2MB")}</p>
                </div>
                <div className="flex items-center gap-3">
                  {settings.OWNER_IMG ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={settings.OWNER_IMG} alt="Owner" className="h-14 w-14 rounded-xl border border-border bg-elevated object-cover" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl border border-border bg-elevated" />
                  )}
                  <button
                    type="button"
                    disabled={mediaUploading === "img"}
                    onClick={() => mediaRef.current?.click()}
                    className="cursor-pointer rounded-lg border border-dashed border-border px-4 py-2 text-sm transition hover:border-accent disabled:opacity-50"
                  >
                    {mediaUploading === "img" ? t("جارٍ الرفع...") : settings.OWNER_IMG ? t("تغيير شعار") : t("رفع")}
                  </button>
                </div>
              </div>
              <input ref={mediaRef} type="file" accept="image/*" hidden onChange={(e) => handleOwnerImage(e.target.files)} />

              <div className="flex items-center justify-between border-t border-border pt-4">
                <div>
                  <p className="text-sm font-medium text-fg">{t("تذييل صوتي (MP3 < 5 ثوانٍ)")}</p>
                  <p className="mt-0.5 text-xs text-muted/70">{t("MP3 أقل من 5 ثوانٍ — يُشغَّل في مقدمة البوت")}</p>
                </div>
                <div className="flex items-center gap-2">
                  {recording ? (
                    <button type="button" onClick={stopRecording} className="rounded-lg border border-danger/50 bg-danger/10 px-4 py-2 text-sm text-danger">
                      {locale === "en" ? `Stop (${recordSecs}s)` : `إيقاف (${recordSecs}ث)`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={mediaUploading === "voice"}
                      onClick={startRecording}
                      className="cursor-pointer rounded-lg border border-dashed border-border px-4 py-2 text-sm transition hover:border-accent disabled:opacity-50"
                    >
                      {mediaUploading === "voice" ? t("جارٍ رفع الصوت...") : t("تسجيل (5 ثوانٍ)")}
                    </button>
                  )}
                  <span className="text-xs text-muted">{t("أو")}</span>
                  <button
                    type="button"
                    disabled={mediaUploading === "voice"}
                    onClick={() => voiceRef.current?.click()}
                    className="cursor-pointer rounded-lg border border-dashed border-border px-4 py-2 text-sm transition hover:border-accent disabled:opacity-50"
                  >
                    {t("رفع MP3")}
                  </button>
                </div>
              </div>
              <input ref={voiceRef} type="file" accept="audio/*" hidden onChange={(e) => {
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
              }} />
            </div>

            <div className="card p-4 space-y-5">
              <h3 className="mb-4 border-b border-border pb-2 font-display text-lg font-bold text-fg">{t("محرك الذكاء الاصطناعي")}</h3>
              <TField label="AI Reply" sub={t("ردود ذكية عبر Gemini")} control={toggle("AI_REPLY", !!settings.AI_REPLY)} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">Gemini API Keys</label>
                <textarea
                  value={settings.GEMINI_API_KYES}
                  onChange={(e) => updateSetting("GEMINI_API_KYES", e.target.value)}
                  placeholder="AIzaSy..."
                  rows={2}
                  className="field resize-none text-sm font-mono placeholder:text-muted/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted">AI System Prompt</label>
                <textarea
                  value={settings.SYSTEM_PROMPT}
                  onChange={(e) => updateSetting("SYSTEM_PROMPT", e.target.value)}
                  placeholder={locale === "en" ? "You are a friendly assistant..." : "أنت مساعد ودود..."}
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
                  <label className="mb-1.5 block text-sm font-medium text-muted">{t("طلبات اليوم")}</label>
                  <input
                    readOnly
                    value={settings.AI_API_REQUEST}
                    className="w-full rounded-lg border border-border bg-elevated px-3 py-2 font-mono text-sm text-accent"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case "contact":
        return <ContactTab key={session?.id || "contact"} number={number} secret={secret.trim()} />;
      case "autoreply":
        return <AutoReplyTab key={session?.id || "autoreply"} number={number} secret={secret.trim()} />;
      default:
        return null;
    }
  };

  if (!session) return renderLoginGate();

  const changedLabel =
    changed > 0
      ? changed === 1
        ? t("إعداد واحد معدَّل")
        : locale === "en"
          ? `${changed} settings changed`
          : `${changed} إعدادات معدَّلة`
      : phase === "done"
        ? t("تم تحديث الإعدادات!")
        : t("جميع الإعدادات متزامنة");

  const isPanel = activeSection === "contact" || activeSection === "autoreply";

  return (
    <div className={isPanel ? "mx-auto max-w-4xl px-4 py-8 sm:py-10" : "mx-auto max-w-2xl px-4 py-10 pb-28 sm:py-14"}>
      <div className="space-y-8">
        {!isPanel && (
          <div className="mb-4 flex justify-end">
            <Link
              href={`/bot/setting?number=${encodeURIComponent(number)}`}
              className="rounded-xl border border-border bg-elevated px-3 py-2 text-sm font-medium text-muted transition hover:text-fg"
            >
              {t("↻ إعادة تحميل")}
            </Link>
          </div>
        )}

        <div className="mb-6 text-center animate-fade-up">
          <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 font-mono text-xs text-accent animate-fade-up">
            ● {["connected", "pending", "disconnected"].includes(session.status) ? session.status : t("نشط")}
          </span>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("لوحة تحكم البوت")}</h1>
          <p className="mt-1 text-sm text-muted">{t(isPanel ? "إدارة كل شيء من مكان واحد" : "خصص رفيقك الآلي")}</p>
        </div>

        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`rounded-xl px-5 py-2 text-sm font-medium transition ${
                activeSection === tab.id
                  ? "border border-accent bg-accent text-accent-fg shadow-[0_0_14px_rgba(0,212,255,0.35)]"
                  : "border border-border bg-elevated text-muted hover:text-fg"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div key={activeSection} className="space-y-8 animate-fade-in">
          {renderFieldRows(activeSection)}
        </div>
      </div>

      {/* شريط الحفظ العائم مطابق لـ Red Queen */}
      {!isPanel && (
        <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full border border-accent bg-surface px-6 py-3 shadow-2xl">
          <span className="text-sm font-bold text-fg">{changedLabel}</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || changed === 0}
            className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
          >
            {saving ? t("جارٍ الحفظ...") : t("احفظ وأكّد")}
          </button>
        </div>
      )}

      {/* ضوء الحفظ والنجاح */}
      {(phase === "saving" || phase === "writing") && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
          <div className="card flex flex-col items-center gap-4 p-8">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-3 text-sm tracking-widest text-fg">
              {phase === "saving" ? t("جارٍ الحفظ...") : t("جارٍ الكتابة في قاعدة البيانات...")}
            </p>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
          <div className="card flex flex-col items-center gap-2 p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/15">
              <span className="h-10 w-10 text-success text-3xl">✓</span>
            </div>
            <p className="mt-4 text-lg font-bold text-success">{t("تم تحديث الإعدادات!")}</p>
          </div>
        </div>
      )}

      {phase === "failed" && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-danger/40 bg-surface px-5 py-3 text-sm text-danger shadow-2xl">
          ⚠ {saveError || t("فشل الحفظ")}
        </div>
      )}
    </div>
  );
}

function TField({ label, sub, control }: { label: string; sub: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-3.5 last:border-b-0">
      <div className="min-w-0 flex-1 pe-4">
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="mt-0.5 text-xs text-muted/70">{sub}</p>
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-40 rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-fg placeholder:text-muted/40 sm:w-48"
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
  };
  for (const [from, to] of Object.entries(map)) {
    if (s[from] !== undefined) out[to] = s[from];
  }
  if (Array.isArray(s.ANTI_BADS)) out.bannedWords = s.ANTI_BADS.filter(Boolean);
  if (Array.isArray(s.ANTI_LINKS)) out.firewallDomains = s.ANTI_LINKS.filter(Boolean);
  return out;
}