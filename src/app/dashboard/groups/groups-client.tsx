"use client";

import { useState } from "react";
import { maskPhone } from "@/lib/phone";

interface GroupItem {
  id: string;
  subject: string;
  participantsCount: number;
  amAdmin: boolean;
  owner?: string | null;
}

export default function GroupsClient({
  bots,
  initialBotId,
}: {
  bots: any[];
  initialBotId: string;
}) {
  const [selectedBotId, setSelectedBotId] = useState(initialBotId);
  const [customPhone, setCustomPhone] = useState("");
  const [loadingGroupId, setLoadingGroupId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedBot = bots.find((b) => b.id === selectedBotId);
  const groups: GroupItem[] = selectedBot?.metadata?.groups || [];
  const defaultTargetPhone = selectedBot?.linked_number || selectedBot?.phone || "";

  async function handlePromote(groupId: string, groupSubject: string, amAdmin: boolean) {
    if (!amAdmin) {
      alert(`⚠️ تنبيه واتساب:\nالبوت ليس مشرفاً في مجموعة "${groupSubject}".\nيرجى رفع البوت مشرفاً أولاً في المجموعة لتتمكن من ترقية نفسك!`);
      return;
    }

    setLoadingGroupId(groupId);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/bot/groups/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: selectedBotId,
          groupId,
          targetPhone: customPhone.trim() || defaultTargetPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل إرسال أمر الترقية");
      }

      setStatusMsg({
        type: "success",
        text: `👑 تم إرسال أمر الترقية بنجاح لمجموعة "${groupSubject}"! سيقوم البوت بترقيتك خلال ثوانٍ.`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "حدث خطأ أثناء تنفيذ الترقية",
      });
    } finally {
      setLoadingGroupId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* اختيار البوت ورقم الترقية */}
      <div className="card p-6 border-accent/30 bg-surface/70 shadow-lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-fg">اختر البوت</label>
            <select
              className="input w-full"
              value={selectedBotId}
              onChange={(e) => {
                setSelectedBotId(e.target.value);
                setStatusMsg(null);
              }}
            >
              {bots.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {maskPhone(b.linked_number || b.phone) || "غير متصل"} ({b.status === "connected" ? "متصل ✅" : "غير متصل ❌"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-fg">
              الرقم المراد ترقيته لمشرف (تلقائياً رقمك)
            </label>
            <input
              type="text"
              dir="ltr"
              className="input w-full font-mono text-left"
              placeholder={defaultTargetPhone || "مثال: 967772847565"}
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              اتركه فارغاً ليتم ترقية رقمك المربوط ({defaultTargetPhone || "رقم المالك"}) تلقائياً.
            </p>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`mt-4 rounded-xl border p-4 text-sm font-medium ${
              statusMsg.type === "success"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/50 bg-red-500/10 text-red-300"
            }`}
          >
            {statusMsg.text}
          </div>
        )}
      </div>

      {/* بطاقة الشرح السريع للأوامر في واتساب */}
      <div className="card border-accent/20 bg-elevated/40 p-5 backdrop-blur-md">
        <h3 className="flex items-center gap-2 font-bold text-accent text-base mb-2">
          <span>⚡</span> طريقة الاستخدام المباشر عبر واتساب:
        </h3>
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex items-start gap-2">
            <span className="text-matrix font-mono font-bold">1.</span>
            <span>
              <strong>داخل أي مجموعة:</strong> اكتب مباشرة <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-fg border border-border">.مشرف</code> وسيرقيك البوت لمشرف فوراً.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-matrix font-mono font-bold">2.</span>
            <span>
              <strong>في المحادثة الخاصة مع البوت:</strong> اكتب <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-fg border border-border">.مجموعاتي</code> لعرض كل القروبات بأرقامها، ثم أرسل <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-fg border border-border">.مشرف [رقم المجموعة]</code> (مثال: <code className="font-mono text-accent">.مشرف 1</code>).
            </span>
          </li>
          <li className="flex items-start gap-2 text-xs text-muted/80">
            <span className="text-amber-400">⚠️</span>
            <span>
              <strong>شرط واتساب الأساسي:</strong> يجب أن يكون رقم البوت مشرفاً في القروب أولاً ليتمكن من ترقية الآخرين.
            </span>
          </li>
        </ul>
      </div>

      {/* قائمة المجموعات */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold cyber-title">
            المجموعات المتاحة ({groups.length})
          </h2>
          <span className="text-xs text-muted">
            {selectedBot?.metadata?.groups_synced_at
              ? `آخر مزامنة: ${new Date(selectedBot.metadata.groups_synced_at).toLocaleTimeString("ar-YE")}`
              : "تتم المزامنة تلقائياً من محرك البوت"}
          </span>
        </div>

        {groups.length === 0 ? (
          <div className="card p-10 text-center text-muted">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-bold text-fg mb-1">لا توجد مجموعات مسجلة بعد</p>
            <p className="text-sm max-w-md mx-auto mb-4">
              تأكد من أن البوت متصل وقم بإرسال أمر <code className="font-mono text-accent">.مجموعاتي</code> للبوت في واتساب لجلب جميع المجموعات فوراً.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((group) => {
              const isLoading = loadingGroupId === group.id;

              return (
                <div
                  key={group.id}
                  className={`card relative flex flex-col justify-between p-5 transition-all border ${
                    group.amAdmin
                      ? "border-emerald-500/40 bg-surface/80 hover:border-emerald-500/70"
                      : "border-border/80 bg-surface/50 hover:border-border"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-fg text-lg truncate" title={group.subject}>
                          {group.subject}
                        </h3>
                        <p className="font-mono text-xs text-muted truncate">{group.id}</p>
                      </div>

                      {group.amAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          البوت مشرف ✅
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                          البوت عضو ⚠️
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted mb-5">
                      <span>👥 {group.participantsCount} عضو</span>
                      <span>•</span>
                      <span>{group.amAdmin ? "صلاحيات كاملة للترقية" : "يحتاج رفع البوت مشرف أولاً"}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50">
                    <button
                      disabled={isLoading}
                      onClick={() => handlePromote(group.id, group.subject, group.amAdmin)}
                      className={`w-full justify-center text-sm py-2.5 px-4 rounded-xl font-bold transition-all shadow-md flex items-center gap-2 ${
                        group.amAdmin
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/20 active:scale-[0.98]"
                          : "bg-surface border border-border/80 text-muted hover:text-fg hover:border-amber-500/50 cursor-pointer"
                      }`}
                    >
                      {isLoading
                        ? "جارٍ إرسال الترقية..."
                        : group.amAdmin
                        ? "👑 رقّني مشرفاً في هذه المجموعة"
                        : "⚠️ البوت ليس مشرفاً في هذا القروب"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
