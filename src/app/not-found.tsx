"use client";

import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  const { theme } = useColonyTheme();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-6"
      style={{ backgroundColor: theme.bg }}
    >
      <p
        className="text-[72px] font-bold tracking-[-0.04em] leading-none mb-2"
        style={{
          fontFamily: "'Manrope', var(--font-inter), sans-serif",
          color: withAlpha(theme.text, 0.08),
        }}
      >
        404
      </p>
      <h1
        className="text-[22px] font-semibold mb-2"
        style={{ fontFamily: "'Spectral', serif", color: theme.text }}
      >
        Page not found
      </h1>
      <p
        className="text-[13px] text-center max-w-md mb-8"
        style={{ color: withAlpha(theme.text, 0.45) }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-medium transition-all duration-150 hover:opacity-90"
          style={{
            backgroundColor: theme.accent,
            color: theme.bg,
          }}
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}
