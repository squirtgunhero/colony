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
  Loader2,
  PhoneCall,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/ui/action-button";

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
  connected: "#22c55e",
  interested: "#22c55e",
  left_voicemail: "#eab308",
  callback_requested: "#3b82f6",
  no_answer: "#6b7280",
  busy: "#6b7280",
  not_interested: "#ef4444",
  wrong_number: "#ef4444",
};

export function DialerDashboard({ callLists, recentCalls, todayStats }: Props) {
  const { theme } = useColonyTheme();
  const borderColor = withAlpha(theme.text, 0.06);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Power Dialer"
        subtitle="Call through your leads and let Voice AI qualify and set appointments"
        icon={Phone}
        actions={
          <div className="flex items-center gap-2">
            <ActionButton label="New Call List" icon={Plus} onClick={() => window.location.href = "/browse/dialer/lists"} />
          </div>
        }
      />

      {/* Stats */}
      <StatGrid columns={4}>
        <StatCard label="Calls Today" value={todayStats.totalCalls} icon={Phone} />
        <StatCard label="Connected" value={todayStats.connectedCalls} icon={CheckCircle} color="#22c55e" />
        <StatCard label="Talk Time" value={formatDuration(todayStats.totalDuration)} icon={Clock} />
        <StatCard label="AI Calls" value={todayStats.voiceAICalls} icon={BotMessageSquare} color="#8b5cf6" />
      </StatGrid>

      {/* Voice AI Quick Launch */}
      <VoiceAIPanel borderColor={borderColor} />

      {/* Call Lists */}
      <SectionCard
        title="Call Lists"
        actions={
          <Link
            href="/browse/dialer/lists"
            className="text-[12px] transition-colors hover:opacity-80"
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
            description="Create a call list to start power dialing through your contacts efficiently."
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
          <div className="space-y-2">
            {callLists.map((list) => {
              const progress = list.totalEntries > 0
                ? Math.round((list.completedEntries / list.totalEntries) * 100)
                : 0;
              return (
                <Link
                  key={list.id}
                  href={`/browse/dialer/lists/${list.id}`}
                  className="flex items-center gap-4 rounded-xl p-4 transition-all duration-150 hover:translate-y-[-1px]"
                  style={{
                    border: `1px solid ${borderColor}`,
                    backgroundColor: withAlpha(theme.text, 0.015),
                  }}
                >
                  <div
                    className="flex items-center justify-center h-9 w-9 rounded-lg shrink-0"
                    style={{ backgroundColor: withAlpha(theme.accent, 0.08) }}
                  >
                    <ListChecks className="h-4 w-4" style={{ color: theme.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate" style={{ color: theme.text }}>
                      {list.name}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: withAlpha(theme.text, 0.4) }}>
                      {list.completedEntries} / {list.totalEntries} called
                    </p>
                  </div>
                  <div className="w-28 shrink-0">
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: withAlpha(theme.text, 0.08) }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: progress === 100 ? "#22c55e" : theme.accent,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-right mt-1" style={{ color: withAlpha(theme.text, 0.3) }}>
                      {progress}%
                    </p>
                  </div>
                </Link>
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
            className="text-[12px]"
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
              description="Use the dialer button or Voice AI to make your first call."
            />
          </div>
        ) : (
          <div>
            {recentCalls.map((call, i) => (
              <div
                key={call.id}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]"
                style={{
                  borderBottom: i < recentCalls.length - 1 ? `1px solid ${borderColor}` : undefined,
                }}
              >
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: call.outcome
                      ? outcomeColors[call.outcome] || "#6b7280"
                      : "#6b7280",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium truncate" style={{ color: theme.text }}>
                      {call.contact?.name || call.toNumber}
                    </p>
                    {call.isVoiceAI && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ backgroundColor: withAlpha("#8b5cf6", 0.15), color: "#a78bfa" }}
                      >
                        <BotMessageSquare className="h-3 w-3" />
                        AI
                      </span>
                    )}
                    {call.appointmentSet && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ backgroundColor: withAlpha("#22c55e", 0.15), color: "#4ade80" }}
                      >
                        <CalendarCheck className="h-3 w-3" />
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
                <div className="text-right shrink-0">
                  <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
                    {formatTime(call.createdAt)}
                  </p>
                  {call.duration != null && call.duration > 0 && (
                    <p className="text-[11px]" style={{ color: withAlpha(theme.text, 0.3) }}>
                      {formatDuration(call.duration)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/** Voice AI quick-launch panel */
function VoiceAIPanel({ borderColor }: { borderColor: string }) {
  const { theme } = useColonyTheme();
  const [isLaunching, setIsLaunching] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [objective, setObjective] = useState<"qualify" | "appointment" | "followup">("qualify");

  const objectives = [
    { id: "qualify" as const, label: "Qualify Lead", icon: Mic },
    { id: "appointment" as const, label: "Set Appointment", icon: CalendarCheck },
    { id: "followup" as const, label: "Follow Up", icon: PhoneCall },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${withAlpha("#8b5cf6", 0.08)} 0%, ${withAlpha(theme.accent, 0.06)} 100%)`,
        border: `1px solid ${withAlpha("#8b5cf6", 0.15)}`,
      }}
    >
      <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${withAlpha("#8b5cf6", 0.1)}` }}>
        <div
          className="flex items-center justify-center h-9 w-9 rounded-xl"
          style={{ backgroundColor: withAlpha("#8b5cf6", 0.15) }}
        >
          <BotMessageSquare className="h-[18px] w-[18px]" style={{ color: "#a78bfa" }} />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: theme.text }}>
            Voice AI
          </h3>
          <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
            AI-powered calls that qualify leads and set appointments automatically
          </p>
        </div>
      </div>
      <div className="px-5 py-4 space-y-4">
        {/* Objective selector */}
        <div className="flex gap-2">
          {objectives.map((obj) => {
            const active = objective === obj.id;
            return (
              <button
                key={obj.id}
                onClick={() => setObjective(obj.id)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium transition-all duration-150"
                style={{
                  backgroundColor: active ? withAlpha("#8b5cf6", 0.2) : withAlpha(theme.text, 0.04),
                  color: active ? "#c4b5fd" : withAlpha(theme.text, 0.5),
                  border: `1px solid ${active ? withAlpha("#8b5cf6", 0.3) : "transparent"}`,
                }}
              >
                <obj.icon className="h-3.5 w-3.5" />
                {obj.label}
              </button>
            );
          })}
        </div>

        {/* Quick note */}
        <p className="text-[12px] leading-relaxed" style={{ color: withAlpha(theme.text, 0.35) }}>
          Tara will call contacts on your behalf, qualify their interest level, and attempt to schedule appointments.
          Conversations are recorded and transcribed.
        </p>
      </div>
    </div>
  );
}
