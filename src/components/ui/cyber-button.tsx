"use client";

import React, { useRef, useState } from "react";

export type ButtonStatus = "idle" | "loading" | "success" | "error" | "disabled";

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  labels?: Partial<{
    idle: React.ReactNode;
    loading: React.ReactNode;
    success: React.ReactNode;
    error: React.ReactNode;
  }>;
  status?: ButtonStatus;
  loadingLabel?: React.ReactNode;
}

export default function CyberButton({
  children,
  status = "idle",
  labels,
  loadingLabel,
  className = "",
  onClick,
  disabled,
  ...rest
}: CyberButtonProps) {
  const [ripples, setRipples] = useState<{ x: number; y: number; size: number; id: number }[]>([]);
  const [clickScale, setClickScale] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  function makeRipple(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const size = Math.max(rect.width, rect.height) * 2;
    setRipples((r) => [
      ...r,
      { x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2, size, id: Date.now() },
    ]);
    setTimeout(() => setRipples((r) => r.slice(1)), 600);
  }

  const isDisabled = disabled || status === "disabled" || status === "loading";

  // المحتوى حسب الحالة
  let content: React.ReactNode = children;
  if (status === "loading") content = labels?.loading ?? loadingLabel ?? "جارٍ الحفظ...";
  else if (status === "success") content = labels?.success ?? "✓ تم الحفظ!";
  else if (status === "error") content = labels?.error ?? "إعادة المحاولة";

  return (
    <button
      ref={ref}
      {...rest}
      disabled={isDisabled}
      onClick={(e) => {
        if (status === "idle") {
          makeRipple(e);
          setClickScale(true);
          setTimeout(() => setClickScale(false), 150);
        }
        onClick?.(e);
      }}
      className={`btn-primary relative overflow-hidden select-none ${clickScale ? "scale-[0.96]" : ""} ${status === "success" ? "!bg-emerald-500 !shadow-[0_0_24px_rgba(16,185,129,0.6)]" : ""} ${status === "error" ? "!bg-blood !shadow-[0_0_24px_rgba(255,0,60,0.6)]" : ""} ${isDisabled ? "cursor-not-allowed !opacity-50" : ""} ${className}`}
      style={{ transition: "transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease, opacity 0.2s ease" }}
    >
      {status === "loading" && (
        <span className="inline-block h-4 w-4 rounded-full border-2 border-black/30 border-t-black" style={{ animation: "spin 0.7s linear infinite" }} />
      )}
      {status === "success" && (
        <svg className="check-path" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      <span className="relative z-10">{content}</span>

      <span aria-hidden className="pointer-events-none absolute z-20" style={{ position: "absolute" }}>
        {ripples.map((r) => (
          <span
            key={r.id}
            className="absolute rounded-full bg-white/30"
            style={{ left: r.x, top: r.y, width: r.size, height: r.size, animation: "ring-pulse 0.6s ease-out forwards" }}
          />
        ))}
      </span>
    </button>
  );
}

/* ---- جسيمات خلفية متحركة ---- */
export function Particles({ count = 22 }: { count?: number }) {
  const seeds = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: (i * 37) % 100,
      top: (i * 53) % 100,
      size: 2 + (i % 3),
      dur: 8 + (i % 7),
      delay: (i % 10) * 0.5,
    }));
  }, [count]);

  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {seeds.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
