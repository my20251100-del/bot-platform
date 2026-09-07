"use client";

import { useState, useRef, useEffect, useId } from "react";
import { useI18n } from "@/components/i18n-provider";

type ReplyType = "text" | "textImage" | "image" | "sticker" | "audio";

type ReplyItem = {
  id: string;
  keyword: string;
  message: string;
  type: ReplyType;
  media?: string;
  active: boolean;
};

type BotSession = {
  id: string;
  name: string;
  status: string;
};

const TYPE_META: Record<ReplyType, { label: string; icon: string }> = {
  text: { label: "Text", icon: "📝" },
  textImage: { label: "Txt+Img", icon: "🔗" },
  image: { label: "Image", icon: "🖼️" },
  sticker: { label: "Sticker", icon: "🎨" },
  audio: { label: "Audio", icon: "🎵" },
};

const ALL_TYPES: ReplyType[] = ["text", "textImage", "image", "sticker", "audio"];
const MAX_REPLIES = 10;

const GATE_HINTS = {
  number: "أدخل رقم الواتساب الذي تم ربط البوت به",
  numberPh: "+967 772 847 565",
};

export default function AutoReplyPage() {
  const { t } = useI18n();
  useEffect(() => {
    const sp = new URLSearchParams(globalThis.location?.search || "");
    const q = new URLSearchParams();
    q.set("tab", "autoreply");
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

export function AutoReplyTab({ number, secret }: { number: string; secret: string }) {
  return <AutoReplyCore embedded={{ number, secret }} />;
}

function AutoReplyCore({ embedded }: { embedded?: { number: string; secret: string } }) {
  const { t, locale } = useI18n();

  const [session, setSession] = useState<BotSession | null>(null);
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

  const [systemActive, setSystemActive] = useState(true);
  const [filter, setFilter] = useState<ReplyType | "all">("all");
  const [replies, setReplies] = useState<ReplyItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDel, setConfirmDel] = useState<ReplyItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("");
  const [replyType, setReplyType] = useState<ReplyType>("text");
  const [draftMedia, setDraftMedia] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const imageRef = useRef<HTMLInputElement>(null);
  const stickerRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStream = useRef<MediaRecorder | null>(null);
  const recChunks = useRef<Blob[]>([]);

  const repliesRef = useRef(replies);
  const activeRef = useRef(systemActive);
  const uid = useId();
  const uidSeq = useRef(0);

  useEffect(() => {
    repliesRef.current = replies;
    activeRef.current = systemActive;
  });

  useEffect(() => () => {
    if (recTimer.current) clearInterval(recTimer.current);
    recStream.current?.stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const authorize = async (digits: string, sec: string) => {
    setGateLoading(true);
    setGateError(null);
    try {
      const res = await fetch("/api/autoreply", {
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
      setSession({ id: bot.id || "", name: bot.name || "", status: bot.status || "" });
      setSystemActive(data.autoReply !== false);
      setReplies(Array.isArray(data.replies) ? data.replies : []);
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
      setGateError(t("أدخل رقم واتساب صالح مع رمز الدولة"));
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

  // تحديث تفاؤلي + حفظ سيرفراً (المحرك يلتقط التغيير خلال ثوانٍ)
  const persist = async (nextReplies: ReplyItem[], nextActive: boolean) => {
    const prevReplies = repliesRef.current;
    const prevActive = activeRef.current;
    setReplies(nextReplies);
    setSystemActive(nextActive);
    try {
      const digits = number.replace(/\D/g, "");
      const res = await fetch("/api/autoreply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: digits,
          secret: secret.trim(),
          action: "update",
          replies: nextReplies,
          autoReply: nextActive,
          lang: locale,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "");
      setSaving(true);
      setSaved(true);
      setTimeout(() => {
        setSaving(false);
        setSaved(false);
      }, 1500);
    } catch {
      setReplies(prevReplies);
      setSystemActive(prevActive);
      setSyncError(t("تعذّر حفظ الرد على الخادم"));
      setTimeout(() => setSyncError(null), 3200);
    }
  };

  const toggleSystem = () => persist(repliesRef.current, !activeRef.current);

  const openNew = () => {
    setKeyword("");
    setMessage("");
    setReplyType("text");
    setDraftMedia("");
    setError(null);
    setModalOpen(true);
  };

  const validate = (): string | null => {
    if (replies.length >= MAX_REPLIES) return t("الحد الأقصى 10 ردود فقط");
    if (!keyword.trim()) return t("الكلمة المفتاحية مطلوبة");
    if (keyword.trim().length > 30) return t("الكلمة المفتاحية طويلة جداً (بحد أقصى 30)");
    if (!message.trim()) return t("النص مطلوب");
    if (message.trim().length > 1000) return t("النص طويل جداً (بحد أقصى 1000)");
    return null;
  };

  const confirmSaveAndAdd = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setConfirmSave(true);
  };

  const addReply = () => {
    uidSeq.current += 1;
    const newItem: ReplyItem = {
      id: `${uid}-${uidSeq.current}`,
      keyword: keyword.trim(),
      message: message.trim(),
      type: replyType,
      media: draftMedia || undefined,
      active: true,
    };
    persist([newItem, ...repliesRef.current], activeRef.current);
    setModalOpen(false);
    setConfirmSave(false);
  };

  const deleteReply = (item: ReplyItem) => {
    setConfirmDel(item);
  };

  const confirmDelete = () => {
    if (!confirmDel) return;
    persist(repliesRef.current.filter((r) => r.id !== confirmDel.id), activeRef.current);
    setConfirmDel(null);
  };

  const toggleReply = (id: string) => {
    persist(repliesRef.current.map((r) => (r.id === id ? { ...r, active: !r.active } : r)), activeRef.current);
  };

  const readFile = (f: File | undefined, maxMB: number, cb: (data: string) => void) => {
    if (!f) return;
    if (f.size > maxMB * 1024 * 1024) {
      setError(locale === "en" ? `File must be under ${maxMB}MB` : `يجب أن يكون الملف أقل من ${maxMB}MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => cb(String(reader.result || ""));
    reader.readAsDataURL(f);
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recChunks.current = [];
      mr.ondataavailable = (ev) => recChunks.current.push(ev.data);
      mr.onstop = () => {
        const blob = new Blob(recChunks.current, { type: "audio/mp3" });
        const reader = new FileReader();
        reader.onload = () => setDraftMedia(String(reader.result || ""));
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
      setError(t("يرجى السماح بالوصول إلى الميكروفون"));
    }
  };

  const stopRecording = () => {
    if (recStream.current && recStream.current.state !== "inactive") recStream.current.stop();
    if (recTimer.current) clearInterval(recTimer.current);
    setRecording(false);
  };

  if (!session) {
    if (embedded) {
      return (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-sm text-muted">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            {gateError ? <p className="text-center text-danger">⚠ {gateError}</p> : t("جارٍ تحميل الرد التلقائي...")}
          </div>
        </div>
      );
    }
    return (
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
  }

  const visible = filter === "all" ? replies : replies.filter((r) => r.type === filter);
  const activeCount = replies.filter((r) => r.active).length;

  return (
    <div className={embedded ? "w-full" : "mx-auto max-w-4xl px-4 py-12 sm:py-16"}>
      <header className={embedded ? "mb-8 flex flex-col items-center text-center animate-fade-up" : "mb-12 flex flex-col items-center text-center animate-fade-up"}>
        <button
          type="button"
          onClick={toggleSystem}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${
            systemActive
              ? "border-accent/30 bg-accent-soft text-accent"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${systemActive ? "bg-accent animate-ping" : "bg-danger"}`} />
          {systemActive ? t("نشط") : t("غير نشط")}
        </button>
        <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">{t("مدير الرد التلقائي")}</h1>
        {session?.name && <p className="mt-1 text-xs text-muted/70">{session.name}</p>}
        <p className="mt-1 text-sm text-muted">
          {locale === "en"
            ? `${replies.length} replies ready · ${activeCount} active`
            : `${replies.length} رد مُعد · ${activeCount} نشط`}
        </p>
        <p className="mt-2 max-w-md text-center text-xs text-muted/70">
          {t("جرّب الرد من رقم آخر: البوت لا يرد على الرسائل الآتية من رقمه نفسه.")}
        </p>
      </header>

      <div className="mb-14 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={openNew}
          className="btn-primary flex h-12 items-center gap-2 rounded-xl px-5"
        >
          <span className="text-lg leading-none">+</span>
          <span>{t("رد جديد")}</span>
        </button>
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(filter === t ? "all" : t)}
            className={`h-12 rounded-xl border px-4 text-sm font-medium transition ${
              filter === t ? "border-accent bg-accent-soft text-accent" : "border-border bg-elevated text-muted hover:text-fg"
            }`}
          >
            {TYPE_META[t].icon} {TYPE_META[t].label}
          </button>
        ))}
      </div>

      <div className="mx-auto mb-6 h-8 w-fit rounded-lg px-4 text-center font-semibold text-muted">
        {filter === "all" ? t("كل الردود") : locale === "en" ? `${TYPE_META[filter].label} Replies` : `ردود ${TYPE_META[filter].label}`}
      </div>

      {visible.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <span className="text-4xl">🤖</span>
          <p className="text-sm font-bold">{t("لا توجد ردود بعد")}</p>
          <p className="text-xs text-muted/70">{t("أنشئ أول رد تلقائي لك للبدء.")}</p>
          <button type="button" onClick={openNew} className="btn-primary mt-2 px-6 py-2.5 text-sm">
            {t("+ رد جديد")}
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((r) => (
            <div key={r.id} className="card flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-elevated text-lg">
                {TYPE_META[r.type].icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-bold text-accent">#{r.keyword}</p>
                <p className="mt-0.5 truncate text-xs text-muted/80">{r.message}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={r.active}
                  onClick={() => toggleReply(r.id)}
                  className={`relative h-5 w-9 rounded-full transition ${r.active ? "bg-accent" : "bg-border"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${r.active ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                </button>
                <button type="button" onClick={() => deleteReply(r)} className="p-1 text-sm text-muted transition hover:text-danger" title={t("حذف")}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card max-w-lg w-full p-6 sm:p-8">
            <div className="mb-5 flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-lg font-bold">{t("رد جديد")}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-muted transition hover:text-fg">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-muted">{t("الكلمة المفتاحية")}</label>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={t("الكلمة المفتاحية للتفعيل")}
                  maxLength={30}
                  className="field w-full text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-muted">{t("نوع الرد")}</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setReplyType(t)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        replyType === t ? "bg-accent text-accent-fg" : "border border-border bg-elevated text-muted hover:text-fg"
                      }`}
                    >
                      {TYPE_META[t].icon} {TYPE_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-muted">{t("النص")}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("اكتب رسالتك...")}
                  rows={3}
                  maxLength={1000}
                  className="field w-full resize-none text-sm"
                />
              </div>

              {(replyType === "image" || replyType === "textImage") && (
                <button
                  type="button"
                  onClick={() => imageRef.current?.click()}
                  className="w-full rounded-xl border border-dashed border-border px-4 py-2.5 text-sm text-muted transition hover:border-accent"
                >
                  {draftMedia ? t("🖼️ تم إرفاق الصورة ✓") : t("رفع صورة (بحد أقصى 1MB)")}
                </button>
              )}
              {replyType === "sticker" && (
                <button
                  type="button"
                  onClick={() => stickerRef.current?.click()}
                  className="w-full rounded-xl border border-dashed border-border px-4 py-2.5 text-sm text-muted transition hover:border-accent"
                >
                  {draftMedia ? t("🎨 تم إرفاق الملصق ✓") : t("رفع ملصق (WebP/PNG، بحد أقصى 1MB)")}
                </button>
              )}
              {replyType === "audio" && (
                <div className="flex flex-wrap items-center gap-2">
                  {recording ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="rounded-xl border border-danger/50 bg-danger/10 px-4 py-2 text-sm text-danger"
                    >
                      {locale === "en" ? `Stop (${recordSecs}s)` : `Stop (${recordSecs}ث)`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="rounded-xl border border-dashed border-border px-4 py-2 text-sm text-muted transition hover:border-accent"
                    >
                      {t("🎙️ تسجيل")}
                    </button>
                  )}
                  <span className="text-xs text-muted">{t("أو")}</span>
                  <button
                    type="button"
                    onClick={() => audioRef.current?.click()}
                    className="rounded-xl border border-dashed border-border px-4 py-2 text-sm text-muted transition hover:border-accent"
                  >
                    {t("رفع MP3")}
                  </button>
                  {(draftMedia || recording) && <span className="text-xs text-success">{t("الصوت جاهز! 🎵")}</span>}
                </div>
              )}

              <input ref={imageRef} type="file" accept="image/*" hidden onChange={(e) => readFile(e.target.files?.[0], 1, setDraftMedia)} />
              <input ref={stickerRef} type="file" accept=".webp,image/webp,image/png,image/webp" hidden onChange={(e) => readFile(e.target.files?.[0], 1, setDraftMedia)} />
              <input ref={audioRef} type="file" accept="audio/*" hidden onChange={(e) => readFile(e.target.files?.[0], 1, setDraftMedia)} />

              {error && <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger animate-fade-in">⚠ {error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted transition hover:text-fg"
                >
                  {t("إلغاء")}
                </button>
                <button
                  type="button"
                  onClick={confirmSaveAndAdd}
                  disabled={saving}
                  className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
                >
                  {t("حفظ الرد")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card max-w-sm p-6 text-center sm:p-8">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-2xl text-accent">✓</div>
            <h3 className="mt-4 text-lg font-bold">{t("تأكيد الحفظ")}</h3>
            <p className="mt-1 text-sm text-muted">{t("حفظ هذا الرد التلقائي؟")}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmSave(false)}
                className="rounded-xl border border-border bg-elevated px-4 py-2.5 text-sm font-medium text-muted transition hover:text-fg"
              >
                {t("إلغاء")}
              </button>
              <button type="button" onClick={addReply} className="btn-primary px-4 py-2.5 text-sm">
                {t("حفظ")}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card max-w-sm p-6 text-center sm:p-8">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-danger/15 text-2xl text-danger">🗑️</div>
            <h3 className="mt-4 text-lg font-bold">{t("تأكيد الحذف")}</h3>
            <p className="mt-1 text-sm text-muted">
              {t("حذف هذا الرد التلقائي؟")} <span className="font-mono text-accent">#{confirmDel.keyword}</span>
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmDel(null)}
                className="rounded-xl border border-border bg-elevated px-4 py-2.5 text-sm font-medium text-muted transition hover:text-fg"
              >
                {t("إلغاء")}
              </button>
              <button type="button" onClick={confirmDelete} className="rounded-xl bg-danger px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110">
                {t("حذف")}
              </button>
            </div>
          </div>
        </div>
      )}

      {saved && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-success/40 bg-surface px-5 py-3 text-sm text-success shadow-2xl animate-fade-in">
          {t("✓ تم حفظ الرد بنجاح!")}
        </div>
      )}

      {syncError && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-danger/40 bg-surface px-5 py-3 text-sm text-danger shadow-2xl animate-fade-in">
          {t("تعذّر حفظ الرد على الخادم")}
        </div>
      )}
    </div>
  );
}