"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CyberButton from "@/components/ui/cyber-button";

type Settings = {
  autoReply: boolean;
  autoReplyMessage: string;
  antiDelete: boolean;
  autoViewStatus: boolean;
  autoReactStatus: boolean;
  antiViewOnce: boolean;
  autoReact: boolean;
  reactEmoji: string;
  privacyMode: boolean;
  contactAutoSave: boolean;
  welcomeGroups: boolean;
  welcomeMessage: string;
  farewellGroups: boolean;
  farewellMessage: string;
  smartReply: boolean;
  businessInfo: string;
  autoForward: boolean;
  forwardSource: string;
  forwardTargets: string;
  firewallOn: boolean;
  firewallDomains: string[];
  dictionaryOn: boolean;
  bannedWords: string[];
  rejectCalls: boolean;
  showOnline: boolean;
  antiEdit: boolean;
  antiMention: boolean;
  workMode: string;
};

type Category = "automation" | "ai" | "security";

const toggles: { key: keyof Settings; label: string; desc: string; category: Category }[] = [
  { key: "autoReply", label: "الرد التلقائي", desc: "يرد تلقائياً على الرسائل الواردة", category: "automation" },
  { key: "antiDelete", label: "مضاد الحذف", desc: "عند حذف أي شخص لرسالته تُرسل لك نسخة منها فوراً في محادثة مراسلة نفسك", category: "automation" },
  { key: "antiViewOnce", label: "كشف النظرة الواحدة", desc: "صور وفيديوهات النظرة الواحدة تُحفظ نسخة دائمة منها في مراسلة نفسك لتشاهدها متى شئت", category: "automation" },
  { key: "autoViewStatus", label: "مشاهدة الحالات تلقائياً", desc: "يشاهد كل الستوري فور نشره دون فتح الجوال", category: "automation" },
  { key: "autoReactStatus", label: "التفاعل مع الحالات", desc: "يضع إيموجي (قلب ❤️) على كل حالة تُنشر — يتطلب تفعيل المشاهدة أيضاً", category: "automation" },
  { key: "autoReact", label: "التفاعل مع الرسائل", desc: "يفاعل مع كل رسالة بالإيموجي المختار", category: "automation" },
  { key: "privacyMode", label: "وضع الخصوصية", desc: "إخفاء علامات القراءة وحالة الكتابة (قريباً)", category: "automation" },
  { key: "contactAutoSave", label: "سجل الأرقام", desc: "يدوّن كل رقم جديد يراسلك", category: "automation" },
  { key: "rejectCalls", label: "رفض المكالمات", desc: "يرفض كل المكالمات الواردة تلقائياً", category: "automation" },
  { key: "showOnline", label: "إظهار متصل", desc: "يبقي حالة البوت على الإنترنت نشطة (قريباً)", category: "automation" },

  { key: "smartReply", label: "الرد الذكي (ذكاء اصطناعي)", desc: "يرد على عملائك بإجابات ذكية بناءً على معلومات نشاطك ونموذج Gemini", category: "ai" },

  { key: "welcomeGroups", label: "ترحيب المجموعات", desc: "يرحب تلقائياً بكل منضم جديد للمجموعات — استخدم {user} لذكر اسمه", category: "security" },
  { key: "farewellGroups", label: "وداع المجموعات", desc: "يرسل رسالة وداع عند خروج عضو", category: "security" },
  { key: "autoForward", label: "إعادة النشر التلقائي", desc: "ينقل كل منشور جديد من قناة مصدر إلى مجموعاتك فور نزوله", category: "security" },
  { key: "firewallOn", label: "جدار الحماية (Firewall)", desc: "يحذف تلقائياً أي رسالة تحتوي رابطاً لدومين محظور في مجموعاتك", category: "security" },
  { key: "dictionaryOn", label: "قاموس الكلمات المحظورة", desc: "يحذف تلقائياً أي رسالة بها كلمة من قائمتك المحظورة في المجموعات", category: "security" },
  { key: "antiEdit", label: "مكافحة التعديل", desc: "يحذف أي رسالة مُعدَّلة نصها في المجموعات", category: "security" },
  { key: "antiMention", label: "مكافحة الإشارة", desc: "يحذف أي رسالة تحتوي إشارة @ في المجموعات", category: "security" },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-border"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "-translate-x-[22px]" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export default function BotSettings({
  botId,
  initial,
  activeCategory,
}: {
  botId: string;
  initial: Settings;
  activeCategory?: Category;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("bots").update({ settings }).eq("id", botId);
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  const filteredToggles = activeCategory
    ? toggles.filter((t) => t.category === activeCategory)
    : toggles;

  const title =
    activeCategory === "ai"
      ? "🧠 مساعد الذكاء الاصطناعي (Gemini)"
      : activeCategory === "security"
      ? "🛡️ أمان وحماية المجموعات"
      : "⚡ أتمتة الواتساب الأساسية";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredToggles.map((t) => (
          <div key={t.key} className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 backdrop-blur-xl ${settings[t.key] ? 'border-accent/50 bg-accent/5 shadow-[0_0_20px_rgba(0,212,255,0.1)]' : 'border-border/60 bg-surface/40 hover:border-border hover:bg-elevated/40'}`}>
            <div className="p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="font-bold text-fg">{t.label}</h3>
                <Toggle
                  on={settings[t.key] as boolean}
                  onChange={() => update(t.key, !settings[t.key] as never)}
                />
              </div>
              <p className="text-xs text-muted leading-relaxed">{t.desc}</p>

              {/* Extra configurations when ON */}
              {settings[t.key] && (
                <div className="mt-4 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                  {t.key === "autoReply" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-accent">نص الرد التلقائي</label>
                      <textarea
                        className="input text-xs min-h-[80px] w-full"
                        value={settings.autoReplyMessage}
                        onChange={(e) => update("autoReplyMessage", e.target.value)}
                        placeholder="مرحباً! أنا غير متاح حالياً..."
                      />
                    </div>
                  )}

                  {t.key === "welcomeGroups" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-accent">رسالة الترحيب</label>
                      <textarea
                        className="input text-xs min-h-[80px] w-full"
                        value={settings.welcomeMessage}
                        onChange={(e) => update("welcomeMessage", e.target.value)}
                        placeholder="أهلاً بك {user} في مجموعتنا 👋"
                      />
                    </div>
                  )}

                  {t.key === "farewellGroups" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-accent">رسالة الوداع</label>
                      <textarea
                        className="input text-xs min-h-[80px] w-full"
                        value={settings.farewellMessage}
                        onChange={(e) => update("farewellMessage", e.target.value)}
                        placeholder="نتمنى لك التوفيق {user} 👋"
                      />
                    </div>
                  )}

                  {t.key === "smartReply" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-accent">معلومات نشاطك للذكاء الاصطناعي</label>
                      <textarea
                        className="input text-xs min-h-[120px] w-full"
                        value={settings.businessInfo}
                        onChange={(e) => update("businessInfo", e.target.value)}
                        placeholder={"مثال: متجر عطور في صنعاء...\n(أخبر الذكاء بماذا يجيب عملاءك)"}
                      />
                    </div>
                  )}

                  {t.key === "autoForward" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-accent block mb-1">رابط قناة المصدر</label>
                        <input
                          dir="ltr"
                          className="input text-xs w-full"
                          value={settings.forwardSource}
                          onChange={(e) => update("forwardSource", e.target.value)}
                          placeholder="https://whatsapp.com/channel/..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-accent block mb-1">المجموعات المستهدفة (أرقام)</label>
                        <input
                          dir="ltr"
                          className="input text-xs w-full"
                          value={settings.forwardTargets}
                          onChange={(e) => update("forwardTargets", e.target.value)}
                          placeholder="967xxxx-yyyy@g.us, ..."
                        />
                      </div>
                    </div>
                  )}

                  {t.key === "firewallOn" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-accent">دومينات محظورة</label>
                      <textarea
                        dir="ltr"
                        className="input text-xs min-h-[80px] w-full"
                        value={(settings.firewallDomains ?? []).join("\n")}
                        onChange={(e) =>
                          update(
                            "firewallDomains",
                            e.target.value.split("\n").map((s) => s.trim().toLowerCase()).filter(Boolean)
                          )
                        }
                        placeholder="whatsapp.com\nwa.me"
                      />
                    </div>
                  )}

                  {t.key === "dictionaryOn" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-accent">الكلمات المحظورة</label>
                      <textarea
                        className="input text-xs min-h-[80px] w-full"
                        value={(settings.bannedWords ?? []).join("\n")}
                        onChange={(e) =>
                          update(
                            "bannedWords",
                            e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                          )
                        }
                        placeholder="سبأ\nشتم"
                      />
                    </div>
                  )}

                  {t.key === "autoReact" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-accent block mb-2">اختر الإيموجي</label>
                      <div className="flex flex-wrap items-center gap-2">
                        {["❤️", "👍", "😂", "🔥", "✅", "🤖", "✨"].map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => update("reactEmoji", e)}
                            className={`grid h-8 w-8 place-items-center rounded-lg border text-base transition-colors ${
                              settings.reactEmoji === e ? "border-accent bg-accent/20 shadow-sm" : "border-border/50 hover:bg-elevated"
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {activeCategory === "automation" && (
        <div className="card p-5 mt-4 max-w-sm">
          <label className="mb-2 block text-sm font-bold text-fg" htmlFor="wm">
            وضع العمل العام للبوت
          </label>
          <select
            id="wm"
            className="input text-sm"
            value={settings.workMode}
            onChange={(e) => update("workMode", e.target.value)}
          >
            <option value="public">عام — الجميع</option>
            <option value="restricted">مقيّد — جهات الاتصال فقط</option>
            <option value="inbox">صندوق الوارد (منع المجموعات)</option>
          </select>
          <p className="mt-2 text-xs text-muted">
            يحدد من يمكن للبوت الرد عليهم والتفاعل معهم.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <CyberButton
          onClick={handleSave}
          disabled={saving}
          status={saved ? "success" : saving ? "loading" : "idle"}
          loadingLabel="جارٍ الحفظ..."
          labels={{ idle: "حفظ الإعدادات", success: "تم الحفظ!" }}
        />
      </div>
    </div>
  );
}
