"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizePhoneNumber } from "@/lib/phone";

export default function CreateBotForm({ hasBot = false }: { hasBot?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [linkMethod, setLinkMethod] = useState<"pair_code" | "qr">("pair_code");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (hasBot) {
    return (
      <div className="card glass p-4 text-center border-accent/30 text-sm text-muted">
        <span className="text-accent font-semibold">🔒 تنبيه:</span> يُسمح ببوت واحد فقط لكل حساب. يمكنك إدارة بوتك الحالي من القائمة أدناه.
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return setError("يجب تسجيل الدخول أولاً");
    }

    // فحص ما إذا كان للمستخدم بوت مسبقاً لمنع التكرار
    const { data: existingBots } = await supabase
      .from("bots")
      .select("id")
      .eq("user_id", user.id);

    if (existingBots && existingBots.length > 0) {
      setLoading(false);
      return setError("لديك بوت بالفعل — يُسمح ببوت واحد فقط لكل حساب");
    }

    const cleanPhone = phone ? normalizePhoneNumber(phone) : null;
    if (linkMethod === "pair_code" && (!cleanPhone || cleanPhone.length < 10)) {
      setLoading(false);
      return setError("يرجى إدخال رقم واتساب صالح (مثال: 77xxxxxxx أو +96777xxxxxxx)");
    }

    const botName = `بوت ${cleanPhone?.slice(-4) || "جديد"}`;

    const { data: newBot, error: insErr } = await supabase
      .from("bots")
      .insert({
        user_id: user.id,
        name: botName,
        phone: cleanPhone,
        link_method: linkMethod,
        status: "pending",
        pair_code: null,
        qr: null,
        command: "start",
      })
      .select("id")
      .single();

    if (insErr || !newBot) {
      setLoading(false);
      return setError(insErr?.message || "تعذّر إنشاء البوت");
    }

    try {
      await fetch("/api/bot/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: newBot.id,
          action: "start",
          phone: cleanPhone,
          linkMethod,
        }),
      });
    } catch {
      // غير حرج
    }

    setLoading(false);
    setOpen(false);
    setPhone("");
    router.push(`/dashboard/bots/${newBot.id}`);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        إنشاء بوت جديد
      </button>
    );
  }

  return (
    <form onSubmit={handleCreate} className="card space-y-4 p-6">
      <h2 className="font-semibold text-lg text-white">ربط واتساب جديد</h2>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="bot-phone">
          رقم الواتساب <span className="font-normal text-muted">(مع مفتاح الدولة)</span>
        </label>
        <input 
          id="bot-phone" 
          type="tel"
          dir="ltr" 
          className="input w-full text-lg tracking-wider" 
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} 
          placeholder="96777xxxxxxx" 
        />
        <span className="mt-1.5 block text-xs text-muted">
          أدخل رقمك مسبوقاً بمفتاح الدولة (مثال: 967 لليمن، 966 للسعودية)
        </span>
      </div>

      <div className="hidden">
        {/* إخفاء اختيار طريقة الربط وجعلها كود افتراضياً لتسهيل التجربة */}
        <span className="mb-2 block text-sm font-medium">طريقة الربط</span>
        <div className="grid grid-cols-2 gap-3">
          {(["pair_code", "qr"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setLinkMethod(m)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                linkMethod === m
                  ? "border-accent bg-accent/15 text-white"
                  : "border-border bg-elevated text-muted hover:text-white"
              }`}
            >
              {m === "pair_code" ? "كود اقتران (8 أرقام)" : "رمز QR"}
            </button>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted mt-2">
        <input
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
        />
        <span>
          أوافق على الشروط والأحكام وسياسة الاستخدام
        </span>
      </label>

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading || !phone} className="btn-primary w-full shadow-lg shadow-accent/20">
          {loading ? "جارٍ التوليد..." : "إنشاء رمز الاقتران 🚀"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-xl px-4 py-3 text-sm font-medium text-muted hover:text-white border border-border bg-elevated">
          إلغاء
        </button>
      </div>
    </form>
  );
}
