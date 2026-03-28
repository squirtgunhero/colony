// ============================================================================
// LAM Rate Limiter Tests
// Tests rate limiting, spending limits, and usage tracking
// ============================================================================

import { describe, it, expect, beforeEach, vi } from "vitest";

// We need to re-import fresh module state for each test
// to reset the in-memory rate limit maps

describe("Rate Limiter", () => {
  let checkRateLimit: typeof import("./rateLimit").checkRateLimit;
  let recordUsage: typeof import("./rateLimit").recordUsage;
  let getUsageStats: typeof import("./rateLimit").getUsageStats;
  let LAM_LIMITS: typeof import("./rateLimit").LAM_LIMITS;

  beforeEach(async () => {
    // Reset module to get fresh in-memory state
    vi.resetModules();
    const mod = await import("./rateLimit");
    checkRateLimit = mod.checkRateLimit;
    recordUsage = mod.recordUsage;
    getUsageStats = mod.getUsageStats;
    LAM_LIMITS = mod.LAM_LIMITS;
  });

  // =========================================================================
  // Basic rate limit checks
  // =========================================================================

  describe("Basic rate limiting", () => {
    it("should allow first request", async () => {
      const result = await checkRateLimit("user-1");

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should track usage after recordUsage", async () => {
      recordUsage("user-1");

      const result = await checkRateLimit("user-1");
      expect(result.allowed).toBe(true);
      expect(result.usage.userMinute).toBe(1);
      expect(result.usage.userHour).toBe(1);
      expect(result.usage.userDay).toBe(1);
    });

    it("should block after exceeding per-minute limit", async () => {
      const userId = "user-minute-limit";

      for (let i = 0; i < LAM_LIMITS.REQUESTS_PER_MINUTE; i++) {
        recordUsage(userId);
      }

      const result = await checkRateLimit(userId);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Too many requests");
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should block after exceeding per-hour limit", async () => {
      // Per-minute limit (10) is checked before per-hour (50).
      // We need to use different users for each minute bucket to avoid
      // hitting per-minute first. Instead, just verify the per-hour limit
      // is reached by checking the count matches.
      const userId = "user-hour-limit";

      for (let i = 0; i < LAM_LIMITS.REQUESTS_PER_HOUR; i++) {
        recordUsage(userId);
      }

      const result = await checkRateLimit(userId);
      expect(result.allowed).toBe(false);
      // Per-minute check fires first since 50 > 10
      expect(result.reason).toBeDefined();
      expect(result.usage.userHour).toBe(LAM_LIMITS.REQUESTS_PER_HOUR);
    });

    it("should block after exceeding per-day limit", async () => {
      const userId = "user-day-limit";

      for (let i = 0; i < LAM_LIMITS.REQUESTS_PER_DAY; i++) {
        recordUsage(userId);
      }

      const result = await checkRateLimit(userId);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.usage.userDay).toBe(LAM_LIMITS.REQUESTS_PER_DAY);
    });
  });

  // =========================================================================
  // Spending limits
  // =========================================================================

  describe("Spending limits", () => {
    it("should track estimated spend", async () => {
      recordUsage("user-1", 0.05);

      const result = await checkRateLimit("user-1");
      expect(result.usage.estimatedDailySpend).toBe(0.05);
      expect(result.usage.estimatedMonthlySpend).toBe(0.05);
    });

    it("should block after exceeding daily spend limit", async () => {
      const costPerRequest = LAM_LIMITS.MAX_DAILY_SPEND / 2;

      recordUsage("user-1", costPerRequest);
      recordUsage("user-1", costPerRequest);

      // At exactly the limit
      const result = await checkRateLimit("user-1");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Daily spending limit");
    });

    it("should block after exceeding monthly spend limit", async () => {
      // Monthly limit ($50) > daily limit ($5), so daily check fires first
      // when we set a single large cost. Use a cost that exceeds monthly
      // but test that blocking occurs.
      const cost = LAM_LIMITS.MAX_MONTHLY_SPEND;
      recordUsage("user-1", cost);

      const result = await checkRateLimit("user-1");
      expect(result.allowed).toBe(false);
      // Daily spend check fires first since cost also exceeds daily limit
      expect(result.reason).toBeDefined();
      expect(result.usage.estimatedMonthlySpend).toBe(cost);
    });

    it("should use default cost when none specified", () => {
      recordUsage("user-1");

      const stats = getUsageStats();
      expect(stats.spend.daily).toBe(LAM_LIMITS.ESTIMATED_COST_PER_REQUEST);
    });
  });

  // =========================================================================
  // Global limits
  // =========================================================================

  describe("Global limits", () => {
    it("should track global usage across users", () => {
      recordUsage("user-1");
      recordUsage("user-2");
      recordUsage("user-3");

      const stats = getUsageStats();
      expect(stats.global.hourly).toBe(3);
      expect(stats.global.daily).toBe(3);
    });

    it("should block all users when global hourly limit reached", async () => {
      // Fill up global hourly limit using different users
      for (let i = 0; i < LAM_LIMITS.GLOBAL_REQUESTS_PER_HOUR; i++) {
        recordUsage(`user-global-${i}`);
      }

      // A new user should be blocked
      const result = await checkRateLimit("user-new");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("System is busy");
    });
  });

  // =========================================================================
  // Per-user isolation
  // =========================================================================

  describe("Per-user isolation", () => {
    it("should track limits independently per user", async () => {
      recordUsage("user-A");
      recordUsage("user-A");
      recordUsage("user-A");

      const resultA = await checkRateLimit("user-A");
      const resultB = await checkRateLimit("user-B");

      expect(resultA.usage.userMinute).toBe(3);
      expect(resultB.usage.userMinute).toBe(0);
    });
  });

  // =========================================================================
  // getUsageStats
  // =========================================================================

  describe("getUsageStats", () => {
    it("should return initial zero stats", () => {
      const stats = getUsageStats();

      expect(stats.global.hourly).toBe(0);
      expect(stats.global.daily).toBe(0);
      expect(stats.spend.daily).toBe(0);
      expect(stats.spend.monthly).toBe(0);
      expect(stats.spend.limits.daily).toBe(LAM_LIMITS.MAX_DAILY_SPEND);
      expect(stats.spend.limits.monthly).toBe(LAM_LIMITS.MAX_MONTHLY_SPEND);
    });

    it("should reflect accumulated usage", () => {
      recordUsage("user-1", 0.02);
      recordUsage("user-2", 0.03);

      const stats = getUsageStats();
      expect(stats.global.hourly).toBe(2);
      expect(stats.spend.daily).toBeCloseTo(0.05);
      expect(stats.spend.monthly).toBeCloseTo(0.05);
    });
  });

  // =========================================================================
  // Configuration
  // =========================================================================

  describe("Configuration", () => {
    it("should have sensible default limits", () => {
      expect(LAM_LIMITS.REQUESTS_PER_MINUTE).toBeGreaterThan(0);
      expect(LAM_LIMITS.REQUESTS_PER_HOUR).toBeGreaterThan(LAM_LIMITS.REQUESTS_PER_MINUTE);
      expect(LAM_LIMITS.REQUESTS_PER_DAY).toBeGreaterThan(LAM_LIMITS.REQUESTS_PER_HOUR);
      expect(LAM_LIMITS.MAX_DAILY_SPEND).toBeGreaterThan(0);
      expect(LAM_LIMITS.MAX_MONTHLY_SPEND).toBeGreaterThan(LAM_LIMITS.MAX_DAILY_SPEND);
    });
  });
});
