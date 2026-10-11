/**
 * Fixed-window rate limiter held in memory.
 *
 * Limits: this is per server instance. On serverless or multi-instance hosting each
 * instance counts separately, so treat it as a speed bump, not a guarantee. For a hard
 * limit, back it with Redis/Upstash and keep this same function signature.
 */

type Hit = { count: number; resetAt: number };
const hits = new Map<string, Hit>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();

  if (hits.size > 5_000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }

  const current = hits.get(key);
  if (!current || current.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterS: 0 };
  }

  current.count += 1;
  const ok = current.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - current.count),
    retryAfterS: ok ? 0 : Math.ceil((current.resetAt - now) / 1000),
  };
}

export function clearRateLimit(key: string) {
  hits.delete(key);
}
