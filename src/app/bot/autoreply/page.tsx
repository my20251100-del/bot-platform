"use client";

import { useState } from "react";

type ReplyItem = {
  id: string;
  keyword: string;
  message: string;
  type: "text" | "image" | "sticker" | "audio";
  active: boolean;
};

export default function AutoReplyPage() {
  const [systemActive, setSystemActive] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("");
  const [replyType, setReplyType] = useState<"text" | "image" | "sticker" | "audio">("text");

  const [replies, setReplies] = useState<ReplyItem[]>([
    {
      id: "1",
      keyword: "السلام عليكم",
      message: "وعليكم السلام ورحمة الله وبركاته! أهلاً بك، كيف يمكنني مساعدتك اليوم؟ 🤖",
      type: "text",
      active: true,
    },
    {
      id: "2",
      keyword: "الأسعار",
      message: "باقاتنا المميزة:\n1. البوت المجاني مدى الحياة: 0$\n2. البوت الاحترافي برو: 5$ شهرياً.\nلتفعيل أي باقة راسلنا هنا!",
      type: "text",
      active: true,
    },
    {
      id: "3",
      keyword: "مساعدة",
      message: "أنا المساعد الآلي لبوت برو. يمكنك كتابة 'الأوامر' أو 'الأسعار' للمزيد من المعلومات.",
      type: "text",
      active: true,
    },
  ]);

  const handleAddReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !message.trim()) return;

    const newItem: ReplyItem = {
      id: Date.now().toString(),
      keyword: keyword.trim(),
      message: message.trim(),
      type: replyType,
      active: true,
    };

    setReplies([newItem, ...replies]);
    setKeyword("");
    setMessage("");
    setShowModal(false);
  };

  const toggleReply = (id: string) => {
    setReplies((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const deleteReply = (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا الرد التلقائي؟")) {
      setReplies((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* رأس الصفحة مطابق لـ Red Queen */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">Auto Reply Manager</h1>
          <p className="text-xs sm:text-sm text-muted mt-1">Configure trigger words and automated bot responses</p>
        </div>

        {/* سويتش تفعيل نظام الرد التلقائي بالكامل */}
        <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-surface/80 p-2.5">
          <span className="text-xs font-semibold text-muted">Auto Reply System:</span>
          <button
            type="button"
            onClick={() => setSystemActive(!systemActive)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition-all ${
              systemActive
                ? "bg-matrix/15 text-matrix border border-matrix/30 shadow-[0_0_10px_rgba(0,255,65,0.2)]"
                : "bg-danger/15 text-danger border border-danger/30"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${systemActive ? "bg-matrix animate-ping" : "bg-danger"}`} />
            <span>{systemActive ? "Active (شغال)" : "Offline (متوقف)"}</span>
          </button>
        </div>
      </div>

      {/* زر إضافة رد جديد وإحصائية الردود */}
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm text-muted font-mono">
          {replies.length} replies configured ({replies.filter((r) => r.active).length} active)
        </span>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs sm:text-sm font-bold text-accent-fg shadow-md shadow-accent/25 transition hover:brightness-110 active:scale-95"
        >
          <span>+</span>
          <span>New Reply (رد جديد)</span>
        </button>
      </div>

      {/* نافذة إضافة رد تلقائي جديد */}
      {showModal && (
        <div className="card rounded-3xl border border-accent/40 bg-surface/95 p-6 shadow-2xl backdrop-blur-xl animate-fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="font-bold text-base text-white">Create New Auto Reply</h2>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="text-muted hover:text-white"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleAddReply} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Trigger Keyword (الكلمة المفتاحية)
              </label>
              <input
                type="text"
                required
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="مثال: الأسعار، السلام عليكم، موقعكم..."
                className="w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Response Type (نوع الرد)
              </label>
              <div className="flex gap-2">
                {(["text", "image", "sticker", "audio"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setReplyType(t)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition ${
                      replyType === t
                        ? "bg-accent text-accent-fg"
                        : "border border-border bg-elevated text-muted hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Response Message (نص الرسالة أو الرد)
              </label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب الرد التلقائي الذي سيرسله البوت..."
                className="w-full rounded-xl border border-border bg-elevated p-3 text-sm text-white focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-elevated"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-accent px-5 py-2 text-xs font-bold text-accent-fg hover:brightness-110"
              >
                Save Reply (حفظ)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* قائمة الردود التلقائية النشطة */}
      <div className="grid gap-3">
        {replies.map((r) => (
          <div
            key={r.id}
            className="card rounded-2xl border border-border/80 bg-surface/70 p-4 transition hover:border-accent/50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-accent/15 px-3 py-1 text-xs font-bold text-accent border border-accent/30 font-mono">
                  #{r.keyword}
                </span>
                <span className="rounded-lg bg-elevated px-2 py-0.5 text-[11px] font-mono text-muted uppercase">
                  {r.type}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleReply(r.id)}
                  className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
                    r.active ? "bg-matrix" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      r.active ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => deleteReply(r.id)}
                  className="p-1 text-muted hover:text-danger text-xs transition-colors"
                  title="حذف"
                >
                  🗑️
                </button>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-fg/90 whitespace-pre-line bg-elevated/40 p-3 rounded-xl border border-border/40">
              {r.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
