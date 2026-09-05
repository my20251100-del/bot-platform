"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CyberButton from "@/components/ui/cyber-button";

export default function QueenForm({ botId, initial }: { botId: string; initial: any }) {
  const router = useRouter();
  const [selections, setSelections] = useState(initial.selections ?? 3);
  const [recognize, setRecognize] = useState(initial.recognizeStatus ?? true);
  const [interact, setInteract] = useState(initial.interactStatus ?? true);
  const [saveStatus, setSaveStatus] = useState(initial.saveStatus ?? true);
  const [emoji, setEmoji] = useState(initial.reactEmoji ?? "❤️");
  const [workMode, setWorkMode] = useState(initial.workMode ?? "public");
  const [rejectCalls, setRejectCalls] = useState(initial.rejectCalls ?? false);
  const [showOnline, setShowOnline] = useState(initial.showOnline ?? false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("bots").update({
      settings: {
        ...initial,
        selections,
        recognizeStatus: recognize,
        interactStatus: interact,
        saveStatus,
        reactEmoji: emoji,
        workMode,
        rejectCalls,
        showOnline,
      },
    }).eq("id", botId);
    setBusy(false);
    if (error) return console.error(error.message);
    setSaved(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save(); }}
      className="card space-y-6 p-6"
    >
      <div className="cyber-title flex items-center gap-2 text-lg font-bold text-accent">
        <span className="h-2 w-2 rounded-full bg-accent" /> 👑 QUEEN — الإعدادات المتقدمة
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">عدد التحديدات (Selections)</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSelections(Math.max(1, selections - 1))} className="btn-primary !px-3 !py-1.5">−</button>
            <span dir="ltr" className="tech text-2xl">{selections}</span>
            <button type="button" onClick={() => setSelections(Math.min(10, selections + 1))} className="btn-primary !px-3 !py-1.5">+</button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">وضع العمل</label>
          <select className="input" value={workMode} onChange={(e) => setWorkMode(e.target.value)}>
            <option value="public">عام — الجميع</option>
            <option value="restricted">مقيّد — جهات محددة</option>
            <option value="inbox">صندوق الوارد فقط</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted">خيارات الحالة</p>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-elevated p-3">
          <span>التعرف على الحالة</span>
          <input type="checkbox" checked={recognize} onChange={(e) => setRecognize(e.target.checked)} />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-elevated p-3">
          <span>التفاعل مع الحالة</span>
          <input type="checkbox" checked={interact} onChange={(e) => setInteract(e.target.checked)} />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-elevated p-3">
          <span>حفظ الحالة</span>
          <input type="checkbox" checked={saveStatus} onChange={(e) => setSaveStatus(e.target.checked)} />
        </label>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-elevated p-3">
          <span>إيموجي التفاعل</span>
          <div className="flex gap-1.5">
            {["❤️", "👍", "😂", "🔥", "✅"].map((e) => (
              <button key={e} type="button" onClick={() => setEmoji(e)}
                className={`grid h-9 w-9 place-items-center rounded-lg border text-lg ${emoji === e ? "border-accent bg-accent/20" : "border-border"}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-accent border-b border-accent/20 pb-2">🛡️ حماية وإدارة المجموعات (Admin)</p>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-elevated/40 p-3 hover:bg-elevated transition">
          <div>
            <span className="font-bold">منع الروابط (Anti-Link)</span>
            <p className="text-xs text-muted">حذف الروابط تلقائياً</p>
          </div>
          <input type="checkbox" checked={initial.antiLink ?? false} onChange={() => {}} disabled />
          {/* Note: In full implementation, connect these to state */}
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-elevated/40 p-3 hover:bg-elevated transition">
          <div>
            <span className="font-bold">الترحيب التلقائي (Welcome)</span>
            <p className="text-xs text-muted">إرسال رسالة ترحيب عند انضمام عضو</p>
          </div>
          <input type="checkbox" checked={initial.welcomeEnabled ?? false} onChange={() => {}} disabled />
        </label>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-purple-400 border-b border-purple-500/20 pb-2">🧠 شخصية الذكاء الاصطناعي</p>
        <label className="flex flex-col gap-2 rounded-xl border border-border bg-elevated/40 p-3">
          <span className="font-bold">نغمة الردود (AI Personality)</span>
          <select className="input" defaultValue="friendly">
            <option value="friendly">مساعد لطيف وودود (افتراضي)</option>
            <option value="funny">ساخر ومضحك جداً 🤡</option>
            <option value="professional">رسمي واحترافي 👔</option>
            <option value="savage">قاسي ومستفز 🔥</option>
          </select>
        </label>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted border-b border-border/50 pb-2">الخصوصية</p>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-elevated p-3">
          <span>رفض المكالمات التلقائي</span>
          <input type="checkbox" checked={rejectCalls} onChange={(e) => setRejectCalls(e.target.checked)} />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-elevated p-3">
          <span>إظهار متصل (Online)</span>
          <input type="checkbox" checked={showOnline} onChange={(e) => setShowOnline(e.target.checked)} />
        </label>
      </div>

      {saved && <p className="text-sm text-emerald-400">✓ تم الحفظ بنجاح</p>}

      <CyberButton
        type="submit"
        disabled={busy}
        status={saved ? "success" : busy ? "loading" : "idle"}
        loadingLabel="جارٍ الحفظ..."
        labels={{ idle: "💾 حفظ وتأكيد", success: "تم الحفظ!" }}
        className="w-full"
      />
    </form>
  );
}
