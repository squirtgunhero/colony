// =============================================================================
// Sentry Server Configuration
// Initializes Sentry for Node.js server-side error tracking
// =============================================================================

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Environment tagging
  environment: process.env.NODE_ENV || "development",

  // Only send errors in production (or when DSN is explicitly set)
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Server-side specific integrations
  integrations: [
    Sentry.prismaIntegration(),
  ],

  // Before sending, scrub sensitive data
  beforeSend(event) {
    // Remove email bodies, SMS content from error context
    if (event.extra) {
      for (const key of Object.keys(event.extra)) {
        if (
          key.includes("body") ||
          key.includes("content") ||
          key.includes("password") ||
          key.includes("token")
        ) {
          event.extra[key] = "[REDACTED]";
        }
      }
    }
    return event;
  },
});
