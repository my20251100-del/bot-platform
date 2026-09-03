"use client";

import { useState, useEffect } from "react";

type Section = "privacy" | "status" | "config" | "owner";

export default function BotSettingPage() {
  const [activeSection, setActiveSection] = useState<Section>("privacy");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changedCount, setChangedCount] = useState(0);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeBot, setActiveBot] = useState<any>(null);

  // حالة الإعدادات المتطابقة 100% مع Red Queen Spec
  const [settings, setSettings] = useState({
    // 1. Privacy
    ALLOWS_ONLINE: true,
    CALL_REJECT: false,
    ANTI_DELETE: true,
    ANTI_VIEWONE: true,
    ANTI_SEND: false,

    // 2. Status
    STATUS_VIEW: true,
    STATUS_REACT: true,
    STATUS_REACT_EMOJI: "❤️",
    STATUS_SAVE: true,
    AUTO_REACT: false,

    // 3. Config
    ANTI_LINK: true,
    ANTI_BAD: true,
    ANTI_BOT: false,
    ANTI_MENTION: false,
    ANTI_EDIT: false,
    ANTI_ACTION: "delete", // warn, delete, kick
    ANTI_WARN_COUNT: 3,
    WORK_TYPE: "public", // public, private
    PREFIX: ".",
    LANGUAGE: "ar",

    // 4. Owner & AI
    AI_REPLY: false,
    GEMINI_API_KEYS: "",
    SYSTEM_PROMPT: "أنت مساعد ذكي ولطيف، ترد على استفسارات العملاء بدقة وسرعة وبلهجة ودية.",
    OWNER_NAME: "المسؤول",
    OWNER_FROM: "اليمن",
    OWNER_AGE: "25",
  });

  // جلب إعدادات البوت الحالية من Supabase
  useEffect(() => {
    async function loadBot() {
      setLoading(true);
      try {
        const res = await fetch("/api/bot/action?action=get_latest_bot");
        const data = await res.json();
        if (data?.bot) {
          setActiveBot(data.bot);
          if (data.bot.settings) {
            setSettings((prev) => ({ ...prev, ...data.bot.settings }));
          }
        }
      } catch {}
      setLoading(false);
    }
    loadBot();
  }, []);

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setChangedCount((c) => c + 1);
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/setting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: activeBot?.id,
          settings,
        }),
      });
      setChangedCount(0);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch {
      alert("حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: "privacy", label: "Privacy (الخصوصية)", icon: "🔒" },
    { id: "status", label: "Status (الحالات)", icon: "👁️" },
    { id: "config", label: "Config (الأمان والمجموعات)", icon: "⚙️" },
    { id: "owner", label: "Owner & AI (المالك والذكاء)", icon: "👑" },
  ] as const;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-24">
      {/* رأس الصفحة مطابق لـ Red Queen */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">Bot Configuration</h1>
            <p className="text-xs sm:text-sm text-muted mt-1">Customize your bot companion and security features</p>
          </div>
          {activeBot && (
            <div className="text-end">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs border border-border">
                <span className={`h-2 w-2 rounded-full ${activeBot.status === "connected" ? "bg-matrix" : "bg-amber-400"}`} />
                <span className="font-mono text-white">+{activeBot.linked_number || activeBot.phone || "Active"}</span>
              </span>
            </div>
          )}
        </div>

        {/* شريط الأقسام الأربعة على طريقة Red Queen */}
        <div className="mt-6 flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-surface/70 border border-border/80 rounded-2xl">
          {sections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id as Section)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeSection === sec.id
                  ? "bg-accent text-accent-fg shadow-[0_0_12px_rgba(0,212,255,0.3)] scale-[1.02]"
                  : "text-muted hover:text-white hover:bg-elevated"
              }`}
            >
              <span>{sec.icon}</span>
              <span>{sec.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* قسم 1: Privacy */}
      {activeSection === "privacy" && (
        <div className="card rounded-3xl border border-border/80 bg-surface/80 p-6 sm:p-8 space-y-6">
          <h2 className="font-bold text-lg text-white border-b border-border/60 pb-3">Privacy Controls</h2>

          <div className="space-y-4">
            <ToggleRow
              label="Allows Online"
              sub="Keep bot presence always active & available"
              subAr="إبقاء حالة الاتصال نشطة ومتاحة دائماً"
              checked={settings.ALLOWS_ONLINE}
              onChange={(val) => updateSetting("ALLOWS_ONLINE", val)}
            />
            <ToggleRow
              label="Call Reject"
              sub="Automatically decline incoming WhatsApp calls"
              subAr="رفض وتجاهل المكالمات الصوتية والمرئية الواردة تلقائياً"
              checked={settings.CALL_REJECT}
              onChange={(val) => updateSetting("CALL_REJECT", val)}
            />
            <ToggleRow
              label="Anti Delete"
              sub="Capture and resend deleted messages to your private chat"
              subAr="استعادة الرسائل والصور المحذوفة وإرسالها لمحادثتك الخاصة"
              checked={settings.ANTI_DELETE}
              onChange={(val) => updateSetting("ANTI_DELETE", val)}
            />
            <ToggleRow
              label="Anti View Once"
              sub="Unlock restricted view-once media without limit"
              subAr="فك قفل صور وفيديوهات النظرة الواحدة وحفظها دائماً"
              checked={settings.ANTI_VIEWONE}
              onChange={(val) => updateSetting("ANTI_VIEWONE", val)}
            />
            <ToggleRow
              label="Anti Send"
              sub="Block accidental outgoing broadcasts"
              subAr="حظر الإرسال العشوائي وغير المقصود"
              checked={settings.ANTI_SEND}
              onChange={(val) => updateSetting("ANTI_SEND", val)}
            />
          </div>
        </div>
      )}

      {/* قسم 2: Status */}
      {activeSection === "status" && (
        <div className="card rounded-3xl border border-border/80 bg-surface/80 p-6 sm:p-8 space-y-6">
          <h2 className="font-bold text-lg text-white border-b border-border/60 pb-3">Status Automation</h2>

          <div className="space-y-4">
            <ToggleRow
              label="Status View"
              sub="Automatically view contacts' statuses instantly"
              subAr="مشاهدة حالات جهات الاتصال فور نزولها"
              checked={settings.STATUS_VIEW}
              onChange={(val) => updateSetting("STATUS_VIEW", val)}
            />
            <ToggleRow
              label="Status React"
              sub="Send emoji reaction to viewed stories"
              subAr="التفاعل مع الحالات المشاهدة بالإيموجي المحدد"
              checked={settings.STATUS_REACT}
              onChange={(val) => updateSetting("STATUS_REACT", val)}
            />

            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div>
                <p className="font-bold text-sm text-white">React Emoji</p>
                <p className="text-xs text-muted">الإيموجي المستخدم للتفاعل مع الحالات</p>
              </div>
              <div className="flex items-center gap-2">
                {["❤️", "🔥", "👍", "😍", "🎉"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => updateSetting("STATUS_REACT_EMOJI", emoji)}
                    className={`h-9 w-9 rounded-xl text-lg flex items-center justify-center border transition ${
                      settings.STATUS_REACT_EMOJI === emoji
                        ? "border-accent bg-accent/20 scale-110 shadow-[0_0_10px_rgba(0,212,255,0.4)]"
                        : "border-border bg-elevated"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <ToggleRow
              label="Status Save"
              sub="Forward media from contacts' statuses to your chat"
              subAr="تحويل وسائط الحالات المميزة إلى محادثتك تلقائياً"
              checked={settings.STATUS_SAVE}
              onChange={(val) => updateSetting("STATUS_SAVE", val)}
            />

            <ToggleRow
              label="Auto React"
              sub="Automatically react to all incoming chat messages"
              subAr="التفاعل التلقائي مع الرسائل الواردة"
              checked={settings.AUTO_REACT}
              onChange={(val) => updateSetting("AUTO_REACT", val)}
            />
          </div>
        </div>
      )}

      {/* قسم 3: Config */}
      {activeSection === "config" && (
        <div className="card rounded-3xl border border-border/80 bg-surface/80 p-6 sm:p-8 space-y-6">
          <h2 className="font-bold text-lg text-white border-b border-border/60 pb-3">Security & Group Configuration</h2>

          <div className="space-y-4">
            <ToggleRow
              label="Anti Link"
              sub="Block & remove WhatsApp invite links from groups"
              subAr="حظر وحذف روابط المجموعات والإعلانات فوراً"
              checked={settings.ANTI_LINK}
              onChange={(val) => updateSetting("ANTI_LINK", val)}
            />
            <ToggleRow
              label="Anti Bad Words"
              sub="Filter and delete abusive language"
              subAr="فلترة وحذف الكلمات المسيئة والمحظورة"
              checked={settings.ANTI_BAD}
              onChange={(val) => updateSetting("ANTI_BAD", val)}
            />
            <ToggleRow
              label="Anti Bot"
              sub="Detect and remove unauthorized secondary bots"
              subAr="كشف وحظر البوتات الثانوية المزعجة"
              checked={settings.ANTI_BOT}
              onChange={(val) => updateSetting("ANTI_BOT", val)}
            />
            <ToggleRow
              label="Anti Mention"
              sub="Block mass @everyone or @tag mentions"
              subAr="منع الإشارات الجماعية والمنشن المزعج"
              checked={settings.ANTI_MENTION}
              onChange={(val) => updateSetting("ANTI_MENTION", val)}
            />

            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div>
                <p className="font-bold text-sm text-white">Work Type</p>
                <p className="text-xs text-muted">نمط عمل البوت (عام للجميع أو خاص بالمالك)</p>
              </div>
              <select
                value={settings.WORK_TYPE}
                onChange={(e) => updateSetting("WORK_TYPE", e.target.value)}
                className="rounded-xl border border-border bg-elevated px-3 py-1.5 text-xs font-bold text-white focus:border-accent focus:outline-none"
              >
                <option value="public">Public (عام)</option>
                <option value="private">Private (خاص)</option>
              </select>
            </div>

            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div>
                <p className="font-bold text-sm text-white">Prefix (بادئة الأوامر)</p>
                <p className="text-xs text-muted">الرمز المستخدم قبل الأوامر (مثال: . أو !)</p>
              </div>
              <input
                type="text"
                maxLength={2}
                value={settings.PREFIX}
                onChange={(e) => updateSetting("PREFIX", e.target.value)}
                className="w-16 text-center rounded-xl border border-border bg-elevated py-1 text-sm font-mono font-bold text-accent"
              />
            </div>
          </div>
        </div>
      )}

      {/* قسم 4: Owner & AI */}
      {activeSection === "owner" && (
        <div className="card rounded-3xl border border-border/80 bg-surface/80 p-6 sm:p-8 space-y-6">
          <h2 className="font-bold text-lg text-white border-b border-border/60 pb-3">Owner Details & AI Engine</h2>

          <div className="space-y-4">
            <ToggleRow
              label="AI Reply (Google Gemini)"
              sub="Enable smart automated customer support powered by Gemini"
              subAr="تفعيل الرد الذكي الآلي بالذكاء الاصطناعي"
              checked={settings.AI_REPLY}
              onChange={(val) => updateSetting("AI_REPLY", val)}
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                Gemini API Key
              </label>
              <input
                type="password"
                value={settings.GEMINI_API_KEYS}
                onChange={(e) => updateSetting("GEMINI_API_KEYS", e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-2xl border border-border bg-elevated px-4 py-2.5 text-sm font-mono text-white placeholder:text-muted/50 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                System Prompt (توجيهات الذكاء الاصطناعي)
              </label>
              <textarea
                rows={3}
                value={settings.SYSTEM_PROMPT}
                onChange={(e) => updateSetting("SYSTEM_PROMPT", e.target.value)}
                className="w-full rounded-2xl border border-border bg-elevated p-3 text-xs sm:text-sm text-white focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Owner Name (اسم المالك)</label>
                <input
                  type="text"
                  value={settings.OWNER_NAME}
                  onChange={(e) => updateSetting("OWNER_NAME", e.target.value)}
                  className="w-full rounded-xl border border-border bg-elevated px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Owner From (البلد / المدينة)</label>
                <input
                  type="text"
                  value={settings.OWNER_FROM}
                  onChange={(e) => updateSetting("OWNER_FROM", e.target.value)}
                  className="w-full rounded-xl border border-border bg-elevated px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* الشريط العائم لحفظ التعديلات مطابق لـ Red Queen */}
      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        <div className="flex items-center gap-4 rounded-2xl border border-accent/40 bg-surface/95 px-5 py-3 shadow-[0_0_25px_rgba(0,212,255,0.25)] backdrop-blur-xl">
          <span className="text-xs font-mono text-muted">
            {changedCount > 0 ? (
              <span className="text-accent font-bold">{changedCount} config(s) changed</span>
            ) : savedSuccess ? (
              <span className="text-matrix font-bold">✓ Settings updated!</span>
            ) : (
              <span>All configs synchronized</span>
            )}
          </span>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || changedCount === 0}
            className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-xs sm:text-sm font-bold text-accent-fg shadow-md shadow-accent/30 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-fg border-t-transparent" />
                <span>Writing to database...</span>
              </>
            ) : (
              <>
                <span>Confirm & Save</span>
                <span>💾</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  sub,
  subAr,
  checked,
  onChange,
}: {
  label: string;
  sub: string;
  subAr: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-3.5">
      <div className="min-w-0 flex-1 pe-4">
        <p className="font-bold text-sm text-white">{label}</p>
        <p className="text-xs text-muted leading-tight mt-0.5">{sub}</p>
        <p className="text-[11px] text-accent/80 font-sans mt-0.5" dir="rtl">
          {subAr}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          checked ? "bg-accent shadow-[0_0_10px_rgba(0,212,255,0.4)]" : "bg-elevated border border-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
