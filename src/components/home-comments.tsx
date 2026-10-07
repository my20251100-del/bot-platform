"use client";

import { useSyncExternalStore, useState } from "react";
import { useI18n } from "@/components/i18n-provider";

type Comment = {
  id: string;
  name: string;
  text: string;
  createdAt: string;
};

const STORAGE_KEY = "hatemx.home.comments.v1";

let cache: Comment[] | null = null;
const listeners = new Set<() => void>();

function load(): Comment[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Comment[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function save(next: Comment[]) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore save errors
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => {
    cache = null;
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    listeners.delete(cb);
  };
}

const getServerSnapshot = () => [];

export default function HomeComments() {
  const { t } = useI18n();
  const comments = useSyncExternalStore(subscribe, load, getServerSnapshot);
  const [name, setName] = useState("");
  const [text, setText] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !name.trim()) return;
    const c: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    save([c, ...load()]);
    setText("");
  }

  function remove(id: string) {
    save(load().filter((c) => c.id !== id));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card overflow-hidden border border-white/10 bg-slate-900/60 backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-5 py-3.5">
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <span>💬</span> {t("آخر التعليقات والتجارب")}
          </span>
          <span className="text-xs text-slate-400">{t("الأحدث أولاً")}</span>
        </div>

        <form onSubmit={submit} className="space-y-3.5 border-b border-white/10 px-5 py-5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسمك الكريم"
            className="input"
            maxLength={40}
            required
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="شارك تجربتك ورأيك في أداء واستقرار بوت Hatem X..."
            className="input min-h-24 resize-y"
            maxLength={500}
            required
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400 font-medium">{comments.length} {t("تعليق")}</p>
            <button type="submit" className="btn-primary text-sm py-2 px-5">
              {t("انشر تعليقك ✨")}
            </button>
          </div>
        </form>

        <ul className="divide-y divide-white/5">
          {comments.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-slate-400">
              {t("لا توجد تعليقات بعد — كن أول من يشاركنا رأيه وتجربته ✨")}
            </li>
          ) : (
            comments.map((c) => (
              <li key={c.id} className="flex items-start gap-3.5 px-5 py-4 hover:bg-white/[0.02] transition">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-sm font-bold text-emerald-400">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">{c.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{c.text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="text-xs text-slate-500 hover:text-red-400 transition"
                  aria-label="Delete"
                >
                  ✕
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}