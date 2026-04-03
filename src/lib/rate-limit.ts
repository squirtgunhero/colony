/**
 * Rate limiter with Upstash Redis (production) and in-memory fallback (dev).
 *
 * Uses @upstash/ratelimit when UPSTASH_REDIS_REST_URL is configured.
 * Falls back to an in-memory sliding window when Redis is unavailable.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

// ─── Redis-backed rate limiters (cached singletons) ────────────────────────

const redisLimiters = new Map<string, Ratelimit>();

function getRedisLimiter(
  prefix: string,
  limit: number,
  windowSeconds: number
): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const key = `${prefix}:${limit}:${windowSeconds}`;
  let limiter = redisLimiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `rl:${prefix}`,
      analytics: true,
    });
    redisLimiters.set(key, limiter);
  }
  return limiter;
}

// ─── In-memory fallback ────────────────────────────────────────────────────

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
      if (now > entry.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowSeconds * 1000;
    memoryStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key.
 * Uses Redis when available, falls back to in-memory.
 */
export async function rateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  // Try Redis first
  const redisLimiter = getRedisLimiter("api", options.limit, options.windowSeconds);
  if (redisLimiter) {
    try {
      const result = await redisLimiter.limit(key);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    } catch {
      // Redis failed — fall through to in-memory
    }
  }

  // In-memory fallback
  return memoryRateLimit(key, options.limit, options.windowSeconds);
}

/**
 * Synchronous rate limit check (in-memory only).
 * Use when you can't await (e.g. middleware edge runtime).
 */
export function rateLimitSync(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  return memoryRateLimit(key, options.limit, options.windowSeconds);
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
