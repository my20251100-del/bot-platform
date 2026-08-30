"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CyberButton from "@/components/ui/cyber-button";

type BotOption = {
  id: string;
  name: string;
  linked_number?: string | null;
};

export default function ScheduleForm({ bots }: { bots: BotOption[] }) {
  const router = useRouter();
  const [botId, setBotId] = useState(bots[0]?.id ?? "");
  const [kind, setKind] = useState<"status" | "message">("status");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("");
  const [runAt, setRunAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!body.trim()) return setError("اكتب نص المنشور أولاً.");
    if (!runAt) return setError("اختر وقت النشر.");
    if (kind === "message" && !/^\d{8,15}$/.test(target.replace(/\D/g, ""))) {
      return setError("أدخل رقم الهدف بالصيغة الدولية بدون + مثال: 967771234567");
    }
    if (!botId) return setError("أنشئ بوتاً أولاً.");

    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const runAtIso = new Date(runAt).toISOString();

    const { error: insertError } = await supabase.from("scheduled_posts").insert({
      user_id: user!.id,
      bot_id: botId,
      kind,
      target: kind === "message" ? target.replace(/\D/g, "") + "@s.whatsapp.net" : null,
      body: body.trim(),
      run_at: runAtIso,
    });

    setBusy(false);
    if (insertError) return setError(insertError.message);

    setBody("");
    setTarget("");
    setRunAt("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="sc-bot">
            البوت
          </label>
          <select
            id="sc-bot"
            className="input"
            value={botId}
            onChange={(e) => setBotId(e.target.value)}
          >
            {bots.length === 0 && <option value="">لا توجد بوتات</option>}
            {bots.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.linked_number ? ` (${b.linked_number})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="sc-kind">
            نوع المنشور
          </label>
          <select
            id="sc-kind"
            className="input"
            value={kind}
            onChange={(e) => setKind(e.target.value as "status" | "message")}
          >
            <option value="status">حالة / ستوري</option>
            <option value="message">رسالة لمحادثة</option>
          </select>
        </div>
      </div>

      {kind === "message" && (
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="sc-target">
            رقم المستلم
          </label>
          <input
            id="sc-target"
            dir="ltr"
            className="input text-left"
            placeholder="967771234567"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="sc-body">
          النص
        </label>
        <textarea
          id="sc-body"
          className="input min-h-24 resize-y"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="عرض اليوم: خصم 20% على كل المنتجات 🎉"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="sc-time">
          وقت النشر
        </label>
        <input
          id="sc-time"
          type="datetime-local"
          className="input"
          value={runAt}
          onChange={(e) => setRunAt(e.target.value)}
        />
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
        loadingLabel="جارٍ الحفظ..."
        labels={{ idle: "جدولة النشر", success: "تمت الجدولة!" }}
        className="w-full"
      />
    </form>
  );
}
