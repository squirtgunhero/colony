"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Phone,
  PhoneOff,
  Loader2,
  ChevronDown,
  ChevronRight,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
  Pause,
  Volume2,
  Info,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface Objection {
  objection: string;
  response?: string;
  resolved: boolean;
}

interface CallRecording {
  id: string;
  callSid: string;
  direction: string;
  fromNumber: string;
  toNumber: string;
  duration: number | null;
  status: string;
  transcript: string | null;
  summary: string | null;
  sentiment: string | null;
  sentimentScore: number | null;
  keyTopics: string[] | null;
  objections: Objection[] | null;
  talkListenRatio: number | null;
  actionItems: string[] | null;
  analysisStatus: string;
  recordingUrl: string | null;
  createdAt: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SentimentIcon({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;
  switch (sentiment) {
    case "positive":
      return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
    case "negative":
      return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
    case "mixed":
      return <AlertCircle className="h-3.5 w-3.5 text-amber-400" />;
    default:
      return <Minus className="h-3.5 w-3.5 text-zinc-400" />;
  }
}

function sentimentDescription(sentiment: string | null): string {
  switch (sentiment) {
    case "positive": return "Client expressed interest, enthusiasm, or satisfaction during the call";
    case "negative": return "Client showed frustration, disinterest, or dissatisfaction during the call";
    case "mixed": return "Client showed both positive and negative signals — may need follow-up";
    default: return "Client tone was neutral — no strong positive or negative signals detected";
  }
}

function sentimentColor(sentiment: string | null): string {
  switch (sentiment) {
    case "positive": return "#34d399";
    case "negative": return "#f87171";
    case "mixed": return "#fbbf24";
    default: return "#a1a1aa";
  }
}

// ============================================================================
// Talk-Listen Ratio Bar
// ============================================================================

function TalkListenBar({
  ratio,
  theme,
}: {
  ratio: number;
  theme: ReturnType<typeof useColonyTheme>["theme"];
}) {
  const agentPct = Math.round(ratio * 100);
  const clientPct = 100 - agentPct;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]" style={{ color: theme.textMuted }}>
        <span>You {agentPct}%</span>
        <span>{clientPct}% Client</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex" style={{ backgroundColor: withAlpha(theme.text, 0.08) }}>
        <div
          className="h-full rounded-l-full transition-all"
          style={{
            width: `${agentPct}%`,
            backgroundColor: theme.accent,
          }}
        />
        <div
          className="h-full rounded-r-full transition-all"
          style={{
            width: `${clientPct}%`,
            backgroundColor: withAlpha(theme.accent, 0.3),
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Individual Recording Card
// ============================================================================

function AudioPlayer({
  recordingId,
  theme,
}: {
  recordingId: string;
  theme: ReturnType<typeof useColonyTheme>["theme"];
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(`/api/calls/audio?id=${recordingId}`);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });
    audio.addEventListener("timeupdate", () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    });
    audio.addEventListener("ended", () => {
      setPlaying(false);
      setProgress(0);
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [recordingId]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
    setProgress(pct);
  };

  const elapsed = audioRef.current?.currentTime || 0;
  const remaining = duration - elapsed;

  return (
    <div className="flex items-center gap-2.5 pt-3">
      <button
        onClick={toggle}
        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors"
        style={{ backgroundColor: withAlpha(theme.accent, 0.15) }}
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5" style={{ color: theme.accent }} />
        ) : (
          <Play className="h-3.5 w-3.5 ml-0.5" style={{ color: theme.accent }} />
        )}
      </button>
      <div className="flex-1 min-w-0 space-y-1">
        <div
          className="h-1.5 rounded-full cursor-pointer"
          style={{ backgroundColor: withAlpha(theme.text, 0.08) }}
          onClick={seek}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress * 100}%`, backgroundColor: theme.accent }}
          />
        </div>
        <div className="flex justify-between text-[10px]" style={{ color: theme.textMuted }}>
          <span>{formatDuration(Math.floor(elapsed))}</span>
          <span>-{formatDuration(Math.floor(remaining > 0 ? remaining : 0))}</span>
        </div>
      </div>
      <Volume2 className="h-3.5 w-3.5 shrink-0" style={{ color: theme.textMuted }} />
    </div>
  );
}

function RecordingCard({ recording }: { recording: CallRecording }) {
  const { theme } = useColonyTheme();
  const [expanded, setExpanded] = useState(false);
  const isAnalyzing = recording.analysisStatus === "transcribing" || recording.analysisStatus === "analyzing";
  const isComplete = recording.analysisStatus === "complete";
  const isFailed = recording.analysisStatus === "failed";

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        backgroundColor: withAlpha(theme.text, 0.03),
        border: `1px solid ${withAlpha(theme.text, 0.06)}`,
      }}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ color: theme.text }}
      >
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: withAlpha(theme.accent, 0.15) }}
        >
          {recording.status === "in-progress" ? (
            <Phone className="h-3.5 w-3.5 animate-pulse" style={{ color: theme.accent }} />
          ) : recording.status === "no-answer" ? (
            <PhoneOff className="h-3.5 w-3.5" style={{ color: "#f87171" }} />
          ) : (
            <Phone className="h-3.5 w-3.5" style={{ color: theme.accent }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {recording.direction === "outbound" ? "Outbound call" : "Inbound call"}
            </span>
            {isComplete && <SentimentIcon sentiment={recording.sentiment} />}
            {isAnalyzing && <Loader2 className="h-3 w-3 animate-spin" style={{ color: theme.accent }} />}
          </div>
          <div className="flex items-center gap-2 text-[12px] mt-0.5" style={{ color: theme.textMuted }}>
            <span>{formatDate(recording.createdAt)}</span>
            {recording.duration && (
              <>
                <span style={{ color: withAlpha(theme.text, 0.2) }}>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(recording.duration)}
                </span>
              </>
            )}
            {isComplete && recording.sentiment && (
              <>
                <span style={{ color: withAlpha(theme.text, 0.2) }}>·</span>
                <span
                  className="capitalize flex items-center gap-1 relative group cursor-help"
                  style={{ color: sentimentColor(recording.sentiment) }}
                >
                  {recording.sentiment}
                  <Info className="h-3 w-3 opacity-50" />
                  <span
                    className="absolute top-full right-0 mt-2 px-3 py-2 rounded-lg text-[11px] leading-tight normal-case w-52 text-left opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
                    style={{
                      backgroundColor: theme.surface,
                      color: theme.textSoft,
                      border: `1px solid ${withAlpha(theme.text, 0.1)}`,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    }}
                  >
                    {sentimentDescription(recording.sentiment)}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{ color: theme.textMuted }}>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: `1px solid ${withAlpha(theme.text, 0.06)}` }}>
          {/* Audio Player */}
          {recording.recordingUrl && recording.status === "completed" && (
            <AudioPlayer recordingId={recording.id} theme={theme} />
          )}

          {/* Summary */}
          {recording.summary && (
            <div className="pt-3">
              <p className="text-sm leading-relaxed" style={{ color: theme.textSoft }}>
                {recording.summary}
              </p>
            </div>
          )}

          {/* Analysis pending */}
          {isAnalyzing && (
            <div className="pt-3 flex items-center gap-2 text-sm" style={{ color: theme.textMuted }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              {recording.analysisStatus === "transcribing" ? "Transcribing..." : "Analyzing with AI..."}
            </div>
          )}

          {isFailed && (
            <div className="pt-3 flex items-center gap-2 text-sm" style={{ color: "#f87171" }}>
              <AlertCircle className="h-4 w-4" />
              Analysis failed
            </div>
          )}

          {isComplete && (
            <>
              {/* Talk-Listen Ratio */}
              {recording.talkListenRatio != null && (
                <TalkListenBar ratio={recording.talkListenRatio} theme={theme} />
              )}

              {/* Key Topics */}
              {recording.keyTopics && recording.keyTopics.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
                    Key Topics
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {recording.keyTopics.map((topic, i) => (
                      <span
                        key={i}
                        className="text-[12px] px-2.5 py-1 rounded-full"
                        style={{
                          backgroundColor: withAlpha(theme.accent, 0.12),
                          color: theme.accent,
                        }}
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Objections */}
              {recording.objections && recording.objections.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
                    Objections
                  </h4>
                  <div className="space-y-2">
                    {recording.objections.map((obj, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm"
                        style={{ color: theme.textSoft }}
                      >
                        {obj.resolved ? (
                          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
                        ) : (
                          <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                        )}
                        <div>
                          <p className="font-medium">{obj.objection}</p>
                          {obj.response && (
                            <p className="text-[12px] mt-0.5" style={{ color: theme.textMuted }}>
                              Response: {obj.response}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {recording.actionItems && recording.actionItems.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
                    Action Items
                  </h4>
                  <ul className="space-y-1">
                    {recording.actionItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: theme.textSoft }}>
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: theme.accent }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Transcript (collapsed by default) */}
              {recording.transcript && <TranscriptSection transcript={recording.transcript} theme={theme} />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TranscriptSection({
  transcript,
  theme,
}: {
  transcript: string;
  theme: ReturnType<typeof useColonyTheme>["theme"];
}) {
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <div>
      <button
        onClick={() => setShowTranscript(!showTranscript)}
        className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 transition-colors"
        style={{ color: theme.textMuted }}
      >
        {showTranscript ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        Full Transcript
      </button>
      {showTranscript && (
        <div
          className="mt-2 p-3 rounded-lg text-[13px] leading-relaxed max-h-[300px] overflow-y-auto"
          style={{
            backgroundColor: withAlpha(theme.text, 0.04),
            color: theme.textSoft,
            whiteSpace: "pre-wrap",
          }}
        >
          {transcript}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Panel
// ============================================================================

export function CallRecordingsPanel({ contactId }: { contactId: string }) {
  const { theme } = useColonyTheme();
  const [recordings, setRecordings] = useState<CallRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecordings = useCallback(async () => {
    try {
      const res = await fetch(`/api/calls/recordings?contactId=${contactId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRecordings(data.recordings || []);
      setError(null);
    } catch {
      setError("Failed to load recordings");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchRecordings();
    // Poll for updates if any recordings are still processing
    const interval = setInterval(() => {
      setRecordings((prev) => {
        const hasProcessing = prev.some(
          (r) => r.analysisStatus === "pending" || r.analysisStatus === "transcribing" || r.analysisStatus === "analyzing"
        );
        if (hasProcessing) fetchRecordings();
        return prev;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchRecordings]);

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: theme.textMuted }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
        <button
          onClick={fetchRecordings}
          className="mt-2 text-xs flex items-center gap-1 mx-auto transition-colors"
          style={{ color: theme.textMuted }}
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="py-8 text-center">
        <Phone className="h-8 w-8 mx-auto mb-2" style={{ color: withAlpha(theme.text, 0.15) }} />
        <p className="text-sm" style={{ color: theme.textMuted }}>
          No call recordings yet
        </p>
        <p className="text-xs mt-1" style={{ color: withAlpha(theme.text, 0.3) }}>
          Calls made through Colony will be automatically recorded and analyzed
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recordings.map((rec) => (
        <RecordingCard key={rec.id} recording={rec} />
      ))}
    </div>
  );
}
