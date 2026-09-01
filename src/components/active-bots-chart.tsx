"use client";

import { useState } from "react";
import { AnimatedNumber } from "@/components/ui/motion";

type Series = { label: string; value: number };

type RangeKey = "اليوم" | "الأسبوع" | "الشهر" | "السنة" | "الكل";

const RANGES: Record<RangeKey, { active: number; delta: string; note: string; series: Series[] }> = {
  اليوم: {
    active: 2411,
    delta: "+12.4%",
    note: "ذروة النشاط عند الرابعة عصراً",
    series: [
      { label: "12ص", value: 1.9 },
      { label: "2ص", value: 2.1 },
      { label: "4ص", value: 2.4 },
      { label: "6ص", value: 2.2 },
      { label: "8ص", value: 2.0 },
      { label: "10ص", value: 2.3 },
      { label: "12م", value: 2.42 },
      { label: "2م", value: 2.44 },
      { label: "4م", value: 2.5 },
      { label: "6م", value: 2.35 },
      { label: "8م", value: 2.1 },
      { label: "10م", value: 1.95 },
    ],
  },
  الأسبوع: {
    active: 3214,
    delta: "+8.2%",
    note: "الجمعة الأكثر نشاطاً هذا الأسبوع",
    series: [
      { label: "السبت", value: 1.6 },
      { label: "الأحد", value: 2.0 },
      { label: "الاثنين", value: 1.8 },
      { label: "الثلاثاء", value: 2.2 },
      { label: "الأربعاء", value: 1.9 },
      { label: "الخميس", value: 2.5 },
      { label: "الجمعة", value: 3.2 },
    ],
  },
  الشهر: {
    active: 8870,
    delta: "+21.7%",
    note: "نمو متواصل منذ بداية الشهر",
    series: [
      { label: "1", value: 1.2 },
      { label: "4", value: 1.5 },
      { label: "7", value: 1.4 },
      { label: "10", value: 1.8 },
      { label: "13", value: 1.7 },
      { label: "16", value: 2.1 },
      { label: "19", value: 2.0 },
      { label: "22", value: 2.4 },
      { label: "25", value: 2.3 },
      { label: "28", value: 2.7 },
      { label: "اليوم", value: 2.9 },
    ],
  },
  السنة: {
    active: 10420,
    delta: "+35.9%",
    note: "أفضل شهر: أكتوبر بنمو قياسي",
    series: [
      { label: "ينا", value: 0.8 },
      { label: "فبر", value: 0.9 },
      { label: "مار", value: 1.1 },
      { label: "أبر", value: 1.0 },
      { label: "ماي", value: 1.3 },
      { label: "يون", value: 1.2 },
      { label: "يول", value: 1.5 },
      { label: "أغس", value: 1.6 },
      { label: "سبت", value: 1.8 },
      { label: "أكت", value: 2.2 },
      { label: "نوف", value: 2.0 },
      { label: "ديس", value: 2.3 },
    ],
  },
  الكل: {
    active: 12450,
    delta: "+200%",
    note: "من أول بوت إلى 12 ألف بوت نشط",
    series: [
      { label: "2024", value: 0.4 },
      { label: "2025", value: 0.9 },
      { label: "2026", value: 1.6 },
      { label: "الآن", value: 2.9 },
    ],
  },
};
export default function ActiveBotsChArt() {
  const [tab, setTab] = useState<RangeKey>("اليوم");
  const data = RANGES[tab];
  const max = Math.max(2.9, ...data.series.map((p) => p.value)) * 1.15;

  return (
    <section id="bots" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="card glass overflow-hidden p-6 sm:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">البوتات النشطة</h2>
            <p className="mt-2 text-muted">نشاط حي للبوتات عبر الزمن — مباشر من الخادم.</p>
          </div>

          <div dir="ltr" className="flex flex-wrap gap-1.5 rounded-xl border border-border/60 bg-elevated/60 p-1.5">
            {(Object.keys(RANGES) as RangeKey[]).map((key) => (
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
            <p className="text-xs font-medium text-muted">بوت نشط الآن</p>
            <AnimatedNumber
              key={tab}
              value={data.active}
              suffix="+"
              className="mt-2 block text-4xl font-bold text-accent"
            />
            <p className="mt-1 text-xs text-emerald-400">{data.delta} عن الفترة السابقة</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-elevated/50 p-5">
            <p className="text-xs font-medium text-muted">متوسط التفاعل</p>
            <p dir="ltr" className="mt-2 text-4xl font-bold text-cyber">
              {(max * 1.4).toFixed(1)}K
            </p>
            <p className="mt-1 text-xs text-muted">تفاعل/يوم محدد</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-elevated/50 p-5">
            <p className="text-xs font-medium text-muted">حالة الخدمات</p>
            <p dir="ltr" className="mt-2 text-4xl font-bold text-emerald-400">70ms</p>
            <p className="mt-1 text-xs text-muted">{data.note}</p>
          </div>
        </div>

        {/* المدرج البياني */}
        <div dir="ltr" className="mt-10">
          <div className="flex h-52 items-end gap-1.5 sm:gap-2">
            {data.series.map((p, i) => (
              <div key={`${tab}-${i}`} className="group relative flex h-full flex-1 items-end">
                <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-black/90 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {p.label}: {p.value}K
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
          الأرقام تفاعلية لأغراض العرض — النشاط الحقيقي يظهر في لوحة التحكم بعد ربط بوتك.
        </p>
      </div>
    </section>
  );
}