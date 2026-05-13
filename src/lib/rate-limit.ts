/**
 * In-memory IP-based rate limiter.
 *
 * Limits: MAX_ATTEMPTS per WINDOW_MS per IP.
 * For production with multiple serverless instances, replace the Map
 * with an Upstash Redis client — the interface stays the same.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

// Cleanup stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000);

type RateLimitResult =
  | { ok: true }
  | { ok: false; resetAt: number; retryAfterSecs: number };

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const existing = store.get(ip);

  if (!existing || existing.resetAt <= now) {
    // First attempt or window expired — reset counter
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  existing.count++;

  if (existing.count > MAX_ATTEMPTS) {
    const retryAfterSecs = Math.ceil((existing.resetAt - now) / 1000);
    return { ok: false, resetAt: existing.resetAt, retryAfterSecs };
  }

  return { ok: true };
}
