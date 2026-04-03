"use client";

/**
 * Backward-compatible DialerProvider that wraps the canonical rich provider.
 * The rich provider lives at @/components/dialer/DialerProvider.
 * This module re-exports it and provides a simplified useDialer hook
 * for legacy consumers (ActiveCallBar, contact-detail-view, dashboard layout).
 */

import { useContext, useMemo, type ReactNode } from "react";
import {
  DialerProvider as RichDialerProvider,
  DialerContext,
  type DialerContextValue,
} from "@/components/dialer/DialerProvider";

export { RichDialerProvider as DialerProvider };

/** Simplified API surface used by legacy dashboard components. */
interface SimpleDialerAPI {
  isReady: boolean;
  isConnecting: boolean;
  isOnCall: boolean;
  callDuration: number;
  error: string | null;
  makeCall: (params: { to: string; contactId?: string; contactName?: string }) => Promise<void>;
  hangUp: () => void;
  onCallEnd: (callback: () => void) => () => void;
}

export function useDialer(): SimpleDialerAPI {
  const ctx = useContext(DialerContext);
  if (!ctx) throw new Error("useDialer must be used within DialerProvider");

  return useMemo(() => ({
    isReady: ctx.isReady,
    isConnecting: ctx.callState === "connecting" || ctx.callState === "ringing",
    isOnCall: ctx.callState === "connected",
    callDuration: ctx.callDuration,
    error: null,
    makeCall: async ({ to, contactId, contactName }: { to: string; contactId?: string; contactName?: string }) => {
      await ctx.call(to, contactId, contactName);
    },
    hangUp: () => ctx.hangup(),
    onCallEnd: ctx.onCallEnd,
  }), [ctx]);
}
