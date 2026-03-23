// =============================================================================
// Sentry Client Configuration
// Initializes Sentry for browser-side error tracking
// =============================================================================

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring: capture 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay: capture 1% of sessions, 100% of error sessions
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Environment tagging
  environment: process.env.NODE_ENV || "development",

  // Only send errors in production (or when DSN is explicitly set)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Filter out noisy browser errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    "ResizeObserver loop",
    // Network errors users can't control
    "NetworkError",
    "Failed to fetch",
    "Load failed",
    "ChunkLoadError",
    // Auth redirects (expected)
    "NEXT_REDIRECT",
  ],

  // Before sending, attach Colony-specific context
  beforeSend(event) {
    // Strip any PII from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((bc) => {
        if (bc.category === "fetch" && bc.data?.url) {
          // Redact auth tokens from URLs
          bc.data.url = bc.data.url.replace(
            /token=[^&]+/g,
            "token=[REDACTED]"
          );
        }
        return bc;
      });
    }
    return event;
  },
});
