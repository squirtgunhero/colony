"use client";

import { useState, useEffect, useCallback } from "react";
import { useDialer } from "@/hooks/useDialer";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  SkipForward,
  X,
  Loader2,
  ChevronRight,
  Voicemail,
  CheckCircle2,
  MessageSquare,
  Clock,
  User,
  Tag,
  Sparkles,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface ContactBriefing {
  contact: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    type: string;
    tags: string[];
    source: string | null;
    leadScore: number | null;
    leadGrade: string | null;
    lastContactedAt: string | null;
  };
  activities: {
    id: string;
    type: string;
    title: string;
    description: string | null;
    createdAt: string;
  }[];
  recentCalls: {
    id: string;
    status: string;
    outcome: string | null;
    duration: number | null;
    notes: string | null;
    createdAt: string;
  }[];
  deals: {
    id: string;
    title: string;
    value: number | null;
    stage: string;
  }[];
  briefing: string;
}

interface QueueEntry {
  contactId: string;
  contactName: string;
  contactPhone: string;
}

interface Props {
  callListId: string;
  callListName: string;
  onExit: () => void;
}

type SessionPhase = "loading" | "pre-call" | "calling" | "post-call" | "complete";

const OUTCOMES = [
  { value: "interested", label: "Interested", color: "#22c55e" },
  { value: "not_interested", label: "Not Interested", color: "#ef4444" },
  { value: "callback_requested", label: "Callback Requested", color: "#3b82f6" },
  { value: "left_voicemail", label: "Voicemail Left", color: "#eab308" },
  { value: "no_answer", label: "No Answer", color: "#6b7280" },
  { value: "wrong_number", label: "Wrong Number", color: "#ef4444" },
  { value: "busy", label: "Busy", color: "#6b7280" },
];

// ============================================================================
// Component
// ============================================================================

export function DialingSession({ callListId, callListName, onExit }: Props) {
  const { theme } = useColonyTheme();
  const dialer = useDialer();

  const [phase, setPhase] = useState<SessionPhase>("loading");
  const [briefing, setBriefing] = useState<ContactBriefing | null>(null);
  const [progress, setProgress] = useState({ total: 0, completed: 0, remaining: 0 });
  const [upNext, setUpNext] = useState<QueueEntry[]>([]);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [currentEntryContactId, setCurrentEntryContactId] = useState<string | null>(null);

  const borderColor = withAlpha(theme.text, 0.06);

  // Fetch next contact in queue
  const loadNext = useCallback(async () => {
    setPhase("loading");
    setBriefing(null);
    setSelectedOutcome(null);
    setNoteText("");

    try {
      const res = await fetch(`/api/dialer/call-lists/${callListId}/next`);
      const data = await res.json();

      if (data.done) {
        setPhase("complete");
        return;
      }

      setProgress(data.progress);
      setCurrentEntryContactId(data.entry.contact?.id || null);

      // Fetch briefing for this contact
      if (data.entry.contact?.id) {
        const briefRes = await fetch(`/api/dialer/briefing?contactId=${data.entry.contact.id}`);
        if (briefRes.ok) {
          const briefData = await briefRes.json();
          setBriefing(briefData);
        }
      }

      // Store name/phone for the current contact
      setUpNext([]);
      setPhase("pre-call");
    } catch (err) {
      console.error("Failed to load next contact:", err);
      setPhase("complete");
    }
  }, [callListId]);

  // Initial load
  useEffect(() => {
    loadNext();
  }, [loadNext]);

  // Watch for call state changes to transition phases
  useEffect(() => {
    if (phase === "calling" && dialer.callState === "disconnected") {
      setPhase("post-call");
    }
  }, [dialer.callState, phase]);

  const handleCall = useCallback(async () => {
    if (!briefing?.contact.phone) return;
    setPhase("calling");
    await dialer.call(
      briefing.contact.phone,
      briefing.contact.id,
      briefing.contact.name,
      callListId
    );
  }, [briefing, dialer, callListId]);

  const handleSkip = useCallback(async () => {
    if (!currentEntryContactId) return;
    // Mark entry as skipped directly on the call list
    await fetch(`/api/dialer/call-lists/${callListId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: currentEntryContactId,
        action: "complete",
        outcome: "skipped",
      }),
    });
    loadNext();
  }, [currentEntryContactId, callListId, loadNext]);

  const handleSaveAndNext = useCallback(async () => {
    // Save outcome and notes on the call record
    if (dialer.currentCallId) {
      if (selectedOutcome) await dialer.setOutcome(selectedOutcome);
      if (noteText) await dialer.setNotes(noteText);
    }
    // Always mark the call list entry as complete
    if (currentEntryContactId) {
      await fetch(`/api/dialer/call-lists/${callListId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: currentEntryContactId,
          action: "complete",
          outcome: selectedOutcome || "connected",
          notes: noteText || null,
        }),
      });
    }
    loadNext();
  }, [dialer, selectedOutcome, noteText, currentEntryContactId, callListId, loadNext]);

  const handleSaveAndEnd = useCallback(async () => {
    if (dialer.currentCallId) {
      if (selectedOutcome) await dialer.setOutcome(selectedOutcome);
      if (noteText) await dialer.setNotes(noteText);
    }
    if (currentEntryContactId) {
      await fetch(`/api/dialer/call-lists/${callListId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: currentEntryContactId,
          action: "complete",
          outcome: selectedOutcome || "connected",
          notes: noteText || null,
        }),
      });
    }
    onExit();
  }, [dialer, selectedOutcome, noteText, currentEntryContactId, callListId, onExit]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-5">
      {/* Session header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-[13px] font-medium transition-opacity hover:opacity-70"
          style={{ color: withAlpha(theme.text, 0.5) }}
        >
          <X className="h-3.5 w-3.5" />
          Exit Session
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium" style={{ color: theme.text }}>
            {callListName}
          </span>
          <span
            className="text-[12px] px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: withAlpha(theme.accent, 0.1),
              color: theme.accent,
            }}
          >
            {progress.remaining} of {progress.total} remaining
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: withAlpha(theme.text, 0.06) }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: progress.total > 0 ? `${((progress.total - progress.remaining) / progress.total) * 100}%` : "0%",
            backgroundColor: theme.accent,
          }}
        />
      </div>

      {/* ================================================================ */}
      {/* LOADING */}
      {/* ================================================================ */}
      {phase === "loading" && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin mb-3" style={{ color: theme.accent }} />
          <p className="text-[13px]" style={{ color: withAlpha(theme.text, 0.4) }}>
            Loading next contact...
          </p>
        </div>
      )}

      {/* ================================================================ */}
      {/* PRE-CALL */}
      {/* ================================================================ */}
      {phase === "pre-call" && briefing && (
        <div className="space-y-4">
          {/* Contact card */}
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{
              backgroundColor: withAlpha(theme.text, 0.02),
              border: `1px solid ${borderColor}`,
            }}
          >
            {/* Name + meta */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[22px] font-semibold" style={{ color: theme.text }}>
                  {briefing.contact.name}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[12px] capitalize" style={{ color: withAlpha(theme.text, 0.5) }}>
                    <User className="h-3 w-3" />
                    {briefing.contact.type}
                  </span>
                  {briefing.contact.source && (
                    <span className="flex items-center gap-1 text-[12px]" style={{ color: withAlpha(theme.text, 0.5) }}>
                      <Tag className="h-3 w-3" />
                      {briefing.contact.source.replace(/_/g, " ")}
                    </span>
                  )}
                  {briefing.contact.leadGrade && (
                    <span
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: withAlpha(theme.accent, 0.12),
                        color: theme.accent,
                      }}
                    >
                      {briefing.contact.leadGrade}
                    </span>
                  )}
                </div>
                <p className="text-[14px] mt-1 font-mono" style={{ color: withAlpha(theme.text, 0.6) }}>
                  {briefing.contact.phone}
                </p>
              </div>
            </div>

            {/* Tara's briefing */}
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: withAlpha(theme.accent, 0.04),
                border: `1px solid ${withAlpha(theme.accent, 0.1)}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5" style={{ color: theme.accent }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.accent }}>
                  Briefing
                </span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: withAlpha(theme.text, 0.7) }}>
                {briefing.briefing}
              </p>
            </div>

            {/* Recent activity */}
            {briefing.activities.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: withAlpha(theme.text, 0.35) }}>
                  Recent Activity
                </p>
                <div className="space-y-1.5">
                  {briefing.activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2">
                      <div
                        className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: withAlpha(theme.text, 0.2) }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] truncate" style={{ color: withAlpha(theme.text, 0.6) }}>
                          {activity.title}
                        </p>
                      </div>
                      <span className="text-[10px] shrink-0" style={{ color: withAlpha(theme.text, 0.3) }}>
                        {formatRelativeDate(activity.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Open deals */}
            {briefing.deals.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: withAlpha(theme.text, 0.35) }}>
                  Open Deals
                </p>
                <div className="space-y-1">
                  {briefing.deals.map((deal) => (
                    <div key={deal.id} className="flex items-center justify-between">
                      <span className="text-[12px]" style={{ color: withAlpha(theme.text, 0.6) }}>
                        {deal.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] capitalize" style={{ color: withAlpha(theme.text, 0.4) }}>
                          {deal.stage}
                        </span>
                        {deal.value && (
                          <span className="text-[11px] font-medium" style={{ color: theme.accent }}>
                            ${deal.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCall}
              className="flex-1 h-12 rounded-xl text-[15px] font-semibold transition-all hover:brightness-110 flex items-center justify-center gap-2"
              style={{ backgroundColor: "#22c55e", color: "white" }}
            >
              <Phone className="h-5 w-5" />
              Call Now
            </button>
            <button
              onClick={handleSkip}
              className="h-12 px-5 rounded-xl text-[13px] font-medium transition-colors flex items-center gap-2"
              style={{
                backgroundColor: withAlpha(theme.text, 0.06),
                color: withAlpha(theme.text, 0.5),
                border: `1px solid ${borderColor}`,
              }}
            >
              <SkipForward className="h-4 w-4" />
              Skip
            </button>
          </div>

          {/* Up next preview */}
          {upNext.length > 0 && (
            <div className="pt-2 space-y-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: withAlpha(theme.text, 0.3) }}>
                Up Next
              </p>
              {upNext.map((entry) => (
                <div key={entry.contactId} className="flex items-center gap-2">
                  <ChevronRight className="h-3 w-3" style={{ color: withAlpha(theme.text, 0.2) }} />
                  <span className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
                    {entry.contactName} &middot; {entry.contactPhone}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* ACTIVE CALL */}
      {/* ================================================================ */}
      {phase === "calling" && briefing && (
        <div className="space-y-5">
          {/* Call status */}
          <div
            className="rounded-2xl p-8 text-center space-y-4"
            style={{
              backgroundColor: withAlpha(theme.text, 0.02),
              border: `1px solid ${borderColor}`,
            }}
          >
            <h2 className="text-[20px] font-semibold" style={{ color: theme.text }}>
              {briefing.contact.name}
            </h2>
            <p className="text-[14px] font-mono" style={{ color: withAlpha(theme.text, 0.5) }}>
              {briefing.contact.phone}
            </p>

            {/* Status indicator */}
            <div className="flex items-center justify-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full animate-pulse"
                style={{
                  backgroundColor:
                    dialer.callState === "connected" ? "#22c55e"
                    : dialer.callState === "ringing" ? "#eab308"
                    : theme.accent,
                }}
              />
              <span className="text-[14px] uppercase tracking-wider font-medium" style={{
                color: dialer.callState === "connected" ? "#22c55e"
                  : dialer.callState === "ringing" ? "#eab308"
                  : withAlpha(theme.text, 0.5),
              }}>
                {dialer.callState === "connecting" && "Connecting..."}
                {dialer.callState === "ringing" && "Ringing..."}
                {dialer.callState === "connected" && "Connected"}
              </span>
            </div>

            {/* Timer */}
            {dialer.callState === "connected" && (
              <p className="text-[32px] font-mono font-light tabular-nums" style={{ color: theme.text }}>
                {formatDuration(dialer.callDuration)}
              </p>
            )}

            {/* Call controls */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={dialer.toggleMute}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: dialer.isMuted
                      ? withAlpha("#ef4444", 0.2)
                      : withAlpha(theme.text, 0.08),
                  }}
                >
                  {dialer.isMuted ? (
                    <MicOff className="h-5 w-5" style={{ color: "#ef4444" }} />
                  ) : (
                    <Mic className="h-5 w-5" style={{ color: withAlpha(theme.text, 0.6) }} />
                  )}
                </div>
                <span className="text-[10px]" style={{ color: withAlpha(theme.text, 0.4) }}>
                  {dialer.isMuted ? "Unmute" : "Mute"}
                </span>
              </button>

              <button className="flex flex-col items-center gap-1">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: withAlpha(theme.text, 0.08) }}
                >
                  <Voicemail className="h-5 w-5" style={{ color: withAlpha(theme.text, 0.6) }} />
                </div>
                <span className="text-[10px]" style={{ color: withAlpha(theme.text, 0.4) }}>VM Drop</span>
              </button>

              <button
                onClick={dialer.hangup}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#ef4444" }}
                >
                  <PhoneOff className="h-6 w-6" style={{ color: "white" }} />
                </div>
                <span className="text-[10px]" style={{ color: withAlpha(theme.text, 0.4) }}>End</span>
              </button>
            </div>
          </div>

          {/* Quick notes during call */}
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: withAlpha(theme.text, 0.02),
              border: `1px solid ${borderColor}`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-3.5 w-3.5" style={{ color: withAlpha(theme.text, 0.3) }} />
              <span className="text-[11px] uppercase tracking-wider" style={{ color: withAlpha(theme.text, 0.35) }}>
                Live Notes
              </span>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Type notes during the call..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-[13px] resize-none focus:outline-none"
              style={{
                backgroundColor: withAlpha(theme.text, 0.04),
                border: `1px solid ${withAlpha(theme.text, 0.06)}`,
                color: theme.text,
              }}
            />
          </div>

          {/* Briefing sidebar (collapsed) */}
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: withAlpha(theme.accent, 0.03),
              border: `1px solid ${withAlpha(theme.accent, 0.08)}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3 w-3" style={{ color: theme.accent }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.accent }}>
                Briefing
              </span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: withAlpha(theme.text, 0.5) }}>
              {briefing.briefing}
            </p>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* POST-CALL DISPOSITION */}
      {/* ================================================================ */}
      {phase === "post-call" && briefing && (
        <div className="space-y-5">
          {/* Call summary header */}
          <div className="text-center py-2">
            <p className="text-[13px] font-medium" style={{ color: withAlpha(theme.text, 0.5) }}>
              Call Complete
            </p>
            <h2 className="text-[20px] font-semibold mt-1" style={{ color: theme.text }}>
              {briefing.contact.name}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Clock className="h-3 w-3" style={{ color: withAlpha(theme.text, 0.3) }} />
              <span className="text-[13px] font-mono" style={{ color: withAlpha(theme.text, 0.4) }}>
                {formatDuration(dialer.callDuration)}
              </span>
            </div>
          </div>

          {/* Outcome selection */}
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{
              backgroundColor: withAlpha(theme.text, 0.02),
              border: `1px solid ${borderColor}`,
            }}
          >
            <p className="text-[11px] uppercase tracking-wider font-medium" style={{ color: withAlpha(theme.text, 0.4) }}>
              Outcome
            </p>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map((o) => {
                const isSelected = selectedOutcome === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => setSelectedOutcome(o.value)}
                    className="h-10 rounded-lg text-[12px] font-medium transition-all flex items-center justify-center gap-1.5"
                    style={{
                      backgroundColor: isSelected
                        ? withAlpha(o.color, 0.15)
                        : withAlpha(theme.text, 0.04),
                      color: isSelected ? o.color : withAlpha(theme.text, 0.5),
                      border: isSelected
                        ? `1.5px solid ${withAlpha(o.color, 0.3)}`
                        : `1px solid ${withAlpha(theme.text, 0.06)}`,
                    }}
                  >
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {o.label}
                  </button>
                );
              })}
            </div>

            {/* Notes */}
            <div>
              <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: withAlpha(theme.text, 0.4) }}>
                Notes
              </p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Call notes..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-[13px] resize-none focus:outline-none"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.04),
                  border: `1px solid ${withAlpha(theme.text, 0.06)}`,
                  color: theme.text,
                }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAndNext}
              className="flex-1 h-12 rounded-xl text-[14px] font-semibold transition-all hover:brightness-110 flex items-center justify-center gap-2"
              style={{ backgroundColor: theme.accent, color: theme.bg }}
            >
              Save & Next Contact
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleSaveAndEnd}
              className="h-12 px-5 rounded-xl text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: withAlpha(theme.text, 0.06),
                color: withAlpha(theme.text, 0.5),
                border: `1px solid ${borderColor}`,
              }}
            >
              Save & End
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SESSION COMPLETE */}
      {/* ================================================================ */}
      {phase === "complete" && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: withAlpha("#22c55e", 0.12) }}
          >
            <CheckCircle2 className="h-8 w-8" style={{ color: "#22c55e" }} />
          </div>
          <h2 className="text-[20px] font-semibold" style={{ color: theme.text }}>
            List Complete
          </h2>
          <p className="text-[13px]" style={{ color: withAlpha(theme.text, 0.4) }}>
            You&apos;ve called through all contacts in {callListName}.
          </p>
          <button
            onClick={onExit}
            className="h-10 px-6 rounded-xl text-[13px] font-medium transition-colors"
            style={{ backgroundColor: theme.accent, color: theme.bg }}
          >
            Back to Dialer
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
