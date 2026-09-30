import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redisEnabled = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = redisEnabled
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    })
  : null;

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export const rateLimiter = redisEnabled
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
      prefix: "@oshunt/ratelimit",
    })
  : null;

export async function checkRateLimit(identifier: string, options?: { limit?: number; windowMs?: number }) {
  const limit = options?.limit ?? 5;
  const windowMs = options?.windowMs ?? 60_000;

  if (rateLimiter) {
    try {
      const result = await rateLimiter.limit(identifier);
      return {
        success: result.success,
        limit,
        remaining: result.remaining,
        reset: result.reset,
        retryAfter: 0,
      };
    } catch {
      // fall back to in-memory limiting if Redis is unavailable
    }
  }

  const now = Date.now();
  const bucket = memoryBuckets.get(identifier);

  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs, retryAfter: 0 };
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  return {
    success: bucket.count <= limit,
    limit,
    remaining,
    reset: bucket.resetAt,
    retryAfter: Math.max(0, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}