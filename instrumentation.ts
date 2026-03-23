// =============================================================================
// Next.js Instrumentation Hook
// Initializes Sentry on the server when Next.js starts
// =============================================================================

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export async function onRequestError(
  ...args: Parameters<
    NonNullable<
      typeof import("@sentry/nextjs").captureRequestError extends (
        ...a: infer P
      ) => unknown
        ? (...a: P) => void
        : never
    >
  >
) {
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(...args);
}
