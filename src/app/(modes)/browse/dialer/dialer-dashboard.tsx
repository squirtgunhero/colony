"use client";

import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { Phone, Clock, CheckCircle, Plus, ListChecks } from "lucide-react";

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
  contact: { id: string; name: string; phone: string | null } | null;
}

interface TodayStats {
  totalCalls: number;
  connectedCalls: number;
  totalDuration: number;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[22px] font-semibold"
            style={{ fontFamily: "'Spectral', serif", color: theme.text }}
          >
            Power Dialer
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: withAlpha(theme.text, 0.4) }}>
            Call through your leads efficiently
          </p>
        </div>
        <Link
          href="/browse/dialer/lists"
          className="flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-medium transition-colors"
          style={{
            backgroundColor: theme.accent,
            color: theme.bg,
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          New Call List
        </Link>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Calls Today", value: todayStats.totalCalls, icon: Phone },
          { label: "Connected", value: todayStats.connectedCalls, icon: CheckCircle },
          { label: "Talk Time", value: formatDuration(todayStats.totalDuration), icon: Clock },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4"
            style={{
              backgroundColor: withAlpha(theme.text, 0.03),
              border: `1px solid ${borderColor}`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="h-4 w-4" style={{ color: withAlpha(theme.text, 0.3) }} />
              <span className="text-[11px] uppercase tracking-wider" style={{ color: withAlpha(theme.text, 0.35) }}>
                {stat.label}
              </span>
            </div>
            <p className="text-[24px] font-semibold" style={{ color: theme.text }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Active Call Lists */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="h-4 w-4" style={{ color: withAlpha(theme.text, 0.35) }} />
          <h2 className="text-[15px] font-medium" style={{ color: theme.text }}>
            Call Lists
          </h2>
        </div>

        {callLists.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              backgroundColor: withAlpha(theme.text, 0.02),
              border: `1px solid ${borderColor}`,
            }}
          >
            <p className="text-[13px]" style={{ color: withAlpha(theme.text, 0.4) }}>
              No call lists yet. Create one to start power dialing.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {callLists.map((list) => {
              const progress =
                list.totalEntries > 0
                  ? Math.round((list.completedEntries / list.totalEntries) * 100)
                  : 0;
              return (
                <Link
                  key={list.id}
                  href={`/browse/dialer/lists/${list.id}`}
                  className="flex items-center gap-4 rounded-xl p-4 transition-colors hover:bg-white/[0.02]"
                  style={{ border: `1px solid ${borderColor}` }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate" style={{ color: theme.text }}>
                      {list.name}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: withAlpha(theme.text, 0.4) }}>
                      {list.completedEntries} / {list.totalEntries} called
                    </p>
                  </div>
                  {/* Progress bar */}
                  <div className="w-24">
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: withAlpha(theme.text, 0.08) }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: progress === 100 ? "#22c55e" : theme.accent,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-right mt-0.5" style={{ color: withAlpha(theme.text, 0.3) }}>
                      {progress}%
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Calls */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" style={{ color: withAlpha(theme.text, 0.35) }} />
            <h2 className="text-[15px] font-medium" style={{ color: theme.text }}>
              Recent Calls
            </h2>
          </div>
          <Link
            href="/browse/dialer/history"
            className="text-[12px]"
            style={{ color: withAlpha(theme.text, 0.4) }}
          >
            View all
          </Link>
        </div>

        {recentCalls.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{
              backgroundColor: withAlpha(theme.text, 0.02),
              border: `1px solid ${borderColor}`,
            }}
          >
            <p className="text-[13px]" style={{ color: withAlpha(theme.text, 0.4) }}>
              No calls yet. Use the dialer button to make your first call.
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${borderColor}` }}
          >
            {recentCalls.map((call, i) => (
              <div
                key={call.id}
                className="flex items-center gap-3 px-4 py-3"
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
                  <p className="text-[13px] font-medium truncate" style={{ color: theme.text }}>
                    {call.contact?.name || call.toNumber}
                  </p>
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
      </div>
    </div>
  );
}
