"use client";

import { useState } from "react";

export default function ReferralBox({
  url,
  code,
  count,
  earned,
}: {
  url: string;
  code: string;
  count: number;
  earned: number;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* المتصفح رفض الوصول للحافظة */
    }
  }

  const shareText = encodeURIComponent(
    `🤖 جرّب بوت برو — بوت واتساب ذكي يتفاعل مع الحالات ويحميك من الحذف مجاناً!\n${url}`
  );

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">اربح كريدت مجاني</p>
        <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          +10 كريدت لكل صديق
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-elevated p-3 text-center">
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-xs text-muted">صديق انضم</p>
        </div>
        <div className="rounded-xl border border-border bg-elevated p-3 text-center">
          <p className="text-2xl font-bold text-emerald-400">+{earned}</p>
          <p className="text-xs text-muted">كريدت مكتسب</p>
        </div>
      </div>

      <div dir="ltr" className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-elevated px-3 py-2 text-left">
        <code className="min-w-0 flex-1 truncate text-sm">{url}</code>
        <button
          type="button"
          onClick={copyLink}
          className="flex-shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition-opacity hover:opacity-85"
        >
          {copied ? "✓ تم" : "نسخ"}
        </button>
      </div>

      <a
        href={`https://wa.me/?text=${shareText}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/25"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
        شارك عبر واتساب
      </a>

      <p className="mt-3 text-center text-xs text-muted">
        كودك:{" "}
        <span dir="ltr" className="font-mono font-semibold text-accent">{code}</span>
      </p>
    </div>
  );
}
