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

const toggles: { key: keyof Settings; label: string; desc: string }[] = [
  { key: "autoReply", label: "الرد التلقائي", desc: "يرد تلقائياً على الرسائل الواردة" },
  { key: "antiDelete", label: "مضاد الحذف", desc: "عند حذف أي شخص لرسالته تُرسل لك نسخة منها فوراً في محادثة مراسلة نفسك" },
  { key: "antiViewOnce", label: "كشف النظرة الواحدة", desc: "صور وفيديوهات النظرة الواحدة تُحفظ نسخة دائمة منها في مراسلة نفسك لتشاهدها متى شئت" },
  { key: "autoViewStatus", label: "مشاهدة الحالات تلقائياً", desc: "يشاهد كل الستوري فور نشره دون فتح الجوال" },
  { key: "autoReactStatus", label: "التفاعل مع الحالات", desc: "يضع إيموجي (قلب ❤️) على كل حالة تُنشر — يتطلب تفعيل المشاهدة أيضاً" },
  { key: "autoReact", label: "التفاعل مع الرسائل", desc: "يفاعل مع كل رسالة بالإيموجي المختار" },
  { key: "privacyMode", label: "وضع الخصوصية", desc: "إخفاء علامات القراءة وحالة الكتابة (قريباً)" },
  { key: "contactAutoSave", label: "سجل الأرقام", desc: "يدوّن كل رقم جديد يراسلك" },
  { key: "welcomeGroups", label: "ترحيب المجموعات", desc: "يرحب تلقائياً بكل منضم جديد للمجموعات — استخدم {user} لذكر اسمه" },
  { key: "farewellGroups", label: "وداع المجموعات", desc: "يرسل رسالة وداع عند خروج عضو" },
  { key: "smartReply", label: "الرد الذكي (ذكاء اصطناعي)", desc: "يرد على عملائك بإجابات ذكية بناءً على معلومات نشاطك — يتطلب مفتاح OPENAI_API_KEY في المحرك" },
  { key: "autoForward", label: "إعادة النشر التلقائي", desc: "ينقل كل منشور جديد من قناة مصدر إلى مجموعاتك فور نزوله" },
  { key: "firewallOn", label: "جدار الحماية (Firewall)", desc: "يحذف تلقائياً أي رسالة تحتوي رابطاً لدومين محظور في مجموعاتك" },
  { key: "dictionaryOn", label: "قاموس الكلمات المحظورة", desc: "يحذف تلقائياً أي رسالة بها كلمة من قائمتك المحظورة في المجموعات" },
  { key: "rejectCalls", label: "رفض المكالمات", desc: "يرفض كل المكالمات الواردة تلقائياً" },
  { key: "antiEdit", label: "مكافحة التعديل", desc: "يحذف أي رسالة مُعدَّلة نصها في المجموعات" },
  { key: "antiMention", label: "مكافحة الإشارة", desc: "يحذف أي رسالة تحتوي إشارة @ في المجموعات" },
  { key: "showOnline", label: "إظهار متصل", desc: "يبقي حالة البوت على الإنترنت نشطة (قريباً)" },
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
}: {
  botId: string;
  initial: Settings;
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

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">أتمتة البوت</h2>

      <div className="card divide-y divide-border/60">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center justify-between gap-4 p-4">
            <div>
              <h3 className="font-medium">{t.label}</h3>
              <p className="text-sm text-muted">{t.desc}</p>
            </div>
            <Toggle
              on={settings[t.key] as boolean}
              onChange={() => update(t.key, !settings[t.key] as never)}
            />
          </div>
        ))}

        {settings.autoReply && (
          <div className="p-4">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="reply-msg">
              نص الرد التلقائي
            </label>
            <textarea
              id="reply-msg"
              className="input min-h-24 resize-y"
              value={settings.autoReplyMessage}
              onChange={(e) => update("autoReplyMessage", e.target.value)}
              placeholder="مرحباً! أنا غير متاح حالياً وسأعاود التواصل قريباً."
            />
          </div>
        )}

        {settings.welcomeGroups && (
          <div className="p-4">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="welcome-msg">
              رسالة الترحيب
            </label>
            <textarea
              id="welcome-msg"
              className="input min-h-20 resize-y"
              value={settings.welcomeMessage}
              onChange={(e) => update("welcomeMessage", e.target.value)}
              placeholder="أهلاً بك {user} في مجموعتنا 👋 اقرأ القوانين المثبتة"
            />
          </div>
        )}

        {settings.farewellGroups && (
          <div className="p-4">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="farewell-msg">
              رسالة الوداع
            </label>
            <textarea
              id="farewell-msg"
              className="input min-h-20 resize-y"
              value={settings.farewellMessage}
              onChange={(e) => update("farewellMessage", e.target.value)}
              placeholder="نتمنى لك التوفيق {user} 👋"
            />
          </div>
        )}

        {settings.smartReply && (
          <div className="p-4">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="biz-info">
              معلومات نشاطك (يبنى عليها الرد الذكي)
            </label>
            <textarea
              id="biz-info"
              className="input min-h-28 resize-y"
              value={settings.businessInfo}
              onChange={(e) => update("businessInfo", e.target.value)}
              placeholder={"مثال: متجر عطور في صنعاء.\nأسعارنا من 50 إلى 300 ريال.\nالتوصيل داخل المدينة مجاناً.\nساعات العمل: 9 صباحاً - 10 مساءً."}
            />
            <p className="mt-2 text-xs text-muted">
              كلما زادت التفاصيل كانت الإجابات أدق. لا تشارك معلومات بنكية.
            </p>
          </div>
        )}

        <div className="p-4">
          <label className="mb-1.5 block text-sm font-medium" htmlFor="wm">
            وضع العمل (من يمكنه تفعيل الردود)
          </label>
          <select
            id="wm"
            className="input"
            value={settings.workMode}
            onChange={(e) => update("workMode", e.target.value)}
          >
            <option value="public">عام — الجميع</option>
            <option value="restricted">مقيّد — جهات محددة</option>
            <option value="inbox">صندوق الوارد فقط</option>
          </select>
        </div>

        {settings.autoForward && (
          <div className="space-y-4 p-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="fwd-source">
                القناة المصدر (رابط)
              </label>
              <input
                id="fwd-source"
                dir="ltr"
                className="input text-left"
                value={settings.forwardSource}
                onChange={(e) => update("forwardSource", e.target.value)}
                placeholder="https://whatsapp.com/channel/0029Va..."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="fwd-targets">
                المجموعات المستهدفة (أرقامها مفصولة بفاصلة)
              </label>
              <input
                id="fwd-targets"
                dir="ltr"
                className="input text-left"
                value={settings.forwardTargets}
                onChange={(e) => update("forwardTargets", e.target.value)}
                placeholder="967771234567-1234567890@g.us, 967777654321-9876543210@g.us"
              />
              <p className="mt-2 text-xs text-muted">
                للحصول على رقم مجموعة أرسل فيها الأمر <span dir="ltr">.menu</span> وستجد المعرف في سجل الأحداث.
              </p>
            </div>
          </div>
        )}

        {settings.firewallOn && (
          <div className="p-4">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="fw-domains">
              دومينات محظورة (واحد لكل سطر)
            </label>
            <textarea
              id="fw-domains"
              dir="ltr"
              className="input min-h-20 resize-y text-left"
              value={(settings.firewallDomains ?? []).join("\n")}
              onChange={(e) =>
                update(
                  "firewallDomains",
                  e.target.value.split("\n").map((s) => s.trim().toLowerCase()).filter(Boolean)
                )
              }
              placeholder="whatsapp.com&#10;wa.me"
            />
            <p className="mt-2 text-xs text-muted">
              أي رسالة بمجموعاتك تحتوي رابطاً لهذه الدومينات تُحذف فوراً.
            </p>
          </div>
        )}

        {settings.dictionaryOn && (
          <div className="p-4">
            <label className="mb-1.5 block text-sm font-medium" htmlFor="bw-words">
              كلمات محظورة (كلمة لكل سطر)
            </label>
            <textarea
              id="bw-words"
              className="input min-h-20 resize-y"
              value={(settings.bannedWords ?? []).join("\n")}
              onChange={(e) =>
                update(
                  "bannedWords",
                  e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                )
              }
              placeholder="سبأ&#10;شتم"
            />
            <p className="mt-2 text-xs text-muted">
              أي رسالة بمجموعاتك تحتوي إحداها تُحذف فوراً.
            </p>
          </div>
        )}

        {settings.autoReact && (
          <div className="flex items-center gap-3 p-4">
            <span className="text-sm font-medium">إيموجي التفاعل</span>
            {["❤️", "👍", "😂", "🔥", "✅"].map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => update("reactEmoji", e)}
                className={`grid h-9 w-9 place-items-center rounded-lg border text-lg transition-colors ${
                  settings.reactEmoji === e ? "border-accent bg-accent/15" : "border-border hover:bg-elevated"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

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
