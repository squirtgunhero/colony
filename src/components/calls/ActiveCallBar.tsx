"use client";

import { useDialer } from "@/providers/DialerProvider";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { Phone, PhoneOff, Loader2 } from "lucide-react";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ActiveCallBar() {
  const { isOnCall, isConnecting, callDuration, hangUp } = useDialer();
  const { theme } = useColonyTheme();

  if (!isOnCall && !isConnecting) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-2xl shadow-2xl"
      style={{
        backgroundColor: isConnecting ? withAlpha(theme.accent, 0.95) : "#16a34a",
        color: "#fff",
        backdropFilter: "blur(12px)",
        boxShadow: `0 8px 32px ${withAlpha("#000", 0.4)}`,
      }}
    >
      {isConnecting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Connecting...</span>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <Phone className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium tabular-nums">
            {formatTime(callDuration)}
          </span>
          <span className="text-xs opacity-75">Recording</span>
        </>
      )}

      <button
        onClick={hangUp}
        className="ml-2 h-9 w-9 rounded-full flex items-center justify-center transition-transform hover:scale-110"
        style={{ backgroundColor: "#ef4444" }}
      >
        <PhoneOff className="h-4 w-4" />
      </button>
    </div>
  );
}
