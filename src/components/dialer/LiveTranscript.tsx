"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { MessageSquare, Mic } from "lucide-react";

interface TranscriptLine {
  speaker: string; // "agent" | "contact" | "unknown"
  text: string;
  timestamp: string;
  isFinal?: boolean;
}

interface Props {
  callId: string;
  isActive: boolean;
}

const POLL_INTERVAL = 2000; // 2 seconds

export function LiveTranscript({ callId, isActive }: Props) {
  const { theme } = useColonyTheme();
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start transcription when the call becomes active
  useEffect(() => {
    if (!isActive || !callId || hasStarted) return;

    async function startTranscription() {
      try {
        await fetch("/api/dialer/transcript/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callId }),
        });
        setHasStarted(true);
      } catch (err) {
        console.error("Failed to start transcription:", err);
      }
    }

    startTranscription();
  }, [isActive, callId, hasStarted]);

  // Poll for transcript updates
  const fetchTranscript = useCallback(async () => {
    if (!callId) return;
    try {
      const res = await fetch(`/api/dialer/transcript?callId=${callId}`);
      if (res.ok) {
        const data = await res.json();
        setTranscript(data.transcript || []);
      }
    } catch {
      // Silently fail on poll errors
    }
  }, [callId]);

  useEffect(() => {
    if (!callId) return;

    // Initial fetch
    setIsLoading(true);
    fetchTranscript().finally(() => setIsLoading(false));

    // Poll while active or shortly after (to catch final chunks)
    if (isActive) {
      pollRef.current = setInterval(fetchTranscript, POLL_INTERVAL);
    } else {
      // After call ends, poll a few more times to catch final transcription
      let remaining = 5;
      pollRef.current = setInterval(() => {
        fetchTranscript();
        remaining--;
        if (remaining <= 0 && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, POLL_INTERVAL);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [callId, isActive, fetchTranscript]);

  // Auto-scroll to bottom when new lines appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const borderColor = withAlpha(theme.text, 0.06);

  const getSpeakerLabel = (speaker: string) => {
    switch (speaker) {
      case "agent":
        return "You";
      case "contact":
        return "Contact";
      default:
        return "Speaker";
    }
  };

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case "agent":
        return theme.accent;
      case "contact":
        return "#3b82f6";
      default:
        return withAlpha(theme.text, 0.5);
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: withAlpha(theme.text, 0.02),
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare
            className="h-3.5 w-3.5"
            style={{ color: withAlpha(theme.text, 0.3) }}
          />
          <span
            className="text-[11px] uppercase tracking-wider font-medium"
            style={{ color: withAlpha(theme.text, 0.35) }}
          >
            Live Transcript
          </span>
        </div>

        {isActive && (
          <div className="flex items-center gap-1.5">
            <div
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: "#22c55e" }}
            />
            <div className="flex items-center gap-1">
              <Mic
                className="h-3 w-3"
                style={{ color: "#22c55e" }}
              />
              <span className="text-[10px] font-medium" style={{ color: "#22c55e" }}>
                Transcribing...
              </span>
            </div>
          </div>
        )}

        {!isActive && transcript.length > 0 && (
          <span
            className="text-[10px]"
            style={{ color: withAlpha(theme.text, 0.3) }}
          >
            {transcript.length} line{transcript.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Transcript content */}
      <div
        ref={scrollRef}
        className="px-4 py-3 space-y-2.5 overflow-y-auto"
        style={{ maxHeight: "240px", minHeight: "80px" }}
      >
        {isLoading && transcript.length === 0 && (
          <div className="flex items-center justify-center py-6">
            <span className="text-[12px]" style={{ color: withAlpha(theme.text, 0.3) }}>
              Waiting for transcript...
            </span>
          </div>
        )}

        {!isLoading && transcript.length === 0 && isActive && (
          <div className="flex items-center justify-center py-6">
            <div className="text-center space-y-1">
              <Mic
                className="h-5 w-5 mx-auto animate-pulse"
                style={{ color: withAlpha(theme.text, 0.15) }}
              />
              <span className="text-[12px] block" style={{ color: withAlpha(theme.text, 0.3) }}>
                Listening for conversation...
              </span>
            </div>
          </div>
        )}

        {!isLoading && transcript.length === 0 && !isActive && (
          <div className="flex items-center justify-center py-6">
            <span className="text-[12px]" style={{ color: withAlpha(theme.text, 0.25) }}>
              No transcript available
            </span>
          </div>
        )}

        {transcript.map((line, i) => {
          const speakerColor = getSpeakerColor(line.speaker);
          return (
            <div key={i} className="flex gap-2.5">
              {/* Speaker indicator */}
              <div className="flex-shrink-0 pt-0.5">
                <div
                  className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{
                    backgroundColor: withAlpha(speakerColor, 0.12),
                    color: speakerColor,
                  }}
                >
                  {line.speaker === "agent" ? "Y" : line.speaker === "contact" ? "C" : "?"}
                </div>
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: speakerColor }}
                  >
                    {getSpeakerLabel(line.speaker)}
                  </span>
                  <span
                    className="text-[9px]"
                    style={{ color: withAlpha(theme.text, 0.2) }}
                  >
                    {formatTimestamp(line.timestamp)}
                  </span>
                </div>
                <p
                  className="text-[13px] leading-relaxed mt-0.5"
                  style={{
                    color: withAlpha(theme.text, line.isFinal === false ? 0.4 : 0.7),
                    fontStyle: line.isFinal === false ? "italic" : "normal",
                  }}
                >
                  {line.text}
                </p>
              </div>
            </div>
          );
        })}

        {/* Typing indicator when active and we have some content */}
        {isActive && transcript.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            <div className="flex gap-0.5">
              <div
                className="h-1 w-1 rounded-full animate-bounce"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.2),
                  animationDelay: "0ms",
                }}
              />
              <div
                className="h-1 w-1 rounded-full animate-bounce"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.2),
                  animationDelay: "150ms",
                }}
              />
              <div
                className="h-1 w-1 rounded-full animate-bounce"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.2),
                  animationDelay: "300ms",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Format timestamp for display
function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}
