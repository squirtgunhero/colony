"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  BotMessageSquare,
  Pause,
  Play,
  ArrowLeft,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  CalendarCheck,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface CallResult {
  id: string;
  contactName: string;
  status: string;
  outcome: string | null;
  duration: number | null;
  aiSummary: string | null;
  appointmentSet: boolean;
  createdAt: string;
}

interface BatchProgress {
  total: number;
  completed: number;
  remaining: number;
}

interface Props {
  callListId: string;
  callListName: string;
  objective: "qualify" | "appointment" | "followup";
  onExit: () => void;
}

const outcomeColors: Record<string, string> = {
  connected: "#22c55e",
  interested: "#22c55e",
  qualified: "#22c55e",
  left_voicemail: "#eab308",
  callback_requested: "#3b82f6",
  no_answer: "#6b7280",
  busy: "#6b7280",
  not_interested: "#ef4444",
  wrong_number: "#ef4444",
  appointment_set: "#22c55e",
};

function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function TaraSession({ callListId, callListName, objective, onExit }: Props) {
  const { theme } = useColonyTheme();
  const borderColor = withAlpha(theme.text, 0.06);

  const [status, setStatus] = useState<"starting" | "active" | "paused" | "completed">("starting");
  const [progress, setProgress] = useState<BatchProgress>({ total: 0, completed: 0, remaining: 0 });
  const [currentContact, setCurrentContact] = useState<string | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallResult[]>([]);
  const [outcomes, setOutcomes] = useState<{ outcome: string; count: number }[]>([]);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start the batch session
  const startBatch = useCallback(async () => {
    setStatus("starting");
    setError(null);
    try {
      const res = await fetch("/api/dialer/voice-ai/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callListId, objective }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error === "No pending contacts with phone numbers"
          ? "No remaining contacts with phone numbers in this list"
          : data.error || "Failed to start";
        setError(msg);
        setStatus("paused");
        return;
      }
      setCurrentContact(data.contactName || null);
      setProgress(data.progress);
      setStatus("active");
    } catch {
      setError("Failed to start batch session");
      setStatus("paused");
    }
  }, [callListId, objective]);

  // Poll for status updates
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/dialer/voice-ai/batch?callListId=${callListId}`);
      if (!res.ok) return;
      const data = await res.json();

      setProgress(data.progress);
      setOutcomes(data.outcomes || []);
      setRecentCalls(data.recentCalls || []);

      if (data.listStatus === "paused") {
        setStatus("paused");
      } else if (data.progress.remaining === 0) {
        setStatus("completed");
      }

      // Find currently active call
      const activeCalls = (data.recentCalls || []).filter(
        (c: CallResult) => c.status === "in-progress" || c.status === "ringing" || c.status === "initiated"
      );
      if (activeCalls.length > 0) {
        setCurrentContact(activeCalls[0].contactName);
      } else {
        setCurrentContact(null);
      }
    } catch {
      // ignore polling errors
    }
  }, [callListId]);

  // Start on mount
  useEffect(() => {
    startBatch();
  }, [startBatch]);

  // Poll every 5s when active
  useEffect(() => {
    if (status === "active") {
      pollRef.current = setInterval(pollStatus, 5000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, pollStatus]);

  // Stop/pause the session
  const handleStop = async () => {
    try {
      await fetch("/api/dialer/voice-ai/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callListId }),
      });
      setStatus("paused");
    } catch {
      // ignore
    }
  };

  const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="h-9 w-9 flex items-center justify-center rounded-xl transition-colors"
            style={{
              backgroundColor: withAlpha(theme.text, 0.06),
              color: withAlpha(theme.text, 0.5),
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <BotMessageSquare className="h-5 w-5" style={{ color: "#bf5af2" }} strokeWidth={1.5} />
              <h1 className="text-[18px] font-semibold" style={{ color: theme.text }}>
                Tara — {callListName}
              </h1>
            </div>
            <p className="text-[12px] mt-0.5" style={{ color: withAlpha(theme.text, 0.4) }}>
              {objective === "qualify" && "Qualifying leads"}
              {objective === "appointment" && "Setting appointments"}
              {objective === "followup" && "Following up"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "paused" && progress.remaining > 0 && (
            <button
              onClick={startBatch}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: withAlpha("#bf5af2", 0.12),
                color: "#bf5af2",
              }}
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </button>
          )}
          {status === "active" && (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: withAlpha("#ef4444", 0.12),
                color: "#ef4444",
              }}
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {status === "starting" && (
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-2xl"
          style={{ backgroundColor: withAlpha("#bf5af2", 0.08) }}
        >
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#bf5af2" }} />
          <div>
            <p className="text-[14px] font-medium" style={{ color: theme.text }}>
              Starting Tara...
            </p>
            <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
              Initiating the first call
            </p>
          </div>
        </div>
      )}

      {status === "active" && currentContact && (
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-2xl"
          style={{ backgroundColor: withAlpha("#bf5af2", 0.08) }}
        >
          <div className="h-3 w-3 rounded-full animate-pulse" style={{ backgroundColor: "#bf5af2" }} />
          <div>
            <p className="text-[14px] font-medium" style={{ color: theme.text }}>
              Currently calling {currentContact}
            </p>
            <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
              {progress.completed} of {progress.total} completed
            </p>
          </div>
        </div>
      )}

      {error && (
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-2xl"
          style={{ backgroundColor: withAlpha("#ef4444", 0.08) }}
        >
          <XCircle className="h-5 w-5" style={{ color: "#ef4444" }} />
          <p className="text-[13px]" style={{ color: "#ef4444" }}>{error}</p>
        </div>
      )}

      {status === "completed" && (
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-2xl"
          style={{ backgroundColor: withAlpha("#22c55e", 0.08) }}
        >
          <CheckCircle className="h-5 w-5" style={{ color: "#22c55e" }} />
          <div>
            <p className="text-[14px] font-medium" style={{ color: theme.text }}>
              All calls completed
            </p>
            <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
              Tara finished calling {progress.total} contacts
            </p>
          </div>
        </div>
      )}

      {/* Progress */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ backgroundColor: withAlpha(theme.text, 0.03) }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium" style={{ color: theme.text }}>Progress</span>
          <span className="text-[13px] font-bold" style={{ color: theme.text }}>{progressPct}%</span>
        </div>
        <div
          className="h-2.5 rounded-full overflow-hidden"
          style={{ backgroundColor: withAlpha(theme.text, 0.08) }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progressPct}%`,
              backgroundColor: progressPct === 100 ? "#22c55e" : "#bf5af2",
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[20px] font-bold" style={{ color: theme.text }}>{progress.completed}</p>
            <p className="text-[11px]" style={{ color: withAlpha(theme.text, 0.4) }}>Completed</p>
          </div>
          <div className="text-center">
            <p className="text-[20px] font-bold" style={{ color: theme.text }}>{progress.remaining}</p>
            <p className="text-[11px]" style={{ color: withAlpha(theme.text, 0.4) }}>Remaining</p>
          </div>
          <div className="text-center">
            <p className="text-[20px] font-bold" style={{ color: theme.text }}>{progress.total}</p>
            <p className="text-[11px]" style={{ color: withAlpha(theme.text, 0.4) }}>Total</p>
          </div>
        </div>
      </div>

      {/* Outcome summary */}
      {outcomes.length > 0 && (
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ backgroundColor: withAlpha(theme.text, 0.03) }}
        >
          <p className="text-[13px] font-medium" style={{ color: theme.text }}>Outcomes</p>
          <div className="flex flex-wrap gap-2">
            {outcomes.map((o) => (
              <div
                key={o.outcome || "unknown"}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{
                  backgroundColor: withAlpha(
                    outcomeColors[o.outcome || ""] || "#6b7280",
                    0.12
                  ),
                }}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: outcomeColors[o.outcome || ""] || "#6b7280",
                  }}
                />
                <span
                  className="text-[12px] font-medium capitalize"
                  style={{ color: outcomeColors[o.outcome || ""] || "#6b7280" }}
                >
                  {(o.outcome || "unknown").replace(/_/g, " ")}
                </span>
                <span
                  className="text-[12px] font-bold"
                  style={{ color: outcomeColors[o.outcome || ""] || "#6b7280" }}
                >
                  {o.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent calls feed */}
      {recentCalls.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: withAlpha(theme.text, 0.03),
            border: `1px solid ${borderColor}`,
          }}
        >
          <div className="px-5 py-3" style={{ borderBottom: `1px solid ${borderColor}` }}>
            <p className="text-[13px] font-medium" style={{ color: theme.text }}>Call Feed</p>
          </div>
          <div>
            {recentCalls.map((call, i) => {
              const isExpanded = expandedCallId === call.id;
              return (
                <div key={call.id}>
                  <button
                    onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.02]"
                    style={{
                      borderBottom: i < recentCalls.length - 1 && !isExpanded
                        ? `1px solid ${borderColor}`
                        : undefined,
                    }}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: call.status === "completed"
                          ? (outcomeColors[call.outcome || ""] || "#6b7280")
                          : call.status === "in-progress"
                            ? "#bf5af2"
                            : withAlpha(theme.text, 0.2),
                        ...(call.status === "in-progress" ? { animation: "pulse 2s infinite" } : {}),
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: theme.text }}>
                        {call.contactName}
                      </p>
                      {call.outcome && (
                        <p className="text-[11px] capitalize" style={{ color: withAlpha(theme.text, 0.4) }}>
                          {call.outcome.replace(/_/g, " ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {call.appointmentSet && (
                        <CalendarCheck className="h-3.5 w-3.5" style={{ color: "#22c55e" }} />
                      )}
                      {call.duration != null && call.duration > 0 && (
                        <span className="text-[11px]" style={{ color: withAlpha(theme.text, 0.3) }}>
                          {formatDuration(call.duration)}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" style={{ color: withAlpha(theme.text, 0.3) }} />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" style={{ color: withAlpha(theme.text, 0.3) }} />
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div
                      className="px-5 pb-4 pt-1 space-y-2"
                      style={{ borderBottom: i < recentCalls.length - 1 ? `1px solid ${borderColor}` : undefined }}
                    >
                      {call.aiSummary && (
                        <div className="flex items-start gap-2">
                          <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#bf5af2" }} />
                          <p className="text-[12px] leading-relaxed" style={{ color: withAlpha(theme.text, 0.6) }}>
                            {call.aiSummary}
                          </p>
                        </div>
                      )}
                      {call.appointmentSet && (
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="h-3.5 w-3.5" style={{ color: "#22c55e" }} />
                          <span className="text-[12px] font-medium" style={{ color: "#22c55e" }}>
                            Appointment set
                          </span>
                        </div>
                      )}
                      {!call.aiSummary && !call.appointmentSet && (
                        <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.3) }}>
                          No summary available yet
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Back button at bottom */}
      {(status === "completed" || status === "paused") && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onExit}
            className="flex items-center gap-2 h-10 px-6 rounded-xl text-[13px] font-medium transition-colors"
            style={{
              backgroundColor: withAlpha(theme.text, 0.06),
              color: theme.text,
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dialer
          </button>
        </div>
      )}
    </div>
  );
}
