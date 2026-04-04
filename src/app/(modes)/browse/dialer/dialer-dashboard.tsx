"use client";

import { useState } from "react";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Phone,
  Clock,
  CheckCircle,
  Plus,
  ListChecks,
  BotMessageSquare,
  Mic,
  CalendarCheck,
  PhoneCall,
  Play,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { DialingSession } from "@/components/dialer/DialingSession";
import { TaraSession } from "@/components/dialer/TaraSession";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { CallActionQueue } from "@/components/dialer/CallActionQueue";

interface CallListItem {
  id: string;
  name: string;
  status: string;
  totalEntries: number;
  completedEntries: number;
}

interface RecentCall {
  id: string;
  status: string;
  outcome: string | null;
  toNumber: string;
  duration: number | null;
  createdAt: string;
  isVoiceAI: boolean;
  aiObjective: string | null;
  aiSummary: string | null;
  appointmentSet: boolean;
  leadQualified: boolean | null;
  contact: { id: string; name: string; phone: string | null } | null;
}

interface TodayStats {
  totalCalls: number;
  connectedCalls: number;
  totalDuration: number;
  voiceAICalls: number;
  appointmentsSet: number;
}

interface Props {
  callLists: CallListItem[];
  recentCalls: RecentCall[];
  todayStats: TodayStats;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const outcomeColors: Record<string, string> = {
  connected: "#30d158",
  interested: "#30d158",
  left_voicemail: "#ff9f0a",
  callback_requested: "#64d2ff",
  no_answer: "#98989d",
  busy: "#98989d",
  not_interested: "#ff453a",
  wrong_number: "#ff453a",
};

export function DialerDashboard({ callLists, recentCalls, todayStats }: Props) {
  const { theme } = useColonyTheme();
  const [activeSession, setActiveSession] = useState<{ id: string; name: string } | null>(null);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [taraSession, setTaraSession] = useState<{
    id: string;
    name: string;
    objective: "qualify" | "appointment" | "followup";
  } | null>(null);

  // When a dialing session is active, render the session UI instead
  if (activeSession) {
    return (
      <DialingSession
        callListId={activeSession.id}
        callListName={activeSession.name}
        onExit={() => setActiveSession(null)}
      />
    );
  }

  if (taraSession) {
    return (
      <TaraSession
        callListId={taraSession.id}
        callListName={taraSession.name}
        objective={taraSession.objective}
        onExit={() => setTaraSession(null)}
      />
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Power Dialer"
        subtitle="Call through your leads and let Voice AI qualify and set appointments"
        icon={Phone}
        actions={
          <ActionButton label="New Call List" icon={Plus} onClick={() => window.location.href = "/browse/dialer/lists"} />
        }
      />

      <StatGrid columns={5}>
        <StatCard label="Calls Today" value={todayStats.totalCalls} icon={Phone} />
        <StatCard label="Connected" value={todayStats.connectedCalls} icon={CheckCircle} color="#30d158" />
        <StatCard label="Talk Time" value={formatDuration(todayStats.totalDuration)} icon={Clock} />
        <StatCard label="AI Calls" value={todayStats.voiceAICalls} icon={BotMessageSquare} color="#bf5af2" />
        <StatCard label="Appointments" value={todayStats.appointmentsSet} icon={CalendarCheck} color="#ff9f0a" />
      </StatGrid>

      {/* Voice AI Panel */}
      <VoiceAIPanel
        callLists={callLists}
        onStartTara={(listId, listName, objective) =>
          setTaraSession({ id: listId, name: listName, objective })
        }
      />

      {/* Pending Actions Queue */}
      <CallActionQueue />

      {/* Call Lists */}
      <SectionCard
        title="Call Lists"
        actions={
          <Link
            href="/browse/dialer/lists"
            className="text-[12px] font-medium transition-opacity hover:opacity-70"
            style={{ color: withAlpha(theme.text, 0.4) }}
          >
            Manage
          </Link>
        }
      >
        {callLists.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No call lists yet"
            description="Create a call list to start power dialing through your contacts."
            action={
              <ActionButton
                label="Create Call List"
                icon={Plus}
                variant="secondary"
                onClick={() => window.location.href = "/browse/dialer/lists"}
              />
            }
          />
        ) : (
          <div className="space-y-1.5">
            {callLists.map((list) => {
              const progress = list.totalEntries > 0
                ? Math.round((list.completedEntries / list.totalEntries) * 100)
                : 0;
              return (
                <div
                  key={list.id}
                  className="flex items-center gap-4 rounded-xl p-3.5 transition-colors group"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.03)}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <Link href={`/browse/dialer/lists/${list.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <ListChecks
                      className="h-4 w-4 shrink-0"
                      style={{ color: withAlpha(theme.text, 0.3) }}
                      strokeWidth={1.5}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate" style={{ color: theme.text }}>
                        {list.name}
                      </p>
                      <p className="text-[12px] mt-0.5" style={{ color: withAlpha(theme.text, 0.4) }}>
                        {list.completedEntries} / {list.totalEntries} called
                      </p>
                    </div>
                    <div className="w-24 shrink-0">
                      <div
                        className="h-1 rounded-full overflow-hidden"
                        style={{ backgroundColor: withAlpha(theme.text, 0.06) }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: progress === 100 ? "#30d158" : theme.accent,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-right mt-1" style={{ color: withAlpha(theme.text, 0.3) }}>
                        {progress}%
                      </p>
                    </div>
                  </Link>
                  {progress < 100 && (
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setTaraSession({ id: list.id, name: list.name, objective: "qualify" })}
                        className="shrink-0 h-8 px-3 rounded-lg text-[11px] font-medium flex items-center gap-1.5"
                        style={{
                          backgroundColor: withAlpha("#bf5af2", 0.12),
                          color: "#bf5af2",
                        }}
                      >
                        <BotMessageSquare className="h-3 w-3" />
                        Tara
                      </button>
                      <button
                        onClick={() => setActiveSession({ id: list.id, name: list.name })}
                        className="shrink-0 h-8 px-3 rounded-lg text-[11px] font-medium flex items-center gap-1.5"
                        style={{
                          backgroundColor: withAlpha("#22c55e", 0.12),
                          color: "#22c55e",
                        }}
                      >
                        <Play className="h-3 w-3" />
                        Dial
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Recent Calls */}
      <SectionCard
        title="Recent Calls"
        actions={
          <Link
            href="/browse/dialer/history"
            className="text-[12px] font-medium"
            style={{ color: withAlpha(theme.text, 0.4) }}
          >
            View all
          </Link>
        }
        noPadding
      >
        {recentCalls.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Phone}
              title="No calls yet"
              description="Use the dialer or Voice AI to make your first call."
            />
          </div>
        ) : (
          <div>
            {recentCalls.map((call, i) => {
              const isExpanded = expandedCallId === call.id;
              const hasDetails = call.isVoiceAI && (call.aiSummary || call.appointmentSet);
              return (
                <div key={call.id}>
                  <div
                    className="flex items-center gap-3 px-5 py-3 transition-colors"
                    style={{
                      borderBottom: !isExpanded && i < recentCalls.length - 1
                        ? `0.5px solid ${withAlpha(theme.text, 0.05)}`
                        : undefined,
                      cursor: hasDetails ? "pointer" : undefined,
                    }}
                    onClick={hasDetails ? () => setExpandedCallId(isExpanded ? null : call.id) : undefined}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.02)}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: call.outcome
                          ? outcomeColors[call.outcome] || "#98989d"
                          : "#98989d",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium truncate" style={{ color: theme.text }}>
                          {call.contact?.name || call.toNumber}
                        </p>
                        {call.isVoiceAI && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                            style={{ backgroundColor: withAlpha("#bf5af2", 0.12), color: "#bf5af2" }}
                          >
                            AI
                          </span>
                        )}
                        {call.appointmentSet && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                            style={{ backgroundColor: withAlpha("#30d158", 0.12), color: "#30d158" }}
                          >
                            Appt
                          </span>
                        )}
                      </div>
                      {call.outcome && (
                        <p className="text-[11px] capitalize" style={{ color: withAlpha(theme.text, 0.4) }}>
                          {call.outcome.replace(/_/g, " ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
                          {formatTime(call.createdAt)}
                        </p>
                        {call.duration != null && call.duration > 0 && (
                          <p className="text-[11px]" style={{ color: withAlpha(theme.text, 0.3) }}>
                            {formatDuration(call.duration)}
                          </p>
                        )}
                      </div>
                      {hasDetails && (
                        isExpanded
                          ? <ChevronUp className="h-3.5 w-3.5" style={{ color: withAlpha(theme.text, 0.3) }} />
                          : <ChevronDown className="h-3.5 w-3.5" style={{ color: withAlpha(theme.text, 0.3) }} />
                      )}
                    </div>
                  </div>
                  {/* Expanded AI review card */}
                  {isExpanded && (
                    <div
                      className="px-5 pb-4 pt-1 space-y-2"
                      style={{
                        borderBottom: i < recentCalls.length - 1
                          ? `0.5px solid ${withAlpha(theme.text, 0.05)}`
                          : undefined,
                      }}
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
                          <CalendarCheck className="h-3.5 w-3.5" style={{ color: "#30d158" }} />
                          <span className="text-[12px] font-medium" style={{ color: "#30d158" }}>
                            Appointment scheduled
                          </span>
                        </div>
                      )}
                      {call.leadQualified != null && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5" style={{ color: call.leadQualified ? "#30d158" : "#98989d" }} />
                          <span className="text-[12px] font-medium" style={{ color: call.leadQualified ? "#30d158" : "#98989d" }}>
                            {call.leadQualified ? "Lead qualified" : "Not qualified"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function VoiceAIPanel({
  callLists,
  onStartTara,
}: {
  callLists: CallListItem[];
  onStartTara: (listId: string, listName: string, objective: "qualify" | "appointment" | "followup") => void;
}) {
  const { theme } = useColonyTheme();
  const [objective, setObjective] = useState<"qualify" | "appointment" | "followup">("qualify");
  const [selectedListId, setSelectedListId] = useState<string>("");

  const activeLists = callLists.filter((l) => l.completedEntries < l.totalEntries);

  const objectives = [
    { id: "qualify" as const, label: "Qualify Lead", icon: Mic },
    { id: "appointment" as const, label: "Set Appointment", icon: CalendarCheck },
    { id: "followup" as const, label: "Follow Up", icon: PhoneCall },
  ];

  const handleStart = () => {
    const list = callLists.find((l) => l.id === selectedListId);
    if (list) {
      onStartTara(list.id, list.name, objective);
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: withAlpha(theme.text, 0.03),
      }}
    >
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ borderBottom: `0.5px solid ${withAlpha(theme.text, 0.05)}` }}
      >
        <BotMessageSquare
          className="h-5 w-5"
          style={{ color: "#bf5af2" }}
          strokeWidth={1.5}
        />
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: theme.text }}>
            Voice AI
          </h3>
          <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
            AI-powered calls that qualify leads and set appointments
          </p>
        </div>
      </div>
      <div className="px-5 py-4 space-y-4">
        {/* Segmented control for objectives */}
        <div
          className="inline-flex rounded-xl p-1"
          style={{ backgroundColor: withAlpha(theme.text, 0.05) }}
        >
          {objectives.map((obj) => {
            const active = objective === obj.id;
            return (
              <button
                key={obj.id}
                onClick={() => setObjective(obj.id)}
                className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[12px] font-medium transition-all duration-200"
                style={{
                  backgroundColor: active ? withAlpha(theme.text, 0.1) : "transparent",
                  color: active ? theme.text : withAlpha(theme.text, 0.45),
                }}
              >
                <obj.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                {obj.label}
              </button>
            );
          })}
        </div>

        {/* List selector + start */}
        {activeLists.length > 0 ? (
          <div className="flex items-center gap-2">
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className="flex-1 h-9 px-3 rounded-lg text-[13px] focus:outline-none appearance-none"
              style={{
                backgroundColor: withAlpha(theme.text, 0.05),
                border: `1px solid ${withAlpha(theme.text, 0.08)}`,
                color: theme.text,
              }}
            >
              <option value="">Select a call list...</option>
              {activeLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.totalEntries - list.completedEntries} remaining)
                </option>
              ))}
            </select>
            <button
              onClick={handleStart}
              disabled={!selectedListId}
              className="h-9 px-4 rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-colors disabled:opacity-30"
              style={{
                backgroundColor: "#bf5af2",
                color: "#fff",
              }}
            >
              <BotMessageSquare className="h-3.5 w-3.5" />
              Start Tara
            </button>
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.35) }}>
            Create a call list with pending contacts to use Voice AI.
          </p>
        )}

        <p className="text-[12px] leading-relaxed" style={{ color: withAlpha(theme.text, 0.35) }}>
          Tara will call contacts on your behalf, qualify their interest level, and attempt to schedule appointments.
          Conversations are recorded and transcribed.
        </p>
      </div>
    </div>
  );
}
