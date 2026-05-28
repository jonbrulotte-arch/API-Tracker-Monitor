const WINDOW_MS = 60_000;

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>();

export function checkRateLimit(key: string, limit: number, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Prune stale entries every 10 minutes to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.resetAt < now) store.delete(k);
  }
}, 10 * 60_000);
