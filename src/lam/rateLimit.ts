// ============================================================================
// LAM Rate Limiter - Protect against runaway API costs
// ============================================================================

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
  
  // Cost estimation (GPT-4o pricing approximate)
  ESTIMATED_COST_PER_REQUEST: 0.01, // ~$0.01 per request average
  MAX_DAILY_SPEND: 5.00, // $5/day max
  MAX_MONTHLY_SPEND: 50.00, // $50/month max
};

// In-memory rate tracking (resets on server restart)
// For production, use Redis or database
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const globalLimits = { 
  hourly: { count: 0, resetAt: Date.now() + 3600000 },
  daily: { count: 0, resetAt: Date.now() + 86400000 },
};

// Daily spend tracking
let dailySpend = { amount: 0, resetAt: Date.now() + 86400000 };
let monthlySpend = { amount: 0, resetAt: getEndOfMonth() };

function getEndOfMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
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
  
  // Reset global limits if needed
  if (now > globalLimits.hourly.resetAt) {
    globalLimits.hourly = { count: 0, resetAt: now + 3600000 };
  }
  if (now > globalLimits.daily.resetAt) {
    globalLimits.daily = { count: 0, resetAt: now + 86400000 };
  }
  
  // Reset spend tracking if needed
  if (now > dailySpend.resetAt) {
    dailySpend = { amount: 0, resetAt: now + 86400000 };
  }
  if (now > monthlySpend.resetAt) {
    monthlySpend = { amount: 0, resetAt: getEndOfMonth() };
  }
  
  // Get or create user rate limits
  const minuteKey = `${userId}:minute`;
  const hourKey = `${userId}:hour`;
  const dayKey = `${userId}:day`;
  
  const userMinute = rateLimits.get(minuteKey) || { count: 0, resetAt: now + 60000 };
  const userHour = rateLimits.get(hourKey) || { count: 0, resetAt: now + 3600000 };
  const userDay = rateLimits.get(dayKey) || { count: 0, resetAt: now + 86400000 };
  
  // Reset if expired
  if (now > userMinute.resetAt) {
    userMinute.count = 0;
    userMinute.resetAt = now + 60000;
  }
  if (now > userHour.resetAt) {
    userHour.count = 0;
    userHour.resetAt = now + 3600000;
  }
  if (now > userDay.resetAt) {
    userDay.count = 0;
    userDay.resetAt = now + 86400000;
  }
  
  const usage = {
    userMinute: userMinute.count,
    userHour: userHour.count,
    userDay: userDay.count,
    estimatedDailySpend: dailySpend.amount,
    estimatedMonthlySpend: monthlySpend.amount,
  };
  
  // Check spending limits first (most important)
  if (dailySpend.amount >= LAM_LIMITS.MAX_DAILY_SPEND) {
    return {
      allowed: false,
      reason: `Daily spending limit reached ($${LAM_LIMITS.MAX_DAILY_SPEND}). Resets in ${Math.ceil((dailySpend.resetAt - now) / 3600000)} hours.`,
      retryAfter: Math.ceil((dailySpend.resetAt - now) / 1000),
      usage,
    };
  }
  
  if (monthlySpend.amount >= LAM_LIMITS.MAX_MONTHLY_SPEND) {
    return {
      allowed: false,
      reason: `Monthly spending limit reached ($${LAM_LIMITS.MAX_MONTHLY_SPEND}). Resets next month.`,
      retryAfter: Math.ceil((monthlySpend.resetAt - now) / 1000),
      usage,
    };
  }
  
  // Check rate limits
  if (userMinute.count >= LAM_LIMITS.REQUESTS_PER_MINUTE) {
    return {
      allowed: false,
      reason: "Too many requests. Please wait a moment.",
      retryAfter: Math.ceil((userMinute.resetAt - now) / 1000),
      usage,
    };
  }
  
  if (userHour.count >= LAM_LIMITS.REQUESTS_PER_HOUR) {
    return {
      allowed: false,
      reason: `Hourly limit reached (${LAM_LIMITS.REQUESTS_PER_HOUR} requests). Try again later.`,
      retryAfter: Math.ceil((userHour.resetAt - now) / 1000),
      usage,
    };
  }
  
  if (userDay.count >= LAM_LIMITS.REQUESTS_PER_DAY) {
    return {
      allowed: false,
      reason: `Daily limit reached (${LAM_LIMITS.REQUESTS_PER_DAY} requests). Resets tomorrow.`,
      retryAfter: Math.ceil((userDay.resetAt - now) / 1000),
      usage,
    };
  }
  
  // Check global limits
  if (globalLimits.hourly.count >= LAM_LIMITS.GLOBAL_REQUESTS_PER_HOUR) {
    return {
      allowed: false,
      reason: "System is busy. Please try again in a few minutes.",
      retryAfter: Math.ceil((globalLimits.hourly.resetAt - now) / 1000),
      usage,
    };
  }
  
  return { allowed: true, usage };
}

// ============================================================================
// Record Usage (call after successful API request)
// ============================================================================

export function recordUsage(userId: string, estimatedCost: number = LAM_LIMITS.ESTIMATED_COST_PER_REQUEST): void {
  const now = Date.now();
  
  // Update user limits
  const minuteKey = `${userId}:minute`;
  const hourKey = `${userId}:hour`;
  const dayKey = `${userId}:day`;
  
  const userMinute = rateLimits.get(minuteKey) || { count: 0, resetAt: now + 60000 };
  const userHour = rateLimits.get(hourKey) || { count: 0, resetAt: now + 3600000 };
  const userDay = rateLimits.get(dayKey) || { count: 0, resetAt: now + 86400000 };
  
  userMinute.count++;
  userHour.count++;
  userDay.count++;
  
  rateLimits.set(minuteKey, userMinute);
  rateLimits.set(hourKey, userHour);
  rateLimits.set(dayKey, userDay);
  
  // Update global limits
  globalLimits.hourly.count++;
  globalLimits.daily.count++;
  
  // Update spend tracking
  dailySpend.amount += estimatedCost;
  monthlySpend.amount += estimatedCost;
}

// ============================================================================
// Get Current Usage Stats
// ============================================================================

export function getUsageStats(): {
  global: { hourly: number; daily: number };
  spend: { daily: number; monthly: number; limits: { daily: number; monthly: number } };
} {
  return {
    global: {
      hourly: globalLimits.hourly.count,
      daily: globalLimits.daily.count,
    },
    spend: {
      daily: dailySpend.amount,
      monthly: monthlySpend.amount,
      limits: {
        daily: LAM_LIMITS.MAX_DAILY_SPEND,
        monthly: LAM_LIMITS.MAX_MONTHLY_SPEND,
      },
    },
  };
}
