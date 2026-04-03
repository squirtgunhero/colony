import { Redis } from "@upstash/redis";

/**
 * Singleton Upstash Redis client.
 * Returns null if UPSTASH_REDIS_REST_URL is not configured (graceful fallback).
 */

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}
