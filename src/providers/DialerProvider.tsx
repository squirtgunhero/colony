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

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (deviceRef.current) {
        try { deviceRef.current.destroy(); } catch { /* noop */ }
      }
    };
  }, []);

  const initDevice = useCallback(async () => {
    if (deviceRef.current) return;

    try {
      // Dynamically import Twilio Voice SDK (browser-only)
      const { Device } = await import("@twilio/voice-sdk");

      // Fetch token from our API
      const tokenRes = await fetch("/api/dialer/token", { method: "POST" });
      if (!tokenRes.ok) throw new Error("Failed to get voice token");
      const { token } = await tokenRes.json();

      const device = new Device(token, {
        codecPreferences: ["opus" as never, "pcmu" as never],
        logLevel: "warn",
      });

      device.on("registered", () => {
        setState((s) => ({ ...s, isReady: true }));
      });

      device.on("error", (err: Error) => {
        console.error("Twilio Device error:", err);
        setState((s) => ({ ...s, error: err.message }));
      });

      await device.register();
      deviceRef.current = device;
    } catch (err) {
      console.error("Failed to initialize dialer:", err);
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : "Failed to initialize dialer",
      }));
    }
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
      setState((s) => ({ ...s, isConnecting: true, error: null }));

      try {
        // Initialize device if needed
        if (!deviceRef.current) {
          await initDevice();
        }

        if (!deviceRef.current) {
          throw new Error("Dialer not ready");
        }

        // Place call via Twilio Voice SDK
        const call = await deviceRef.current.connect({
          params: {
            To: to,
            From: process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER || "",
          },
        });

        activeCallRef.current = call;

        call.on("accept", async () => {
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

          // Register call in our API
          try {
            const callSid =
              call.parameters?.CallSid || call.outboundConnectionId || `browser-${Date.now()}`;
            await fetch("/api/calls/recordings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                callSid,
                contactId,
                toNumber: to,
                fromNumber:
                  process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER || "",
              }),
            });
          } catch (err) {
            console.error("Failed to register call:", err);
          }
        });

        call.on("disconnect", () => {
          if (timerRef.current) clearInterval(timerRef.current);
          activeCallRef.current = null;
          setState((s) => ({
            ...s,
            isOnCall: false,
            isConnecting: false,
            callDuration: 0,
          }));
        });

        call.on("cancel", () => {
          if (timerRef.current) clearInterval(timerRef.current);
          activeCallRef.current = null;
          setState((s) => ({
            ...s,
            isOnCall: false,
            isConnecting: false,
          }));
        });

        call.on("error", (err: Error) => {
          if (timerRef.current) clearInterval(timerRef.current);
          activeCallRef.current = null;
          setState((s) => ({
            ...s,
            isOnCall: false,
            isConnecting: false,
            error: err.message,
          }));
        });
      } catch (err) {
        setState((s) => ({
          ...s,
          isConnecting: false,
          error: err instanceof Error ? err.message : "Call failed",
        }));
      }
    },
    [initDevice]
  );

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
    <DialerContext.Provider value={{ ...state, makeCall, hangUp }}>
      {children}
    </DialerContext.Provider>
  );
}
