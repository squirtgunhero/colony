import type { NextRequest } from "next/server";

/**
 * Verify that mutation requests originate from the same site.
 * Checks the Origin and Referer headers against the app URL.
 * Returns true if the request is safe, false if it looks like CSRF.
 */
export function verifyCsrfOrigin(request: NextRequest): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return true; // Skip check if app URL not configured

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // If neither header is present, block the request (likely automated)
  if (!origin && !referer) {
    return false;
  }

  // Check origin header
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const appUrlObj = new URL(appUrl);
      return originUrl.host === appUrlObj.host;
    } catch {
      return false;
    }
  }

  // Fall back to referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const appUrlObj = new URL(appUrl);
      return refererUrl.host === appUrlObj.host;
    } catch {
      return false;
    }
  }

  return false;
}
