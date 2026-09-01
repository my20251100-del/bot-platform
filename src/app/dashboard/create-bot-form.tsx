"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CreateBotForm({ hasBot = false }: { hasBot?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
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

    // كود اقتران مؤقت يُستبدل عند بدء الربط الفعلي
    const pairCode = linkMethod === "pair_code"
      ? Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("")
      : null;

    const { error: insErr } = await supabase.from("bots").insert({
      user_id: user.id,
      name,
      phone: phone ? phone.replace(/\D/g, "") : null,
      link_method: linkMethod,
      status: "pending",
      pair_code: pairCode,
      command: "start",
    });

    setLoading(false);
    if (insErr) return setError(insErr.message);
    setOpen(false);
    setName("");
    setPhone("");
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
      <h2 className="font-semibold">بوت جديد</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="bot-name">اسم البوت</label>
          <input id="bot-name" className="input" required value={name}
            onChange={(e) => setName(e.target.value)} placeholder="بوتي الشخصي" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="bot-phone">
            رقم الواتساب <span className="font-normal text-muted">(مطلوب لكود الاقتران)</span>
          </label>
          <input id="bot-phone" dir="ltr" className="input" value={phone}
            onChange={(e) => setPhone(e.target.value)} placeholder="+2010xxxxxxxx" />
        </div>
      </div>

      <div>
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

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "جارٍ الإنشاء..." : "إنشاء البوت"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-xl px-4 py-3 text-sm font-medium text-muted hover:text-white">
          إلغاء
        </button>
      </div>
    </form>
  );
}
