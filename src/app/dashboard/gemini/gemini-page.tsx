"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CyberButton from "@/components/ui/cyber-button";
import { Skeleton } from "@/components/ui/motion";

const DEFAULT_SYSTEM =
  "أنت موظف خدمة عملاء ودود تجيب بالعربية بإيجاز واحترافية. " +
  "إذا لم تكن المعلومة موجودة اعتذر بلطف واطلب ترك وسيلة تواصل.";

export default function GeminiPage() {
  const router = useRouter();
  const [bots, setBots] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [keysText, setKeysText] = useState("");
  const [model, setModel] = useState("gemini-1.5-flash");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM);
  const [smartReply, setSmartReply] = useState(false);
  const [dailyQuota, setDailyQuota] = useState(50);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("bots").select("id,name,linked_number,settings");
      const list = data ?? [];
      setBots(list);
      const first = list[0];
      setSelected(first?.id ?? "");
      load(first);
      setLoading(false);
    })();
  }, []);

  function load(b: any) {
    const s = b?.settings ?? {};
    setKeysText(Array.isArray(s.geminiKeys) ? s.geminiKeys.filter(Boolean).join("\n") : "");
    setModel(s.geminiModel || "gemini-1.5-flash");
    setSystemPrompt(s.geminiSystemPrompt || DEFAULT_SYSTEM);
    setSmartReply(!!s.smartReply);
    setDailyQuota(Number(s.geminiDailyQuota) || 50);
  }

  function onPick(id: string) {
    setSelected(id);
    load(bots.find((x) => x.id === id));
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const bot = bots.find((x) => x.id === selected);
    const { error } = await supabase.from("bots").update({
      settings: {
        ...(bot?.settings ?? {}),
        geminiKeys: keysText.split("\n").map((s) => s.trim()).filter(Boolean),
        geminiModel: model,
        geminiSystemPrompt: systemPrompt,
        geminiDailyQuota: dailyQuota,
        smartReply,
      },
    }).eq("id", selected);
    setSaving(false);
    if (error) return console.error(error.message);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cyber-title text-2xl font-bold">🧠 محرك الذكاء (Gemini)</h1>
        <p className="mt-2 text-muted">
          اربط حتى 3 مفاتيح Gemini، حدد البرومبت، وضبط الحصة اليومية للردود الذكية التلقائية.
        </p>
      </div>

      {bots.length === 0 ? (
        <p className="card p-6 text-muted">لا توجد بوتات بعد.</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="card space-y-6 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium">اختر البوت</label>
            <select className="input" value={selected} onChange={(e) => onPick(e.target.value)}>
              {bots.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.linked_number}</option>)}
            </select>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-elevated p-3">
            <span className="font-medium">🤖 تفعيل الرد الذكي</span>
            <input type="checkbox" checked={smartReply} onChange={(e) => setSmartReply(e.target.checked)} />
          </label>

          <div>
            <label className="mb-1.5 block text-sm font-medium">مفاتيح Gemini (مفتاح في كل سطر — حتى 3)</label>
            <textarea
              className="input min-h-28 resize-y font-mono text-xs"
              value={keysText}
              onChange={(e) => setKeysText(e.target.value)}
              placeholder={"AIzaSy...\nAIzaSy..."}
            />
            <p className="mt-2 text-xs text-muted">احصل على مفاتيح من Google AI Studio مجاناً.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">الموديل</label>
            <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="gemini-1.5-flash">gemini-1.5-flash (سريع ومجاني)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">برومبت النظام (شخصية البوت)</label>
            <textarea
              className="input min-h-32 resize-y"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <p className="mt-2 text-xs text-muted">أضف هنا معلومات نشاطك ليرد البوت بدقة.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">الحصة اليومية القصوى للردود</label>
            <input type="number" min={1} max={1000} className="input" value={dailyQuota}
              onChange={(e) => setDailyQuota(Number(e.target.value))} />
            <p className="mt-2 text-xs text-muted">بعد بلوغ الحصة يتوقف الرد الذكي لهذا اليوم.</p>
          </div>

          {saved && <p className="text-sm text-emerald-400">✓ تم الحفظ بنجاح</p>}

          <CyberButton
            type="submit"
            disabled={saving}
            status={saved ? "success" : saving ? "loading" : "idle"}
            loadingLabel="جارٍ الحفظ..."
            labels={{ idle: "💾 حفظ", success: "تم الحفظ!" }}
            className="w-full"
          />
        </form>
      )}
    </div>
  );
}
