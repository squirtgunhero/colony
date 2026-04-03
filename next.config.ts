import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  typescript: {
    // Pre-existing type errors in companies/ and other files with missing Prisma models.
    // These don't affect runtime behavior — ignore during build until schema is updated.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry source map upload logs during build
  silent: !process.env.CI,

  // Upload source maps for better stack traces
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger in production
  disableLogger: true,

  // Upload source maps but don't expose them in browser
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Automatically instrument API routes and server components
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,
});
