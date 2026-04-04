"use client";

import { useState, useEffect, useRef } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  PhoneForwarded,
  PhoneIncoming,
  User,
  X,
  Check,
  AlertCircle,
} from "lucide-react";

interface TransferNotificationProps {
  callId: string;
  contactName: string;
  conferenceName: string;
  duration: number;
  objective: string;
  onAccept: (callId: string, conferenceName: string) => void;
  onDecline: (callId: string) => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function objectiveLabel(objective: string): string {
  switch (objective) {
    case "qualify":
      return "Lead Qualification";
    case "appointment":
      return "Appointment Setting";
    case "followup":
      return "Follow-up";
    default:
      return "AI Call";
  }
}

export function TransferNotification({
  callId,
  contactName,
  conferenceName,
  duration,
  objective,
  onAccept,
  onDecline,
}: TransferNotificationProps) {
  const { theme } = useColonyTheme();
  const [visible, setVisible] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [liveDuration, setLiveDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Live duration counter
  useEffect(() => {
    setLiveDuration(duration);
    const interval = setInterval(() => {
      setLiveDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [duration]);

  // Play notification tone on mount
  useEffect(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.value = 0.15;
      osc.start();
      // Two short beeps
      setTimeout(() => { gain.gain.value = 0; }, 150);
      setTimeout(() => { gain.gain.value = 0.15; }, 250);
      setTimeout(() => { gain.gain.value = 0; osc.stop(); ctx.close(); }, 400);
    } catch {
      // Audio not available, skip silently
    }
  }, []);

  const handleAccept = async () => {
    setAccepting(true);
    onAccept(callId, conferenceName);
  };

  const handleDecline = () => {
    setVisible(false);
    setTimeout(() => onDecline(callId), 300);
  };

  return (
    <div
      className="fixed top-4 right-4 z-[100] w-[380px] transition-all duration-300 ease-out"
      style={{
        transform: visible ? "translateX(0)" : "translateX(120%)",
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
          backgroundColor: theme.bg,
          border: `2px solid ${withAlpha("#22c55e", 0.5)}`,
          animation: "transfer-pulse 2s ease-in-out infinite",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ backgroundColor: withAlpha("#22c55e", 0.1) }}
        >
          <div className="flex items-center gap-2">
            <PhoneForwarded className="h-4 w-4" style={{ color: "#22c55e" }} />
            <span className="text-[13px] font-semibold" style={{ color: "#22c55e" }}>
              Transfer Request
            </span>
          </div>
          <button
            onClick={handleDecline}
            className="h-6 w-6 flex items-center justify-center rounded-md transition-colors"
            style={{ color: withAlpha(theme.text, 0.4) }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Contact info */}
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: withAlpha(theme.text, 0.08) }}
            >
              <User className="h-5 w-5" style={{ color: withAlpha(theme.text, 0.5) }} />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold truncate" style={{ color: theme.text }}>
                {contactName}
              </p>
              <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
                {objectiveLabel(objective)} &middot; {formatDuration(liveDuration)}
              </p>
            </div>
          </div>

          {/* Reason */}
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
            style={{ backgroundColor: withAlpha(theme.text, 0.04) }}
          >
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: withAlpha(theme.text, 0.4) }} />
            <p className="text-[12px] leading-relaxed" style={{ color: withAlpha(theme.text, 0.6) }}>
              Contact requested to speak with a human agent or showed very high interest. Tara is holding them in a conference room.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                backgroundColor: accepting ? withAlpha("#22c55e", 0.3) : "#22c55e",
                color: "#fff",
                opacity: accepting ? 0.7 : 1,
              }}
            >
              {accepting ? (
                <>
                  <PhoneIncoming className="h-4 w-4 animate-pulse" />
                  Connecting...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Accept Transfer
                </>
              )}
            </button>
            <button
              onClick={handleDecline}
              disabled={accepting}
              className="h-10 px-4 rounded-xl text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: withAlpha(theme.text, 0.06),
                color: withAlpha(theme.text, 0.5),
              }}
            >
              Decline
            </button>
          </div>
        </div>
      </div>

      {/* Pulsing border animation */}
      <style jsx>{`
        @keyframes transfer-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.3);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
          }
        }
      `}</style>
    </div>
  );
}
