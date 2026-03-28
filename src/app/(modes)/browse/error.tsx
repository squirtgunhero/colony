"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function BrowseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { theme } = useColonyTheme();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div
        className="flex items-center justify-center h-12 w-12 rounded-full mb-4"
        style={{
          backgroundColor: withAlpha("#ff453a", 0.08),
        }}
      >
        <AlertTriangle
          className="h-5 w-5"
          style={{ color: "#ff453a" }}
          strokeWidth={1.5}
        />
      </div>
      <h2
        className="text-[18px] font-semibold mb-2 tracking-[-0.01em]"
        style={{ color: theme.text }}
      >
        Something went wrong
      </h2>
      <p
        className="text-[13px] text-center max-w-md mb-6 leading-relaxed"
        style={{ color: withAlpha(theme.text, 0.45) }}
      >
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-medium transition-all duration-200 active:scale-[0.97]"
        style={{
          backgroundColor: withAlpha(theme.text, 0.06),
          color: withAlpha(theme.text, 0.6),
        }}
      >
        <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
        Try again
      </button>
    </div>
  );
}
