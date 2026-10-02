"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal, AnimatedNumber } from "@/components/ui/motion";

interface VaultItem {
  id: number;
  botId: string;
  botName: string;
  event: string;
  sender: string;
  senderPhone: string;
  senderName: string;
  chatType: string;
  messageText: string;
  mediaType: string;
  mediaUrl?: string;
  createdAt: string;
}

export default function MediaVaultClient({
  initialItems,
  botNames,
}: {
  initialItems: VaultItem[];
  botNames: Record<string, string>;
}) {
  const [items] = useState<VaultItem[]>(initialItems);
  const [filter, setFilter] = useState<"all" | "media" | "text" | "viewonce">("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredItems = items.filter((item) => {
    // Category filter
    if (filter === "media" && !item.mediaType.includes("صورة") && !item.mediaType.includes("فيديو") && !item.mediaType.includes("وسائط") && !item.mediaType.includes("تسجيل")) {
      return false;
    }
    if (filter === "text" && !item.messageText) {
      return false;
    }
    if (filter === "viewonce" && item.event !== "viewonce_saved") {
      return false;
    }

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchText = (item.messageText || "").toLowerCase().includes(q);
      const matchSender = (item.senderName || "").toLowerCase().includes(q);
      const matchPhone = (item.senderPhone || "").includes(q);
      if (!matchText && !matchSender && !matchPhone) return false;
    }
    return true;
  });

  const handleCopy = (id: number, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const mediaCount = items.filter((i) => i.mediaType && i.mediaType !== "نص").length;
  const viewOnceCount = items.filter((i) => i.event === "viewonce_saved").length;

  return (
    <div className="mx-auto max-w-5xl">
      {/* رأس الصفحة والمقدمة */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xl shadow-[0_0_15px_rgba(244,63,94,0.25)]">
              🗑️
            </span>
            خزانة المحذوفات والوسائط المسترجعة
          </h1>
          <p className="mt-1 text-sm text-muted">
            جميع الرسائل، الصور، والتسجيلات التي حذفها الطرف الآخر («Delete for Everyone») تم إنقاذها وحفظها هنا تلقائياً
          </p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-xl border border-border/70 bg-elevated/60 px-4 py-2 text-xs font-semibold text-muted hover:text-white hover:border-accent transition-all"
        >
          ← العودة للوحة القيادة
        </Link>
      </div>

      {/* شريط الإحصائيات المصغر */}
      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-border/70 bg-surface/80 p-4 backdrop-blur-xl">
          <div className="text-xs text-muted">إجمالي المحذوفات المنقذة</div>
          <div className="tech text-2xl font-bold text-white mt-1">
            <AnimatedNumber value={items.length} />
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-surface/80 p-4 backdrop-blur-xl">
          <div className="text-xs text-muted">الصور والوسائط المنقذة</div>
          <div className="tech text-2xl font-bold text-rose-400 mt-1">
            <AnimatedNumber value={mediaCount} />
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-surface/80 p-4 backdrop-blur-xl">
          <div className="text-xs text-muted">عرض لمرة واحدة (View-Once)</div>
          <div className="tech text-2xl font-bold text-amber-400 mt-1">
            <AnimatedNumber value={viewOnceCount} />
          </div>
        </div>
      </div>

      {/* شريط البحث والفلاتر */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface/90 p-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-xl px-3.5 py-1.5 font-semibold transition-all ${
              filter === "all" ? "bg-accent text-bg font-bold shadow-[0_0_12px_rgba(0,212,255,0.4)]" : "text-muted hover:text-white"
            }`}
          >
            الكل ({items.length})
          </button>
          <button
            onClick={() => setFilter("media")}
            className={`rounded-xl px-3.5 py-1.5 font-semibold transition-all ${
              filter === "media" ? "bg-rose-500 text-bg font-bold shadow-[0_0_12px_rgba(244,63,94,0.4)]" : "text-muted hover:text-white"
            }`}
          >
            🖼️ وسائط وصور ({mediaCount})
          </button>
          <button
            onClick={() => setFilter("viewonce")}
            className={`rounded-xl px-3.5 py-1.5 font-semibold transition-all ${
              filter === "viewonce" ? "bg-amber-500 text-bg font-bold shadow-[0_0_12px_rgba(245,158,11,0.4)]" : "text-muted hover:text-white"
            }`}
          >
            👁️ عرض مرة واحدة ({viewOnceCount})
          </button>
          <button
            onClick={() => setFilter("text")}
            className={`rounded-xl px-3.5 py-1.5 font-semibold transition-all ${
              filter === "text" ? "bg-purple-500 text-bg font-bold shadow-[0_0_12px_rgba(168,85,247,0.4)]" : "text-muted hover:text-white"
            }`}
          >
            📝 نصوص فقط
          </button>
        </div>

        <div className="relative min-w-[220px] flex-1 sm:flex-initial">
          <input
            type="text"
            placeholder="بحث بالرقم، الاسم، أو النص..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border/80 bg-elevated/70 px-3 py-1.5 text-xs text-white placeholder-muted focus:border-accent focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* قائمة العناصر المسترجعة */}
      {filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 bg-surface/40 p-12 text-center backdrop-blur-xl">
          <span className="text-4xl">🛡️</span>
          <h3 className="mt-3 text-lg font-bold text-white">الخزانة فارغة حالياً</h3>
          <p className="mt-1 text-xs text-muted max-w-md mx-auto leading-relaxed">
            محرك البوت يراقب محادثاتك على مدار الساعة؛ بمجرد أن يقوم أي طرف بحذف رسالة أو صورة أرسلها إليك، ستظهر هنا فوراً وتُرسل نسخة منها إلى رقمك الشخصي (Note to Self).
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((item, idx) => (
            <Reveal key={item.id} delay={Math.min(0.5, idx * 0.05)}>
              <div className="group rounded-2xl border border-border/70 bg-surface/85 p-5 shadow-lg backdrop-blur-xl transition-all hover:border-accent/60 hover:shadow-[0_0_25px_rgba(0,212,255,0.12)]">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-elevated text-lg border border-border">
                      {item.event === "viewonce_saved" ? "👁️" : item.mediaType.includes("صورة") ? "🖼️" : item.mediaType.includes("تسجيل") ? "🎵" : "🗑️"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {item.senderName || item.senderPhone || "مجهول"}
                        </span>
                        {item.senderPhone && (
                          <span dir="ltr" className="text-xs text-muted font-mono bg-elevated px-2 py-0.5 rounded-md">
                            +{item.senderPhone}
                          </span>
                        )}
                        <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.2 text-[10px] font-bold text-rose-400">
                          محذوفة ✕
                        </span>
                      </div>
                      <span className="text-[11px] text-muted mt-0.5 block">
                        عبر البوت: <span className="text-accent">{item.botName}</span> · المحادثة: {item.chatType}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs text-muted font-mono">
                    {new Date(item.createdAt).toLocaleDateString("ar-SA", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* محتوى الرسالة المسترجعة */}
                <div className="mt-4">
                  {item.messageText ? (
                    <div className="rounded-xl border border-border/60 bg-elevated/50 p-3.5 text-sm text-white/95 leading-relaxed font-sans whitespace-pre-wrap select-text">
                      {item.messageText}
                    </div>
                  ) : null}

                  {item.mediaType && item.mediaType !== "نص" ? (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
                      <span>📎</span>
                      <span>نوع الوسائط المسترجعة: <strong>{item.mediaType}</strong></span>
                      <span className="text-muted text-[11px] mr-auto">تم إرسال النسخة الأصلية لمراسلة نفسك بالواتساب ✓</span>
                    </div>
                  ) : null}
                </div>

                {/* شريط الإجراءات */}
                <div className="mt-4 flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                  <div className="flex items-center gap-2 text-muted">
                    <span>🛡️ تم فك التشفير والإنقاذ بنجاح</span>
                  </div>

                  {item.messageText && (
                    <button
                      onClick={() => handleCopy(item.id, item.messageText)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-muted hover:text-white hover:border-accent transition-all"
                    >
                      {copiedId === item.id ? (
                        <>
                          <span className="text-emerald-400">✓</span>
                          <span className="text-emerald-400">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <span>📋</span>
                          <span>نسخ النص</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
