"use client";

import { useState, useCallback, useEffect } from "react";
import { useDialer } from "@/hooks/useDialer";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  X,
  ChevronDown,
  ChevronUp,
  Voicemail,
  Search,
} from "lucide-react";

const OUTCOMES = [
  { value: "connected", label: "Connected" },
  { value: "left_voicemail", label: "Left VM" },
  { value: "no_answer", label: "No Answer" },
  { value: "busy", label: "Busy" },
  { value: "wrong_number", label: "Wrong #" },
  { value: "callback_requested", label: "Callback" },
  { value: "not_interested", label: "Not Interested" },
  { value: "interested", label: "Interested" },
];

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function DialerPanel() {
  const {
    callState,
    isMuted,
    callDuration,
    currentContactName,
    currentNumber,
    currentCallId,
    hangup,
    toggleMute,
    sendDtmf,
    setOutcome,
    setNotes,
    call,
    isReady,
  } = useDialer();

  const { theme } = useColonyTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [manualNumber, setManualNumber] = useState("");
  const [noteText, setNoteText] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; phone: string }[]>([]);

  const borderColor = withAlpha(theme.text, 0.1);
  const isActive = callState !== "idle" && callState !== "disconnected";
  const isPostCall = callState === "disconnected";

  // Show panel when a call is active or post-call
  useEffect(() => {
    if (isActive || isPostCall) {
      setShowPanel(true);
      setIsExpanded(true);
    }
  }, [isActive, isPostCall]);

  // Contact search (debounced)
  useEffect(() => {
    if (!contactSearch || contactSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(contactSearch)}&hasPhone=true&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(
            (data.contacts || data || [])
              .filter((c: { phone?: string | null }) => c.phone)
              .map((c: { id: string; name: string; phone: string }) => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
              }))
          );
        }
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [contactSearch]);

  // Save notes on change (debounced)
  useEffect(() => {
    if (!currentCallId || !noteText) return;
    const timeout = setTimeout(() => {
      setNotes(noteText);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [noteText, currentCallId, setNotes]);

  const handleOutcome = useCallback(
    (outcome: string) => {
      setSelectedOutcome(outcome);
      setOutcome(outcome);
    },
    [setOutcome]
  );

  const handleDone = useCallback(() => {
    setShowPanel(false);
    setIsExpanded(false);
    setNoteText("");
    setSelectedOutcome(null);
    setManualNumber("");
  }, []);

  const handleManualCall = useCallback(() => {
    if (!manualNumber) return;
    call(manualNumber);
  }, [manualNumber, call]);

  // Don't render if dialer isn't ready and no active call
  if (!isReady && !showPanel) return null;

  // Minimized state — just a small phone pill
  if (!showPanel) {
    return (
      <button
        onClick={() => { setShowPanel(true); setIsExpanded(true); }}
        className="fixed bottom-20 right-6 z-50 flex items-center gap-2 h-10 px-4 rounded-full transition-all shadow-lg"
        style={{
          backgroundColor: theme.accent,
          color: theme.bg,
        }}
        title="Open Dialer"
      >
        <Phone className="h-4 w-4" />
        <span className="text-[13px] font-medium">Dialer</span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 rounded-2xl shadow-2xl overflow-hidden transition-all"
      style={{
        width: isExpanded ? 340 : 280,
        backgroundColor: theme.sidebarBg || theme.bg,
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between h-11 px-4"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5" style={{ color: theme.accent }} />
          <span className="text-[13px] font-medium" style={{ color: theme.text }}>
            {isActive ? (currentContactName || currentNumber || "Calling...") : "Dialer"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isActive && (
            <span
              className="text-[12px] font-mono tabular-nums"
              style={{ color: theme.accent }}
            >
              {formatDuration(callDuration)}
            </span>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-white/5"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" style={{ color: withAlpha(theme.text, 0.5) }} />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" style={{ color: withAlpha(theme.text, 0.5) }} />
            )}
          </button>
          {!isActive && !isPostCall && (
            <button onClick={handleDone} className="p-1 rounded hover:bg-white/5">
              <X className="h-3.5 w-3.5" style={{ color: withAlpha(theme.text, 0.5) }} />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Call status indicator */}
          {isActive && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div
                className="h-2 w-2 rounded-full animate-pulse"
                style={{
                  backgroundColor:
                    callState === "connected"
                      ? "#22c55e"
                      : callState === "ringing"
                      ? "#eab308"
                      : theme.accent,
                }}
              />
              <span className="text-[12px] uppercase tracking-wider" style={{ color: withAlpha(theme.text, 0.5) }}>
                {callState === "connecting" && "Connecting..."}
                {callState === "ringing" && "Ringing..."}
                {callState === "connected" && "Connected"}
              </span>
            </div>
          )}

          {/* Contact info */}
          {(isActive || isPostCall) && (
            <div className="text-center py-1">
              <p className="text-[15px] font-medium" style={{ color: theme.text }}>
                {currentContactName || "Unknown"}
              </p>
              <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
                {currentNumber}
              </p>
            </div>
          )}

          {/* Manual dialer (when idle) */}
          {!isActive && !isPostCall && (
            <div className="space-y-2">
              {/* Contact search */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
                  style={{ color: withAlpha(theme.text, 0.3) }}
                />
                <input
                  value={contactSearch}
                  onChange={(e) => {
                    setContactSearch(e.target.value);
                    setManualNumber("");
                  }}
                  placeholder="Search contacts..."
                  className="w-full h-9 pl-8 pr-3 rounded-lg text-[13px] focus:outline-none"
                  style={{
                    backgroundColor: withAlpha(theme.text, 0.05),
                    border: `1px solid ${withAlpha(theme.text, 0.08)}`,
                    color: theme.text,
                  }}
                />
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${withAlpha(theme.text, 0.08)}` }}
                >
                  {searchResults.map((c, i) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        call(c.phone, c.id, c.name);
                        setContactSearch("");
                        setSearchResults([]);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
                      style={{
                        borderBottom: i < searchResults.length - 1 ? `1px solid ${withAlpha(theme.text, 0.05)}` : undefined,
                      }}
                    >
                      <Phone className="h-3 w-3 shrink-0" style={{ color: "#22c55e" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate" style={{ color: theme.text }}>{c.name}</p>
                        <p className="text-[10px]" style={{ color: withAlpha(theme.text, 0.4) }}>{c.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Manual number input */}
              <input
                type="tel"
                value={manualNumber}
                onChange={(e) => setManualNumber(e.target.value)}
                placeholder="Or enter number..."
                className="w-full h-9 px-3 rounded-lg text-[13px] focus:outline-none"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.05),
                  border: `1px solid ${withAlpha(theme.text, 0.08)}`,
                  color: theme.text,
                }}
                onKeyDown={(e) => e.key === "Enter" && handleManualCall()}
              />
              <button
                onClick={handleManualCall}
                disabled={!manualNumber}
                className="w-full h-9 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-30"
                style={{
                  backgroundColor: theme.accent,
                  color: theme.bg,
                }}
              >
                Call
              </button>
            </div>
          )}

          {/* Call controls */}
          {isActive && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={toggleMute}
                className="flex items-center justify-center h-10 w-10 rounded-full transition-colors"
                style={{
                  backgroundColor: isMuted
                    ? withAlpha("#ef4444", 0.2)
                    : withAlpha(theme.text, 0.08),
                }}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <MicOff className="h-4 w-4" style={{ color: "#ef4444" }} />
                ) : (
                  <Mic className="h-4 w-4" style={{ color: withAlpha(theme.text, 0.6) }} />
                )}
              </button>

              <button
                onClick={() => setShowKeypad(!showKeypad)}
                className="flex items-center justify-center h-10 w-10 rounded-full transition-colors"
                style={{
                  backgroundColor: showKeypad
                    ? withAlpha(theme.accent, 0.15)
                    : withAlpha(theme.text, 0.08),
                }}
                title="Keypad"
              >
                <span
                  className="text-[14px] font-bold"
                  style={{ color: showKeypad ? theme.accent : withAlpha(theme.text, 0.6) }}
                >
                  #
                </span>
              </button>

              <button
                onClick={() => {
                  setOutcome("left_voicemail");
                  hangup();
                }}
                className="flex items-center justify-center h-10 w-10 rounded-full transition-colors"
                style={{ backgroundColor: withAlpha(theme.text, 0.08) }}
                title="Leave voicemail & hang up"
              >
                <Voicemail className="h-4 w-4" style={{ color: withAlpha(theme.text, 0.6) }} />
              </button>

              <button
                onClick={hangup}
                className="flex items-center justify-center h-10 w-10 rounded-full transition-colors"
                style={{ backgroundColor: "#ef4444" }}
                title="Hang Up"
              >
                <PhoneOff className="h-4 w-4" style={{ color: "white" }} />
              </button>
            </div>
          )}

          {/* DTMF Keypad */}
          {isActive && showKeypad && (
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {KEYPAD_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => sendDtmf(key)}
                  className="h-10 rounded-lg text-[15px] font-medium transition-colors"
                  style={{
                    backgroundColor: withAlpha(theme.text, 0.06),
                    color: theme.text,
                  }}
                >
                  {key}
                </button>
              ))}
            </div>
          )}

          {/* Post-call: Outcome + Notes */}
          {isPostCall && (
            <>
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wider" style={{ color: withAlpha(theme.text, 0.35) }}>
                  Outcome
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {OUTCOMES.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => handleOutcome(o.value)}
                      className="h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors"
                      style={{
                        backgroundColor:
                          selectedOutcome === o.value
                            ? withAlpha(theme.accent, 0.2)
                            : withAlpha(theme.text, 0.06),
                        color:
                          selectedOutcome === o.value
                            ? theme.accent
                            : withAlpha(theme.text, 0.5),
                        border:
                          selectedOutcome === o.value
                            ? `1px solid ${withAlpha(theme.accent, 0.3)}`
                            : `1px solid transparent`,
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wider" style={{ color: withAlpha(theme.text, 0.35) }}>
                  Notes
                </p>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Call notes..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-[13px] resize-none focus:outline-none"
                  style={{
                    backgroundColor: withAlpha(theme.text, 0.05),
                    border: `1px solid ${withAlpha(theme.text, 0.08)}`,
                    color: theme.text,
                  }}
                />
              </div>

              <button
                onClick={handleDone}
                className="w-full h-9 rounded-lg text-[13px] font-medium transition-colors"
                style={{
                  backgroundColor: theme.accent,
                  color: theme.bg,
                }}
              >
                Done
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
