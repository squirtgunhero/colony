"use client";

import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { Home } from "lucide-react";

export default function NotFound() {
  const { theme } = useColonyTheme();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-6"
      style={{ backgroundColor: theme.bg }}
    >
      <p
        className="text-[80px] font-bold tracking-[-0.04em] leading-none mb-3"
        style={{
          fontFamily: "'Manrope', var(--font-inter), sans-serif",
          color: withAlpha(theme.text, 0.06),
        }}
      >
        404
      </p>
      <h1
        className="text-[22px] font-semibold mb-2 tracking-[-0.02em]"
        style={{
          fontFamily: "'Manrope', var(--font-inter), sans-serif",
          color: theme.text,
        }}
      >
        Page not found
      </h1>
      <p
        className="text-[14px] text-center max-w-md mb-8 leading-relaxed"
        style={{ color: withAlpha(theme.text, 0.4) }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/chat"
        className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-[13px] font-medium transition-all duration-150 active:scale-[0.97]"
        style={{
          backgroundColor: theme.accent,
          color: theme.bg,
        }}
      >
        <Home className="h-4 w-4" strokeWidth={1.5} />
        Go Home
      </Link>
    </div>
  );
}
