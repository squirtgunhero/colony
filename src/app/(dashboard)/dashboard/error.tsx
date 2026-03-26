"use client";

import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
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
        className="flex items-center justify-center h-14 w-14 rounded-2xl mb-5"
        style={{
          backgroundColor: withAlpha("#ef4444", 0.1),
          border: `1px solid ${withAlpha("#ef4444", 0.15)}`,
        }}
      >
        <AlertTriangle className="h-6 w-6" style={{ color: "#f87171" }} />
      </div>
      <h2
        className="text-[18px] font-semibold mb-2"
        style={{ color: theme.text }}
      >
        Something went wrong
      </h2>
      <p
        className="text-[13px] text-center max-w-md mb-6"
        style={{ color: withAlpha(theme.text, 0.5) }}
      >
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
        style={{
          backgroundColor: withAlpha(theme.text, 0.06),
          color: withAlpha(theme.text, 0.7),
          border: `1px solid ${withAlpha(theme.text, 0.08)}`,
        }}
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
