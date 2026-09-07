type Bucket = { hits: number[]; blockedUntil?: number };

const globalStore = new Map<string, Bucket>();

export function rateLimit(opts: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();
  const bucket = globalStore.get(opts.key) ?? { hits: [] };

  bucket.hits = bucket.hits.filter((t) => now - t < opts.windowMs);

  if (bucket.blockedUntil && now < bucket.blockedUntil) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((bucket.blockedUntil - now) / 1000),
      remaining: 0,
    };
  }

  if (bucket.hits.length >= opts.limit) {
    bucket.blockedUntil = now + opts.windowMs;
    globalStore.set(opts.key, bucket);
    return { ok: false, retryAfterSec: Math.ceil(opts.windowMs / 1000), remaining: 0 };
  }

  bucket.hits.push(now);
  globalStore.set(opts.key, bucket);
  return { ok: true, retryAfterSec: 0, remaining: opts.limit - bucket.hits.length };
}

export function clientIp(req: {
  headers: { get(name: string): string | null };
}): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

if (typeof setInterval === "function") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of globalStore) {
      b.hits = b.hits.filter((t) => now - t < 60 * 60 * 1000);
      if (b.hits.length === 0 && !b.blockedUntil) globalStore.delete(k);
    }
  }, 10 * 60 * 1000) as unknown as { unref?: () => void };
  timer.unref?.();
}