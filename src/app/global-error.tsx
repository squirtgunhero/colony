"use client";

// =============================================================================
// Global Error Boundary
// Catches unhandled errors in the root layout and reports to Sentry
// =============================================================================

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md px-6">
          <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-neutral-400 text-sm mb-6">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-sm transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
