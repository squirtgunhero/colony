"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

interface DialerState {
  isReady: boolean;
  isConnecting: boolean;
  isOnCall: boolean;
  callDuration: number;
  error: string | null;
}

interface DialerContextType extends DialerState {
  makeCall: (params: {
    to: string;
    contactId?: string;
    contactName?: string;
  }) => Promise<void>;
  hangUp: () => void;
  onCallEnd: (callback: () => void) => () => void;
}

const DialerContext = createContext<DialerContextType | null>(null);

export function useDialer() {
  const ctx = useContext(DialerContext);
  if (!ctx) throw new Error("useDialer must be used within DialerProvider");
  return ctx;
}

// ============================================================================
// Provider
// ============================================================================

export function DialerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialerState>({
    isReady: false,
    isConnecting: false,
    isOnCall: false,
    callDuration: 0,
    error: null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeCallRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const initPromiseRef = useRef<Promise<boolean> | null>(null);
  const callEndListenersRef = useRef<Set<() => void>>(new Set());

  // Initialize Twilio Device eagerly on mount
  useEffect(() => {
    mountedRef.current = true;

    async function initDevice(): Promise<boolean> {
      try {
        console.log("[Dialer] Fetching voice token...");
        const tokenRes = await fetch("/api/dialer/token", { method: "POST" });

        if (!tokenRes.ok) {
          const body = await tokenRes.text().catch(() => "");
          if (tokenRes.status === 503) {
            console.info("[Dialer] Twilio not configured, dialer disabled");
          } else {
            console.warn(`[Dialer] Token fetch failed: ${tokenRes.status} ${body}`);
          }
          return false;
        }

        const { token } = await tokenRes.json();
        console.log("[Dialer] Token received, initializing Device...");

        // Dynamic import to avoid SSR issues
        const { Device } = await import("@twilio/voice-sdk");
        const device = new Device(token, {
          closeProtection: true,
          logLevel: "warn",
          // Stop infinite reconnect attempts if WebSocket fails (e.g. CSP blocking)
          maxCallSignalingTimeoutMs: 10000,
        } as Record<string, unknown>);

        device.on("registered", () => {
          console.log("[Dialer] Device registered and ready");
          if (mountedRef.current) {
            setState((s) => ({ ...s, isReady: true }));
          }
        });

        let errorCount = 0;
        device.on("error", (err: Error) => {
          errorCount++;
          console.error("[Dialer] Device error:", err);
          if (mountedRef.current) {
            setState((s) => ({ ...s, error: err.message }));
          }
          // If we get repeated errors (e.g. CSP blocking WebSocket), destroy device
          // to stop the infinite reconnect loop
          if (errorCount >= 3) {
            console.warn("[Dialer] Too many errors, destroying device");
            try { device.destroy(); } catch { /* noop */ }
            deviceRef.current = null;
          }
        });

        await device.register();
        deviceRef.current = device;
        console.log("[Dialer] Device registration complete");
        return true;
      } catch (err) {
        console.error("[Dialer] Init failed:", err);
        if (mountedRef.current) {
          setState((s) => ({
            ...s,
            error: err instanceof Error ? err.message : "Failed to initialize dialer",
          }));
        }
        return false;
      }
    }

    initPromiseRef.current = initDevice();

    // Refresh token every 50 minutes
    const refreshInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/dialer/token", { method: "POST" });
        if (!res.ok) return;
        const { token } = await res.json();
        if (deviceRef.current?.updateToken) {
          deviceRef.current.updateToken(token);
        }
      } catch {
        // Token refresh failed, will retry next interval
      }
    }, 50 * 60 * 1000);

    return () => {
      mountedRef.current = false;
      clearInterval(refreshInterval);
      if (timerRef.current) clearInterval(timerRef.current);
      if (deviceRef.current) {
        try {
          deviceRef.current.destroy();
        } catch {
          /* noop */
        }
        deviceRef.current = null;
      }
    };
  }, []);

  const makeCall = useCallback(
    async ({
      to,
      contactId,
    }: {
      to: string;
      contactId?: string;
      contactName?: string;
    }) => {
      // Wait for init to finish if it's still in progress
      if (initPromiseRef.current) {
        console.log("[Dialer] Waiting for device init to complete...");
        await initPromiseRef.current;
      }

      if (!deviceRef.current) {
        console.warn("[Dialer] Device not initialized — cannot place call");
        toast.error("Dialer not available. Check browser console for details.");
        setState((s) => ({
          ...s,
          isConnecting: false,
          error: "Dialer not available",
        }));
        return;
      }

      setState((s) => ({ ...s, isConnecting: true, error: null }));
      console.log("[Dialer] Placing call to", to);

      try {
        // Place call via Twilio Voice SDK
        // Pass contactId so the server-side TwiML route can create the recording
        const call = await deviceRef.current.connect({
          params: {
            To: to,
            From: process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER || "",
            ContactId: contactId || "",
          },
        });

        activeCallRef.current = call;
        console.log("[Dialer] Call connecting...");

        call.on("accept", async () => {
          console.log("[Dialer] Call accepted/connected");
          if (!mountedRef.current) return;
          setState((s) => ({
            ...s,
            isConnecting: false,
            isOnCall: true,
            callDuration: 0,
          }));

          // Start duration timer
          timerRef.current = setInterval(() => {
            setState((s) => ({
              ...s,
              callDuration: s.callDuration + 1,
            }));
          }, 1000);

          // Store the contactId so we can check for recordings after disconnect
          if (contactId) {
            activeCallRef.current._colonyContactId = contactId;
          }
        });

        call.on("ringing", () => {
          console.log("[Dialer] Ringing...");
          if (mountedRef.current) {
            setState((s) => ({ ...s, isConnecting: true }));
          }
        });

        call.on("disconnect", () => {
          console.log("[Dialer] Call disconnected");
          if (timerRef.current) clearInterval(timerRef.current);
          const cid = activeCallRef.current?._colonyContactId;
          activeCallRef.current = null;
          if (mountedRef.current) {
            setState((s) => ({
              ...s,
              isOnCall: false,
              isConnecting: false,
              callDuration: 0,
            }));
            // Check for recordings via Twilio API after a short delay
            setTimeout(async () => {
              try {
                await fetch("/api/calls/check-recording", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ contactId: cid || null }),
                });
              } catch (err) {
                console.error("[Dialer] Failed to check recording:", err);
              }
              notifyCallEnd();
            }, 3000);
          }
        });

        call.on("cancel", () => {
          console.log("[Dialer] Call cancelled");
          if (timerRef.current) clearInterval(timerRef.current);
          activeCallRef.current = null;
          if (mountedRef.current) {
            setState((s) => ({
              ...s,
              isOnCall: false,
              isConnecting: false,
            }));
            notifyCallEnd();
          }
        });

        call.on("error", (err: Error) => {
          console.error("[Dialer] Call error:", err);
          if (timerRef.current) clearInterval(timerRef.current);
          activeCallRef.current = null;
          if (mountedRef.current) {
            toast.error(`Call failed: ${err.message}`);
            setState((s) => ({
              ...s,
              isOnCall: false,
              isConnecting: false,
              error: err.message,
            }));
          }
        });
      } catch (err) {
        console.error("[Dialer] Connect failed:", err);
        toast.error(err instanceof Error ? err.message : "Call failed");
        setState((s) => ({
          ...s,
          isConnecting: false,
          error: err instanceof Error ? err.message : "Call failed",
        }));
      }
    },
    []
  );

  const onCallEnd = useCallback((callback: () => void) => {
    callEndListenersRef.current.add(callback);
    return () => { callEndListenersRef.current.delete(callback); };
  }, []);

  const notifyCallEnd = useCallback(() => {
    callEndListenersRef.current.forEach((cb) => cb());
  }, []);

  const hangUp = useCallback(() => {
    if (activeCallRef.current) {
      activeCallRef.current.disconnect();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    activeCallRef.current = null;
    setState((s) => ({
      ...s,
      isOnCall: false,
      isConnecting: false,
      callDuration: 0,
    }));
  }, []);

  return (
    <DialerContext.Provider value={{ ...state, makeCall, hangUp, onCallEnd }}>
      {children}
    </DialerContext.Provider>
  );
}
