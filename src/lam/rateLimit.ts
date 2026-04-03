// ============================================================================
// LAM Rate Limiter - Protect against runaway API costs
// Uses Upstash Redis when available, in-memory fallback for dev.
// ============================================================================

import { getRedis } from "@/lib/redis";

// ============================================================================
// Configuration - Adjust these limits as needed
// ============================================================================

export const LAM_LIMITS = {
  // Per-user limits
  REQUESTS_PER_MINUTE: 10,
  REQUESTS_PER_HOUR: 50,
  REQUESTS_PER_DAY: 200,

  // Global limits (across all users)
  GLOBAL_REQUESTS_PER_HOUR: 500,
  GLOBAL_REQUESTS_PER_DAY: 2000,

  // Cost estimation (Claude pricing approximate)
  ESTIMATED_COST_PER_REQUEST: 0.01, // ~$0.01 per request average
  MAX_DAILY_SPEND: 5.0, // $5/day max
  MAX_MONTHLY_SPEND: 50.0, // $50/month max
};

// ─── In-memory fallback store ──────────────────────────────────────────────

const memStore = new Map<string, { count: number; resetAt: number }>();
const globalLimits = {
  hourly: { count: 0, resetAt: Date.now() + 3600000 },
  daily: { count: 0, resetAt: Date.now() + 86400000 },
};
let dailySpend = { amount: 0, resetAt: Date.now() + 86400000 };
let monthlySpend = { amount: 0, resetAt: getEndOfMonth() };

function getEndOfMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
}

function getOrResetMem(key: string, windowMs: number): { count: number; resetAt: number } {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    const fresh = { count: 0, resetAt: now + windowMs };
    memStore.set(key, fresh);
    return fresh;
  }
  return entry;
}

// ─── Redis helpers ─────────────────────────────────────────────────────────

async function redisIncr(key: string, windowSeconds: number): Promise<number> {
  const redis = getRedis();
  if (!redis) return -1; // Signal to use in-memory

  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, windowSeconds);
  const results = await pipeline.exec();
  return (results[0] as number) ?? 0;
}

async function redisGet(key: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return -1;
  const val = await redis.get<number>(key);
  return val ?? 0;
}

async function redisIncrByFloat(key: string, amount: number, windowSeconds: number): Promise<number> {
  const redis = getRedis();
  if (!redis) return -1;
  const pipeline = redis.pipeline();
  pipeline.incrbyfloat(key, amount);
  pipeline.expire(key, windowSeconds);
  const results = await pipeline.exec();
  return (results[0] as number) ?? 0;
}

// ============================================================================
// Rate Limit Checker
// ============================================================================

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number; // seconds until retry
  usage: {
    userMinute: number;
    userHour: number;
    userDay: number;
    estimatedDailySpend: number;
    estimatedMonthlySpend: number;
  };
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const now = Date.now();
  const redis = getRedis();

  // ── Spend checks ─────────────────────────────────────────────────────────
  let currentDailySpend: number;
  let currentMonthlySpend: number;

  if (redis) {
    currentDailySpend = await redisGet(`lam:spend:daily`);
    currentMonthlySpend = await redisGet(`lam:spend:monthly`);
  } else {
    if (now > dailySpend.resetAt) dailySpend = { amount: 0, resetAt: now + 86400000 };
    if (now > monthlySpend.resetAt) monthlySpend = { amount: 0, resetAt: getEndOfMonth() };
    currentDailySpend = dailySpend.amount;
    currentMonthlySpend = monthlySpend.amount;
  }

  // ── Per-user counters ────────────────────────────────────────────────────
  let userMinute: number;
  let userHour: number;
  let userDay: number;

  if (redis) {
    [userMinute, userHour, userDay] = await Promise.all([
      redisGet(`lam:user:${userId}:min`),
      redisGet(`lam:user:${userId}:hr`),
      redisGet(`lam:user:${userId}:day`),
    ]);
  } else {
    userMinute = getOrResetMem(`${userId}:minute`, 60000).count;
    userHour = getOrResetMem(`${userId}:hour`, 3600000).count;
    userDay = getOrResetMem(`${userId}:day`, 86400000).count;
  }

  // ── Global counters ──────────────────────────────────────────────────────
  let globalHourly: number;
  let globalDaily: number;

  if (redis) {
    [globalHourly, globalDaily] = await Promise.all([
      redisGet(`lam:global:hr`),
      redisGet(`lam:global:day`),
    ]);
  } else {
    if (now > globalLimits.hourly.resetAt) globalLimits.hourly = { count: 0, resetAt: now + 3600000 };
    if (now > globalLimits.daily.resetAt) globalLimits.daily = { count: 0, resetAt: now + 86400000 };
    globalHourly = globalLimits.hourly.count;
    globalDaily = globalLimits.daily.count;
  }

  const usage = {
    userMinute,
    userHour,
    userDay,
    estimatedDailySpend: currentDailySpend,
    estimatedMonthlySpend: currentMonthlySpend,
  };

  // ── Checks ───────────────────────────────────────────────────────────────
  if (currentDailySpend >= LAM_LIMITS.MAX_DAILY_SPEND) {
    return { allowed: false, reason: `Daily spending limit reached ($${LAM_LIMITS.MAX_DAILY_SPEND}).`, retryAfter: 3600, usage };
  }
  if (currentMonthlySpend >= LAM_LIMITS.MAX_MONTHLY_SPEND) {
    return { allowed: false, reason: `Monthly spending limit reached ($${LAM_LIMITS.MAX_MONTHLY_SPEND}).`, retryAfter: 86400, usage };
  }
  if (userMinute >= LAM_LIMITS.REQUESTS_PER_MINUTE) {
    return { allowed: false, reason: "Too many requests. Please wait a moment.", retryAfter: 60, usage };
  }
  if (userHour >= LAM_LIMITS.REQUESTS_PER_HOUR) {
    return { allowed: false, reason: `Hourly limit reached (${LAM_LIMITS.REQUESTS_PER_HOUR} requests).`, retryAfter: 3600, usage };
  }
  if (userDay >= LAM_LIMITS.REQUESTS_PER_DAY) {
    return { allowed: false, reason: `Daily limit reached (${LAM_LIMITS.REQUESTS_PER_DAY} requests).`, retryAfter: 86400, usage };
  }
  if (globalHourly >= LAM_LIMITS.GLOBAL_REQUESTS_PER_HOUR) {
    return { allowed: false, reason: "System is busy. Please try again in a few minutes.", retryAfter: 300, usage };
  }
  if (globalDaily >= LAM_LIMITS.GLOBAL_REQUESTS_PER_DAY) {
    return { allowed: false, reason: "System daily limit reached. Try again tomorrow.", retryAfter: 86400, usage };
  }

  return { allowed: true, usage };
}

// ============================================================================
// Record Usage (call after successful API request)
// ============================================================================

export async function recordUsage(
  userId: string,
  estimatedCost: number = LAM_LIMITS.ESTIMATED_COST_PER_REQUEST
): Promise<void> {
  const redis = getRedis();

  if (redis) {
    await Promise.all([
      redisIncr(`lam:user:${userId}:min`, 60),
      redisIncr(`lam:user:${userId}:hr`, 3600),
      redisIncr(`lam:user:${userId}:day`, 86400),
      redisIncr(`lam:global:hr`, 3600),
      redisIncr(`lam:global:day`, 86400),
      redisIncrByFloat(`lam:spend:daily`, estimatedCost, 86400),
      redisIncrByFloat(`lam:spend:monthly`, estimatedCost, 30 * 86400),
    ]);
  } else {
    // In-memory fallback
    const now = Date.now();
    getOrResetMem(`${userId}:minute`, 60000).count++;
    getOrResetMem(`${userId}:hour`, 3600000).count++;
    getOrResetMem(`${userId}:day`, 86400000).count++;
    if (now > globalLimits.hourly.resetAt) globalLimits.hourly = { count: 0, resetAt: now + 3600000 };
    if (now > globalLimits.daily.resetAt) globalLimits.daily = { count: 0, resetAt: now + 86400000 };
    globalLimits.hourly.count++;
    globalLimits.daily.count++;
    if (now > dailySpend.resetAt) dailySpend = { amount: 0, resetAt: now + 86400000 };
    if (now > monthlySpend.resetAt) monthlySpend = { amount: 0, resetAt: getEndOfMonth() };
    dailySpend.amount += estimatedCost;
    monthlySpend.amount += estimatedCost;
  }
}

// ============================================================================
// Get Current Usage Stats
// ============================================================================

export function getUsageStats(): {
  global: { hourly: number; daily: number };
  spend: { daily: number; monthly: number; limits: { daily: number; monthly: number } };
} {
  return {
    global: { hourly: globalLimits.hourly.count, daily: globalLimits.daily.count },
    spend: { daily: dailySpend.amount, monthly: monthlySpend.amount, limits: { daily: LAM_LIMITS.MAX_DAILY_SPEND, monthly: LAM_LIMITS.MAX_MONTHLY_SPEND } },
  };
}

export async function getUsageStatsAsync(): Promise<{
  global: { hourly: number; daily: number };
  spend: { daily: number; monthly: number; limits: { daily: number; monthly: number } };
}> {
  const redis = getRedis();

  if (redis) {
    const [hourly, daily, dSpend, mSpend] = await Promise.all([
      redisGet(`lam:global:hr`),
      redisGet(`lam:global:day`),
      redisGet(`lam:spend:daily`),
      redisGet(`lam:spend:monthly`),
    ]);
    return {
      global: { hourly, daily },
      spend: { daily: dSpend, monthly: mSpend, limits: { daily: LAM_LIMITS.MAX_DAILY_SPEND, monthly: LAM_LIMITS.MAX_MONTHLY_SPEND } },
    };
  }

  return getUsageStats();
}
