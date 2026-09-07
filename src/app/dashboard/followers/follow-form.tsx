"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { maskPhone } from "@/lib/phone";
import CyberButton from "@/components/ui/cyber-button";

type BotOption = { id: string; name: string; status: string; linked_number?: string | null };

export default function FollowForm({ bots }: { bots: BotOption[] }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [botId, setBotId] = useState(bots[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = link.trim();
    if (!/^https?:\/\/(www\.)?whatsapp\.com\/channel\/[\w-]+/.test(trimmed)) {
      setError("الرابط غير صالح. مثال صحيح: https://whatsapp.com/channel/0029Va...");
      return;
    }
    if (!botId) {
      setError("أنشئ بوتاً واربط رقماً أولاً من صفحة البوتات.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("channel_follows").insert({
      user_id: user!.id,
      bot_id: botId,
      link: trimmed,
    });

    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setLink("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="ch-link">
          رابط القناة
        </label>
        <input
          id="ch-link"
          dir="ltr"
          className="input text-left"
          placeholder="https://whatsapp.com/channel/0029Va..."
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="ch-bot">
          الرقم المتابع (البوت)
        </label>
        <select
          id="ch-bot"
          className="input"
          value={botId}
          onChange={(e) => setBotId(e.target.value)}
        >
          {bots.length === 0 && <option value="">لا توجد بوتات</option>}
          {bots.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.linked_number ? ` (${maskPhone(b.linked_number)})` : ""}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-muted">
          يجب أن يكون الرقم متصلاً حتى تنجح المتابعة.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <CyberButton
        type="submit"
        disabled={busy}
        status={success ? "success" : busy ? "loading" : "idle"}
        loadingLabel="جارٍ الإرسال..."
        labels={{ idle: "طلب المتابعة", success: "تمت الإضافة!" }}
        className="w-full"
      />
    </form>
  );
}
