"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CyberButton from "@/components/ui/cyber-button";
import { Skeleton } from "@/components/ui/motion";

export default function AntiLinksPage() {
  const router = useRouter();
  const [bots, setBots] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [firewallOn, setFirewallOn] = useState(false);
  const [domainsText, setDomainsText] = useState("");
  const [dictionaryOn, setDictionaryOn] = useState(false);
  const [wordsText, setWordsText] = useState("");
  const [antiEdit, setAntiEdit] = useState(false);
  const [antiMention, setAntiMention] = useState(false);
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
    setFirewallOn(!!s.firewallOn);
    setDomainsText(Array.isArray(s.firewallDomains) ? s.firewallDomains.join("\n") : "");
    setDictionaryOn(!!s.dictionaryOn);
    setWordsText(Array.isArray(s.bannedWords) ? s.bannedWords.join("\n") : "");
    setAntiEdit(!!s.antiEdit);
    setAntiMention(!!s.antiMention);
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
        firewallOn,
        firewallDomains: domainsText.split("\n").map((s) => s.trim()).filter(Boolean),
        dictionaryOn,
        bannedWords: wordsText.split("\n").map((s) => s.trim()).filter(Boolean),
        antiEdit,
        antiMention,
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
        <Skeleton className="h-72 w-full" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cyber-title text-2xl font-bold">🔗 حظر الروابط والكلمات</h1>
        <p className="mt-2 text-muted">
          جدار الحماية يوقف الروابط المحظورة، والقاموس يوقف الكلمات، ومكافحة التعديل والإشارة تحمي مجموعاتك.
        </p>
      </div>

      {bots.length === 0 ? (
        <p className="card p-6 text-muted">لا توجد بوتات بعد.</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="card space-y-6 p-6">
          <label className="mb-1.5 block text-sm font-medium">اختر البوت</label>
          <select className="input" value={selected} onChange={(e) => onPick(e.target.value)}>
            {bots.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.linked_number}</option>)}
          </select>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-elevated p-3">
              <span className="font-medium">🔥 جدار الحماية (Firewall)</span>
              <input type="checkbox" checked={firewallOn} onChange={(e) => setFirewallOn(e.target.checked)} />
            </label>
            {firewallOn && (
              <textarea
                className="input min-h-28 resize-y"
                value={domainsText}
                onChange={(e) => setDomainsText(e.target.value)}
                placeholder={"youtube.com\ninstagram.com\n t.me"}
              />
            )}
          </div>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-elevated p-3">
              <span className="font-medium">📖 قاموس الكلمات المحظورة</span>
              <input type="checkbox" checked={dictionaryOn} onChange={(e) => setDictionaryOn(e.target.checked)} />
            </label>
            {dictionaryOn && (
              <textarea
                className="input min-h-28 resize-y"
                value={wordsText}
                onChange={(e) => setWordsText(e.target.value)}
                placeholder={"كلمة سطر واحد في الصف"}
              />
            )}
          </div>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-elevated p-3">
              <span className="font-medium">✏️ مكافحة التعديل</span>
              <input type="checkbox" checked={antiEdit} onChange={(e) => setAntiEdit(e.target.checked)} />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-elevated p-3">
              <span className="font-medium">🏷️ مكافحة الإشارة (@)</span>
              <input type="checkbox" checked={antiMention} onChange={(e) => setAntiMention(e.target.checked)} />
            </label>
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
