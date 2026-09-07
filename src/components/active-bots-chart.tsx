"use client";

import { useState } from "react";
import { AnimatedNumber } from "@/components/ui/motion";

type Series = { label: string; value: number };

type RangeKey = "اليوم" | "الأسبوع" | "الشهر" | "الكل";

export type LiveStats = {
  today: number;
  week: number;
  month: number;
  all: number;
  activeNow: number;
};

export default function ActiveBotsChArt({ live }: { live?: LiveStats }) {
  const [tab, setTab] = useState<RangeKey>("اليوم");
  const base = live ?? { today: 0, week: 0, month: 0, all: 0, activeNow: 0 };

  const ranges: Record<RangeKey, { total: number; series: Series[]; note: string }> = {
    اليوم: {
      total: base.today,
      note: "أحداث اليوم مباشرة من الخادم",
      series: [{ label: "اليوم", value: Math.max(1, base.today) }],
    },
    الأسبوع: {
      total: base.week,
      note: "أحداث آخر 7 أيام مباشرة من الخادم",
      series: [{ label: "أسبوع", value: Math.max(1, base.week) }],
    },
    الشهر: {
      total: base.month,
      note: "أحداث آخر 30 يوماً مباشرة من الخادم",
      series: [{ label: "شهر", value: Math.max(1, base.month) }],
    },
    الكل: {
      total: base.all,
      note: "إجمالي الأحداث المسجلة منذ الانطلاق مباشرة من الخادم",
      series: [{ label: "الكل", value: Math.max(1, base.all) }],
    },
  };

  const data = ranges[tab];
  const max = Math.max(1, ...data.series.map((p) => p.value)) * 1.15;

  return (
    <section id="bots" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="card glass overflow-hidden p-6 sm:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">النشاط الحي للبوتات</h2>
            <p className="mt-2 text-muted">أحداث ومُخرجات مباشرة من قاعدة البيانات — بدون أرقام تجميلية.</p>
          </div>

          <div dir="ltr" className="flex flex-wrap gap-1.5 rounded-xl border border-border/60 bg-elevated/60 p-1.5">
            {(Object.keys(ranges) as RangeKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === key
                    ? "bg-accent text-accent-fg shadow-lg shadow-accent/30"
                    : "text-muted hover:bg-border/40 hover:text-white"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-elevated/50 p-5">
            <p className="text-xs font-medium text-muted">بوت متصل الآن</p>
            <div className="mt-2 text-4xl font-bold text-accent">{base.activeNow.toLocaleString("en-US")}</div>
            <p className="mt-1 text-xs text-emerald-400">اتصال حي 24/7</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-elevated/50 p-5">
            <p className="text-xs font-medium text-muted">مجموع أحداث الفترة</p>
            <AnimatedNumber
              key={tab}
              value={data.total}
              className="mt-2 block text-4xl font-bold text-cyber"
            />
            <p className="mt-1 text-xs text-muted">مباشر من الخادم</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-elevated/50 p-5">
            <p className="text-xs font-medium text-muted">حالة الخدمات</p>
            <p dir="ltr" className="mt-2 text-4xl font-bold text-emerald-400">Live</p>
            <p className="mt-1 text-xs text-muted">{data.note}</p>
          </div>
        </div>

        <div dir="ltr" className="mt-10">
          <div className="flex h-52 items-end gap-1.5 sm:gap-2">
            {data.series.map((p, i) => (
              <div key={`${tab}-${i}`} className="group relative flex h-full flex-1 items-end">
                <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-black/90 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {p.label}: {p.value.toLocaleString("en-US")}
                </div>
                <div
                  className="w-full rounded-t-lg transition-all duration-700"
                  style={{
                    height: `${(p.value / max) * 100}%`,
                    background: "linear-gradient(180deg, rgba(0,212,255,0.9), rgba(179,0,255,0.45))",
                    boxShadow: "0 0 12px rgba(0,212,255,0.18)",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5 sm:gap-2">
            {data.series.map((p, i) => (
              <span key={`${tab}-l-${i}`} className="flex-1 truncate text-center text-xs text-muted">
                {p.label}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          إحصاءات حقيقية مباشرة من قاعدة البيانات (رسائل، حالات، تفاعلات، مكالمات وكل أحداث المحرك).
        </p>
      </div>
    </section>
  );
}