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
    // تجاهل خطأ الحفظ
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
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 bg-elevated/40 px-5 py-3">
          <span className="text-xs font-bold text-accent">💬 {t("آخر التعليقات")}</span>
          <span className="text-xs text-muted">{t("الأحدث أولاً")}</span>
        </div>

        <form onSubmit={submit} className="space-y-3 border-b border-border/50 px-5 py-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسمك"
            className="input"
            maxLength={40}
            required
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="شارك تجربتك مع المنصة..."
            className="input min-h-20 resize-y"
            maxLength={500}
            required
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted">{comments.length} {t("تعليق")}</p>
            <button type="submit" className="btn-primary text-sm">
              {t("انشر تعليقك")}
            </button>
          </div>
        </form>

        <ul className="divide-y divide-border/40">
          {comments.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-muted">
              {t("لا توجد تعليقات بعد — كن أول من يشاركنا رأيه ✨")}
            </li>
          ) : (
            comments.map((c) => (
              <li key={c.id} className="flex items-start gap-3 px-5 py-4">
                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-accent/15 text-sm font-bold text-accent">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-fg">{c.name}</span>
                    <span className="text-[11px] text-muted">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{c.text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="text-xs text-muted transition hover:text-blood"
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