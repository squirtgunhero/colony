"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type CallState = "idle" | "connecting" | "ringing" | "connected" | "disconnected";

export interface DialerContextValue {
  callState: CallState;
  isMuted: boolean;
  callDuration: number;
  currentContactId: string | null;
  currentContactName: string | null;
  currentNumber: string | null;
  currentCallId: string | null;
  currentCallListId: string | null;
  queueProgress: { total: number; completed: number; remaining: number } | null;
  call: (number: string, contactId?: string, contactName?: string, callListId?: string) => Promise<void>;
  hangup: () => void;
  toggleMute: () => void;
  sendDtmf: (digit: string) => void;
  setOutcome: (outcome: string) => void;
  setNotes: (notes: string) => void;
  dropVoicemail: (voicemailDropId: string) => Promise<void>;
  onCallEnd: (callback: () => void) => () => void;
  isReady: boolean;
}

export const DialerContext = createContext<DialerContextValue | null>(null);

export function DialerProvider({ children }: { children: ReactNode }) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [currentContactId, setCurrentContactId] = useState<string | null>(null);
  const [currentContactName, setCurrentContactName] = useState<string | null>(null);
  const [currentNumber, setCurrentNumber] = useState<string | null>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [currentCallListId, setCurrentCallListId] = useState<string | null>(null);
  const [queueProgress, setQueueProgress] = useState<{ total: number; completed: number; remaining: number } | null>(null);
  const [isReady, setIsReady] = useState(false);

  const deviceRef = useRef<unknown>(null);
  const connectionRef = useRef<unknown>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callEndListenersRef = useRef<Set<() => void>>(new Set());

  // Initialize Twilio Device
  useEffect(() => {
    let mounted = true;

    async function initDevice() {
      try {
        const res = await fetch("/api/dialer/token");
        if (!res.ok) return;
        const { token } = await res.json();

        // Dynamic import to avoid SSR issues
        const { Device } = await import("@twilio/voice-sdk");
        const device = new Device(token, {
          closeProtection: true,
        } as Record<string, unknown>);

        device.on("registered", () => {
          if (mounted) setIsReady(true);
        });

        device.on("error", (err: unknown) => {
          console.error("Twilio Device error:", err);
        });

        await device.register();
        deviceRef.current = device;
      } catch (err) {
        console.error("Failed to init dialer:", err);
      }
    }

    initDevice();

    // Refresh token every 50 minutes
    const refreshInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/dialer/token");
        if (!res.ok) return;
        const { token } = await res.json();
        const device = deviceRef.current as { updateToken?: (t: string) => void } | null;
        if (device?.updateToken) {
          device.updateToken(token);
        }
      } catch {
        // Token refresh failed, will retry
      }
    }, 50 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(refreshInterval);
      const device = deviceRef.current as { destroy?: () => void } | null;
      if (device?.destroy) device.destroy();
    };
  }, []);

  // Call timer
  useEffect(() => {
    if (callState === "connected") {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const call = useCallback(
    async (number: string, contactId?: string, contactName?: string, callListId?: string) => {
      const device = deviceRef.current as {
        connect?: (opts: { params: Record<string, string> }) => Promise<unknown>;
      } | null;

      if (!device?.connect) return;

      setCurrentNumber(number);
      setCurrentContactId(contactId || null);
      setCurrentContactName(contactName || null);
      setCurrentCallListId(callListId || null);
      setCallState("connecting");

      try {
        const conn = await device.connect({
          params: { To: number },
        });

        connectionRef.current = conn;

        const connection = conn as {
          on: (event: string, fn: () => void) => void;
          parameters?: { CallSid?: string };
        };

        // Create call record
        const callSid = connection.parameters?.CallSid;
        const res = await fetch("/api/dialer/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: contactId || null,
            toNumber: number,
            callListId: callListId || null,
            twilioCallSid: callSid || null,
          }),
        });
        const callRecord = await res.json();
        setCurrentCallId(callRecord.id);

        connection.on("ringing", () => setCallState("ringing"));
        connection.on("accept", () => setCallState("connected"));
        connection.on("disconnect", () => {
          setCallState("disconnected");
          connectionRef.current = null;
          // Reset after brief delay so UI can show post-call state
          setTimeout(() => {
            if (callState !== "connected") {
              setCallState("idle");
              setCurrentNumber(null);
              setCurrentContactId(null);
              setCurrentContactName(null);
              setCurrentCallId(null);
            }
          }, 30000); // 30s for notes/outcome
        });
        connection.on("cancel", () => {
          setCallState("idle");
          connectionRef.current = null;
        });
      } catch (err) {
        console.error("Call failed:", err);
        setCallState("idle");
      }
    },
    [callState]
  );

  const hangup = useCallback(() => {
    const conn = connectionRef.current as { disconnect?: () => void } | null;
    if (conn?.disconnect) {
      conn.disconnect();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const conn = connectionRef.current as { mute?: (m: boolean) => void } | null;
    if (conn?.mute) {
      conn.mute(!isMuted);
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const sendDtmf = useCallback((digit: string) => {
    const conn = connectionRef.current as { sendDigits?: (d: string) => void } | null;
    if (conn?.sendDigits) {
      conn.sendDigits(digit);
    }
  }, []);

  const setOutcome = useCallback(
    async (outcome: string) => {
      if (!currentCallId) return;
      await fetch("/api/dialer/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: currentCallId, outcome }),
      });
    },
    [currentCallId]
  );

  const setNotes = useCallback(
    async (notes: string) => {
      if (!currentCallId) return;
      await fetch("/api/dialer/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: currentCallId, notes }),
      });
    },
    [currentCallId]
  );

  const dropVoicemail = useCallback(
    async (voicemailDropId: string) => {
      if (!currentCallId) return;
      await fetch("/api/dialer/drop-voicemail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: currentCallId, voicemailDropId }),
      });
    },
    [currentCallId]
  );

  const onCallEnd = useCallback((callback: () => void) => {
    callEndListenersRef.current.add(callback);
    return () => { callEndListenersRef.current.delete(callback); };
  }, []);

  const notifyCallEnd = useCallback(() => {
    callEndListenersRef.current.forEach((cb) => cb());
  }, []);

  // Fire notifyCallEnd when call transitions to disconnected or idle from a call
  useEffect(() => {
    if (callState === "disconnected") {
      notifyCallEnd();
    }
  }, [callState, notifyCallEnd]);

  return (
    <DialerContext.Provider
      value={{
        callState,
        isMuted,
        callDuration,
        currentContactId,
        currentContactName,
        currentNumber,
        currentCallId,
        currentCallListId,
        queueProgress,
        call,
        hangup,
        toggleMute,
        sendDtmf,
        setOutcome,
        setNotes,
        dropVoicemail,
        onCallEnd,
        isReady,
      }}
    >
      {children}
    </DialerContext.Provider>
  );
}
