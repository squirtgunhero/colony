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

      <StatGrid columns={4}>
        <StatCard label="Calls Today" value={todayStats.totalCalls} icon={Phone} />
        <StatCard label="Connected" value={todayStats.connectedCalls} icon={CheckCircle} color="#30d158" />
        <StatCard label="Talk Time" value={formatDuration(todayStats.totalDuration)} icon={Clock} />
        <StatCard label="AI Calls" value={todayStats.voiceAICalls} icon={BotMessageSquare} color="#bf5af2" />
      </StatGrid>

      {/* Voice AI Panel */}
      <VoiceAIPanel />

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
                <Link
                  key={list.id}
                  href={`/browse/dialer/lists/${list.id}`}
                  className="flex items-center gap-4 rounded-xl p-3.5 transition-colors"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.03)}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
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
            {recentCalls.map((call, i) => (
              <div
                key={call.id}
                className="flex items-center gap-3 px-5 py-3 transition-colors"
                style={{
                  borderBottom: i < recentCalls.length - 1 ? `0.5px solid ${withAlpha(theme.text, 0.05)}` : undefined,
                }}
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

function VoiceAIPanel() {
  const { theme } = useColonyTheme();
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

        <p className="text-[12px] leading-relaxed" style={{ color: withAlpha(theme.text, 0.35) }}>
          Tara will call contacts on your behalf, qualify their interest level, and attempt to schedule appointments.
          Conversations are recorded and transcribed.
        </p>
      </div>
    </div>
  );
}
