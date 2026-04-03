import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Verify cron job authentication.
 *
 * Supports two methods:
 * 1. HMAC signature: X-Cron-Signature header with HMAC-SHA256 of timestamp
 * 2. Bearer token: Authorization: Bearer <CRON_SECRET> (legacy fallback)
 *
 * Always uses timing-safe comparison to prevent timing attacks.
 */
export function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Method 1: HMAC signature verification (preferred)
  const signature = request.headers.get("x-cron-signature");
  const timestamp = request.headers.get("x-cron-timestamp");

  if (signature && timestamp) {
    // Reject if timestamp is older than 5 minutes (prevents replay attacks)
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
      return false;
    }

    const expectedSignature = createHmac("sha256", secret)
      .update(timestamp)
      .digest("hex");

    try {
      return timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      );
    } catch {
      return false;
    }
  }

  // Method 2: Bearer token (legacy fallback)
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const token = authHeader.replace("Bearer ", "");
  try {
    return timingSafeEqual(
      Buffer.from(token),
      Buffer.from(secret)
    );
  } catch {
    return false;
  }
}
