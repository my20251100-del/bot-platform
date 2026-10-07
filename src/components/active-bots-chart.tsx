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
    <section id="bots" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="card overflow-hidden p-6 sm:p-10 border border-white/10 bg-slate-900/60 backdrop-blur-2xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="badge mb-3 text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
              📊 بيانات حية
            </span>
            <h2 className="text-2xl font-extrabold sm:text-3xl text-white">النشاط الحي للبوتات</h2>
            <p className="mt-2 text-slate-400 text-sm">أحداث ومُخرجات مباشرة من قاعدة البيانات — بدون أرقام وهمية.</p>
          </div>

          <div dir="ltr" className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-slate-950/80 p-1.5">
            {(Object.keys(ranges) as RangeKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  tab === key
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 backdrop-blur-md">
            <p className="text-xs font-medium text-slate-400">بوت متصل الآن</p>
            <div className="mt-2 text-4xl font-black text-emerald-400 font-mono">{base.activeNow.toLocaleString("en-US")}</div>
            <p className="mt-1 text-xs text-emerald-400/80">اتصال سحابي 24/7</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 backdrop-blur-md">
            <p className="text-xs font-medium text-slate-400">مجموع أحداث الفترة</p>
            <AnimatedNumber
              key={tab}
              value={data.total}
              className="mt-2 block text-4xl font-black text-cyan-400 font-mono"
            />
            <p className="mt-1 text-xs text-slate-400">مباشر من الخادم</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 backdrop-blur-md">
            <p className="text-xs font-medium text-slate-400">حالة الخدمات</p>
            <p dir="ltr" className="mt-2 text-4xl font-black text-emerald-400 font-mono">Live</p>
            <p className="mt-1 text-xs text-slate-400">{data.note}</p>
          </div>
        </div>

        <div dir="ltr" className="mt-10">
          <div className="flex h-52 items-end gap-1.5 sm:gap-2">
            {data.series.map((p, i) => (
              <div key={`${tab}-${i}`} className="group relative flex h-full flex-1 items-end">
                <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-xl">
                  {p.label}: {p.value.toLocaleString("en-US")}
                </div>
                <div
                  className="w-full rounded-t-xl transition-all duration-700"
                  style={{
                    height: `${(p.value / max) * 100}%`,
                    background: "linear-gradient(180deg, rgba(16,185,129,0.9), rgba(6,182,212,0.5))",
                    boxShadow: "0 0 20px rgba(16,185,129,0.25)",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-1.5 sm:gap-2">
            {data.series.map((p, i) => (
              <span key={`${tab}-l-${i}`} className="flex-1 truncate text-center text-xs text-slate-400 font-medium">
                {p.label}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          إحصاءات حقيقية مباشرة من قاعدة البيانات (رسائل، حالات، تفاعلات، واستقرار الخوادم السحابية).
        </p>
      </div>
    </section>
  );
}