"use client";

import { useState } from "react";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Phone,
  ArrowLeft,
  BotMessageSquare,
  CalendarCheck,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

interface CallRecord {
  id: string;
  direction: string;
  status: string;
  outcome: string | null;
  fromNumber: string;
  toNumber: string;
  duration: number | null;
  notes: string | null;
  isVoiceAI: boolean;
  aiObjective: string | null;
  aiSummary: string | null;
  appointmentSet: boolean;
  createdAt: string;
  contact: { id: string; name: string; phone: string | null; type: string } | null;
  callList: { id: string; name: string } | null;
}

interface Props {
  calls: CallRecord[];
}

const outcomeColors: Record<string, string> = {
  interested: "#22c55e",
  connected: "#22c55e",
  left_voicemail: "#eab308",
  callback_requested: "#3b82f6",
  no_answer: "#6b7280",
  busy: "#6b7280",
  not_interested: "#ef4444",
  wrong_number: "#ef4444",
  dnc: "#ef4444",
};

const statusLabels: Record<string, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  initiated: "Initiated",
  ringing: "Ringing",
  busy: "Busy",
  no_answer: "No Answer",
  failed: "Failed",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDateTime(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function CallHistoryPage({ calls }: Props) {
  const { theme } = useColonyTheme();
  const borderColor = withAlpha(theme.text, 0.06);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = calls.filter((call) => {
    const matchesSearch =
      !search ||
      call.contact?.name.toLowerCase().includes(search.toLowerCase()) ||
      call.toNumber.includes(search);
    const matchesOutcome =
      outcomeFilter === "all" || call.outcome === outcomeFilter;
    const matchesMode =
      modeFilter === "all" ||
      (modeFilter === "ai" && call.isVoiceAI) ||
      (modeFilter === "manual" && !call.isVoiceAI);
    return matchesSearch && matchesOutcome && matchesMode;
  });

  const inputStyle: React.CSSProperties = {
    backgroundColor: withAlpha(theme.text, 0.04),
    border: `1px solid ${borderColor}`,
    color: theme.text,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Call History"
        subtitle="All calls made by you and Voice AI"
        icon={Phone}
        overline="Dialer"
        actions={
          <Link
            href="/browse/dialer"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-all duration-150 hover:opacity-90"
            style={{
              backgroundColor: withAlpha(theme.text, 0.06),
              color: withAlpha(theme.text, 0.7),
              border: `1px solid ${withAlpha(theme.text, 0.08)}`,
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
            style={{ color: withAlpha(theme.text, 0.3) }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or number..."
            className="w-full h-9 pl-8 pr-3 rounded-lg text-[12px] outline-none"
            style={inputStyle}
          />
        </div>

        <select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
          className="h-9 px-3 rounded-lg text-[12px] outline-none"
          style={inputStyle}
        >
          <option value="all">All Outcomes</option>
          <option value="interested">Interested</option>
          <option value="not_interested">Not Interested</option>
          <option value="callback_requested">Callback</option>
          <option value="left_voicemail">Voicemail</option>
          <option value="no_answer">No Answer</option>
          <option value="busy">Busy</option>
          <option value="wrong_number">Wrong Number</option>
        </select>

        <div
          className="inline-flex rounded-lg p-0.5"
          style={{ backgroundColor: withAlpha(theme.text, 0.05) }}
        >
          {[
            { value: "all", label: "All" },
            { value: "manual", label: "Manual" },
            { value: "ai", label: "AI" },
          ].map((m) => (
            <button
              key={m.value}
              onClick={() => setModeFilter(m.value)}
              className="h-8 px-3 rounded-md text-[11px] font-medium transition-all"
              style={{
                backgroundColor: modeFilter === m.value ? withAlpha(theme.text, 0.1) : "transparent",
                color: modeFilter === m.value ? theme.text : withAlpha(theme.text, 0.45),
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <span className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
          {filtered.length} calls
        </span>
      </div>

      {/* Call list */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${borderColor}` }}
      >
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Phone className="h-8 w-8 mx-auto mb-2" style={{ color: withAlpha(theme.text, 0.15) }} />
            <p className="text-[13px]" style={{ color: withAlpha(theme.text, 0.4) }}>
              No calls found
            </p>
          </div>
        ) : (
          filtered.map((call, i) => {
            const isExpanded = expandedId === call.id;
            return (
              <div key={call.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : call.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors"
                  style={{
                    borderBottom: `0.5px solid ${borderColor}`,
                    backgroundColor: isExpanded ? withAlpha(theme.text, 0.02) : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.02);
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {/* Status dot */}
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: call.outcome
                        ? outcomeColors[call.outcome] || "#6b7280"
                        : "#6b7280",
                    }}
                  />

                  {/* Mode icon */}
                  {call.isVoiceAI ? (
                    <BotMessageSquare className="h-4 w-4 shrink-0" style={{ color: "#bf5af2" }} />
                  ) : (
                    <Phone className="h-4 w-4 shrink-0" style={{ color: withAlpha(theme.text, 0.3) }} />
                  )}

                  {/* Contact */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium truncate" style={{ color: theme.text }}>
                        {call.contact?.name || call.toNumber}
                      </p>
                      {call.appointmentSet && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ backgroundColor: withAlpha("#22c55e", 0.12), color: "#22c55e" }}
                        >
                          <CalendarCheck className="h-2.5 w-2.5" />
                          Appt
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] capitalize" style={{ color: withAlpha(theme.text, 0.4) }}>
                        {call.outcome?.replace(/_/g, " ") || statusLabels[call.status] || call.status}
                      </span>
                      {call.callList && (
                        <span className="text-[10px]" style={{ color: withAlpha(theme.text, 0.3) }}>
                          &middot; {call.callList.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Duration + time */}
                  <div className="text-right shrink-0 flex items-center gap-3">
                    {call.duration != null && call.duration > 0 && (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: withAlpha(theme.text, 0.35) }}>
                        <Clock className="h-3 w-3" />
                        {formatDuration(call.duration)}
                      </span>
                    )}
                    <span className="text-[12px] w-28 text-right" style={{ color: withAlpha(theme.text, 0.4) }}>
                      {formatDateTime(call.createdAt)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" style={{ color: withAlpha(theme.text, 0.3) }} />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" style={{ color: withAlpha(theme.text, 0.3) }} />
                    )}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div
                    className="px-5 py-4 space-y-3"
                    style={{
                      backgroundColor: withAlpha(theme.text, 0.015),
                      borderBottom: `0.5px solid ${borderColor}`,
                    }}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: withAlpha(theme.text, 0.4) }}>Status</p>
                        <p className="text-[12px] capitalize" style={{ color: theme.text }}>{statusLabels[call.status] || call.status}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: withAlpha(theme.text, 0.4) }}>Mode</p>
                        <p className="text-[12px]" style={{ color: theme.text }}>{call.isVoiceAI ? `AI — ${call.aiObjective || "unknown"}` : "Manual"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: withAlpha(theme.text, 0.4) }}>Number</p>
                        <p className="text-[12px]" style={{ color: theme.text }}>{call.toNumber}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: withAlpha(theme.text, 0.4) }}>Duration</p>
                        <p className="text-[12px]" style={{ color: theme.text }}>{formatDuration(call.duration)}</p>
                      </div>
                    </div>

                    {call.aiSummary && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: withAlpha(theme.text, 0.4) }}>AI Summary</p>
                        <p className="text-[12px] leading-relaxed" style={{ color: withAlpha(theme.text, 0.7) }}>{call.aiSummary}</p>
                      </div>
                    )}

                    {call.notes && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: withAlpha(theme.text, 0.4) }}>Notes</p>
                        <p className="text-[12px] leading-relaxed" style={{ color: withAlpha(theme.text, 0.7) }}>{call.notes}</p>
                      </div>
                    )}

                    {call.contact && (
                      <div className="pt-1">
                        <Link
                          href={`/browse/people/${call.contact.id}`}
                          className="text-[12px] font-medium transition-opacity hover:opacity-70"
                          style={{ color: theme.accent }}
                        >
                          View Contact →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
