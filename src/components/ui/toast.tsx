"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const ToastContext = createContext<{ toast: (msg: string, type?: ToastType) => void }>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* وعاء التوستات */}
      <div className="fixed bottom-6 left-1/2 z-[100] flex w-[92%] max-w-sm -translate-x-1/2 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className="glass flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg"
            style={{
              transformOrigin: "bottom",
              animation: "pop 0.3s cubic-bezier(0.22,1,0.36,1) forwards",
              borderColor:
                t.type === "success" ? "rgba(16,185,129,0.5)" : t.type === "error" ? "rgba(255,0,60,0.5)" : "rgba(0,212,255,0.5)",
              boxShadow:
                t.type === "success"
                  ? "0 0 20px rgba(16,185,129,0.35)"
                  : t.type === "error"
                  ? "0 0 20px rgba(255,0,60,0.35)"
                  : "0 0 20px rgba(0,212,255,0.35)",
            }}
          >
            <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-base">
              {t.type === "success" ? (
                <svg className="check-path" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              ) : t.type === "error" ? (
                <span>🔄</span>
              ) : (
                <span>🔔</span>
              )}
            </span>
            <span className="font-medium text-white">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
