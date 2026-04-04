"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  BarChart3,
  Phone,
  Clock,
  CheckCircle,
  BotMessageSquare,
  CalendarCheck,
  ArrowLeft,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsData {
  totalCalls: number;
  connectedCalls: number;
  connectRate: number;
  avgDuration: number;
  appointmentsSet: number;
  aiVsManual: {
    ai: { count: number; connectRate: number; avgDuration: number };
    manual: { count: number; connectRate: number; avgDuration: number };
  };
  callsPerDay: { date: string; count: number }[];
  outcomeDistribution: {
    outcome: string;
    count: number;
    percentage: number;
  }[];
  hourlyData: {
    hour: number;
    total: number;
    connected: number;
    connectRate: number;
  }[];
  bestHour: {
    hour: number;
    total: number;
    connected: number;
    connectRate: number;
  } | null;
  topContacts: {
    id: string;
    name: string;
    phone: string | null;
    callCount: number;
    lastOutcome: string | null;
    lastCallDate: string;
  }[];
  days: number;
}

interface Props {
  initialData: AnalyticsData;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const outcomeColors: Record<string, string> = {
  connected: "#30d158",
  interested: "#30d158",
  left_voicemail: "#ff9f0a",
  callback_requested: "#64d2ff",
  no_answer: "#98989d",
  busy: "#98989d",
  not_interested: "#ff453a",
  wrong_number: "#ff453a",
  no_outcome: "#636366",
};

const DATE_RANGES = [
  { label: "Today", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDurationLong(seconds: number): string {
  if (!seconds) return "0m 0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatOutcome(outcome: string): string {
  return outcome.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AnalyticsDashboard({ initialData }: Props) {
  const { theme } = useColonyTheme();
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [selectedDays, setSelectedDays] = useState(initialData.days);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dialer/analytics?days=${days}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Keep existing data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDays !== initialData.days) {
      fetchData(selectedDays);
    }
  }, [selectedDays, initialData.days, fetchData]);

  const maxDailyCount = Math.max(...data.callsPerDay.map((d) => d.count), 1);
  const maxOutcomeCount = Math.max(
    ...data.outcomeDistribution.map((d) => d.count),
    1
  );
  const maxHourlyConnected = Math.max(
    ...data.hourlyData.map((h) => h.connected),
    1
  );

  const isEmpty = data.totalCalls === 0;

  return (
    <div
      className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6"
      style={{ opacity: loading ? 0.6 : 1, transition: "opacity 200ms" }}
    >
      {/* Header */}
      <div>
        <Link
          href="/browse/dialer"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-4 transition-opacity hover:opacity-70"
          style={{ color: withAlpha(theme.text, 0.4) }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dialer
        </Link>
        <PageHeader
          title="Call Analytics"
          subtitle="Track your dialing performance and outcomes"
          icon={BarChart3}
          actions={
            <DateRangeSelector
              selected={selectedDays}
              onChange={setSelectedDays}
            />
          }
        />
      </div>

      {isEmpty ? (
        <EmptyState
          icon={BarChart3}
          title="No call data"
          description="Make some calls and your analytics will appear here. Try changing the date range to see older data."
        />
      ) : (
        <>
          {/* Stat cards */}
          <StatGrid columns={4}>
            <StatCard
              label="Total Calls"
              value={data.totalCalls}
              icon={Phone}
            />
            <StatCard
              label="Connect Rate"
              value={`${data.connectRate}%`}
              icon={CheckCircle}
              color="#30d158"
            />
            <StatCard
              label="Avg Talk Time"
              value={formatDuration(data.avgDuration)}
              icon={Clock}
            />
            <StatCard
              label="Appointments Set"
              value={data.appointmentsSet}
              icon={CalendarCheck}
              color="#ff9f0a"
            />
          </StatGrid>

          {/* Calls Over Time */}
          <SectionCard title="Calls Over Time">
            <div className="flex items-end gap-1.5" style={{ height: 180 }}>
              {data.callsPerDay.map((day) => {
                const pct =
                  maxDailyCount > 0
                    ? (day.count / maxDailyCount) * 100
                    : 0;
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center justify-end gap-1"
                    style={{ height: "100%" }}
                  >
                    {day.count > 0 && (
                      <span
                        className="text-[10px] font-medium"
                        style={{
                          color: withAlpha(theme.text, 0.5),
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {day.count}
                      </span>
                    )}
                    <div
                      className="w-full rounded-t-md transition-all duration-300"
                      style={{
                        height: `${Math.max(pct, day.count > 0 ? 4 : 0)}%`,
                        backgroundColor: theme.accent,
                        opacity: day.count > 0 ? 0.8 : 0.15,
                        minHeight: day.count > 0 ? 4 : 1,
                      }}
                    />
                    <span
                      className="text-[9px] whitespace-nowrap"
                      style={{ color: withAlpha(theme.text, 0.3) }}
                    >
                      {formatShortDate(day.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Outcome Distribution */}
          <SectionCard title="Outcome Distribution">
            <div className="space-y-3">
              {data.outcomeDistribution.map((item) => {
                const color =
                  outcomeColors[item.outcome] || withAlpha(theme.text, 0.3);
                const pct =
                  maxOutcomeCount > 0
                    ? (item.count / maxOutcomeCount) * 100
                    : 0;
                return (
                  <div key={item.outcome}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[12px] font-medium"
                        style={{ color: withAlpha(theme.text, 0.7) }}
                      >
                        {formatOutcome(item.outcome)}
                      </span>
                      <span
                        className="text-[11px] font-medium"
                        style={{
                          color: withAlpha(theme.text, 0.4),
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{
                        backgroundColor: withAlpha(theme.text, 0.06),
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color,
                          minWidth: item.count > 0 ? 4 : 0,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Two-column: AI vs Manual + Best Time to Call */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI vs Manual */}
            <SectionCard title="AI vs Manual">
              <div className="space-y-4">
                {/* Visual split bar */}
                <div>
                  <div
                    className="h-3 rounded-full overflow-hidden flex"
                    style={{
                      backgroundColor: withAlpha(theme.text, 0.06),
                    }}
                  >
                    {data.aiVsManual.ai.count > 0 && (
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${(data.aiVsManual.ai.count / data.totalCalls) * 100}%`,
                          backgroundColor: "#bf5af2",
                        }}
                      />
                    )}
                    {data.aiVsManual.manual.count > 0 && (
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${(data.aiVsManual.manual.count / data.totalCalls) * 100}%`,
                          backgroundColor: theme.accent,
                        }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span
                      className="text-[10px] font-medium flex items-center gap-1"
                      style={{ color: "#bf5af2" }}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: "#bf5af2" }}
                      />
                      AI
                    </span>
                    <span
                      className="text-[10px] font-medium flex items-center gap-1"
                      style={{ color: theme.accent }}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: theme.accent }}
                      />
                      Manual
                    </span>
                  </div>
                </div>

                {/* AI row */}
                <div
                  className="rounded-xl p-3.5"
                  style={{
                    backgroundColor: withAlpha("#bf5af2", 0.06),
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <BotMessageSquare
                      className="h-3.5 w-3.5"
                      style={{ color: "#bf5af2" }}
                    />
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: theme.text }}
                    >
                      Voice AI
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p
                        className="text-[10px] uppercase tracking-wide"
                        style={{ color: withAlpha(theme.text, 0.35) }}
                      >
                        Calls
                      </p>
                      <p
                        className="text-[16px] font-semibold"
                        style={{
                          color: theme.text,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {data.aiVsManual.ai.count}
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-[10px] uppercase tracking-wide"
                        style={{ color: withAlpha(theme.text, 0.35) }}
                      >
                        Connect
                      </p>
                      <p
                        className="text-[16px] font-semibold"
                        style={{
                          color: theme.text,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {data.aiVsManual.ai.connectRate}%
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-[10px] uppercase tracking-wide"
                        style={{ color: withAlpha(theme.text, 0.35) }}
                      >
                        Avg Duration
                      </p>
                      <p
                        className="text-[16px] font-semibold"
                        style={{
                          color: theme.text,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatDurationLong(data.aiVsManual.ai.avgDuration)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Manual row */}
                <div
                  className="rounded-xl p-3.5"
                  style={{
                    backgroundColor: withAlpha(theme.accent, 0.06),
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Phone
                      className="h-3.5 w-3.5"
                      style={{ color: theme.accent }}
                    />
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: theme.text }}
                    >
                      Manual
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p
                        className="text-[10px] uppercase tracking-wide"
                        style={{ color: withAlpha(theme.text, 0.35) }}
                      >
                        Calls
                      </p>
                      <p
                        className="text-[16px] font-semibold"
                        style={{
                          color: theme.text,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {data.aiVsManual.manual.count}
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-[10px] uppercase tracking-wide"
                        style={{ color: withAlpha(theme.text, 0.35) }}
                      >
                        Connect
                      </p>
                      <p
                        className="text-[16px] font-semibold"
                        style={{
                          color: theme.text,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {data.aiVsManual.manual.connectRate}%
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-[10px] uppercase tracking-wide"
                        style={{ color: withAlpha(theme.text, 0.35) }}
                      >
                        Avg Duration
                      </p>
                      <p
                        className="text-[16px] font-semibold"
                        style={{
                          color: theme.text,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatDurationLong(
                          data.aiVsManual.manual.avgDuration
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Best Time to Call */}
            <SectionCard
              title="Best Time to Call"
              subtitle={
                data.bestHour
                  ? `Peak: ${formatHour(data.bestHour.hour)} (${data.bestHour.connected} connections)`
                  : undefined
              }
            >
              <div className="grid grid-cols-4 gap-1.5">
                {data.hourlyData.map((h) => {
                  const intensity =
                    maxHourlyConnected > 0
                      ? h.connected / maxHourlyConnected
                      : 0;
                  const isBest =
                    data.bestHour !== null && h.hour === data.bestHour.hour;
                  return (
                    <div
                      key={h.hour}
                      className="rounded-lg p-2 text-center transition-all duration-300"
                      style={{
                        backgroundColor: isBest
                          ? withAlpha("#30d158", 0.2)
                          : h.connected > 0
                            ? withAlpha(theme.accent, 0.05 + intensity * 0.2)
                            : withAlpha(theme.text, 0.03),
                        border: isBest
                          ? `1.5px solid ${withAlpha("#30d158", 0.4)}`
                          : "1.5px solid transparent",
                      }}
                    >
                      <p
                        className="text-[10px] font-medium"
                        style={{
                          color: isBest
                            ? "#30d158"
                            : withAlpha(theme.text, 0.5),
                        }}
                      >
                        {formatHour(h.hour)}
                      </p>
                      <p
                        className="text-[14px] font-semibold mt-0.5"
                        style={{
                          color: isBest ? "#30d158" : theme.text,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {h.connected}
                      </p>
                      <p
                        className="text-[9px]"
                        style={{ color: withAlpha(theme.text, 0.3) }}
                      >
                        {h.connectRate}%
                      </p>
                    </div>
                  );
                })}
              </div>
              {data.bestHour && (
                <div
                  className="flex items-center gap-2 mt-4 px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: withAlpha("#30d158", 0.08),
                  }}
                >
                  <TrendingUp
                    className="h-3.5 w-3.5"
                    style={{ color: "#30d158" }}
                  />
                  <span
                    className="text-[12px] font-medium"
                    style={{ color: "#30d158" }}
                  >
                    Best hour: {formatHour(data.bestHour.hour)} with{" "}
                    {data.bestHour.connectRate}% connect rate
                  </span>
                </div>
              )}
            </SectionCard>
          </div>

          {/* Top Contacted */}
          {data.topContacts.length > 0 && (
            <SectionCard title="Top Contacted" noPadding>
              <div>
                {data.topContacts.map((contact, i) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 px-5 py-3"
                    style={{
                      borderBottom:
                        i < data.topContacts.length - 1
                          ? `0.5px solid ${withAlpha(theme.text, 0.05)}`
                          : undefined,
                    }}
                  >
                    <span
                      className="text-[11px] font-medium w-5 text-center shrink-0"
                      style={{
                        color: withAlpha(theme.text, 0.3),
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-medium truncate"
                        style={{ color: theme.text }}
                      >
                        {contact.name}
                      </p>
                      {contact.lastOutcome && (
                        <p
                          className="text-[11px]"
                          style={{
                            color:
                              outcomeColors[contact.lastOutcome] ||
                              withAlpha(theme.text, 0.4),
                          }}
                        >
                          {formatOutcome(contact.lastOutcome)}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="text-[13px] font-semibold"
                        style={{
                          color: theme.text,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {contact.callCount} {contact.callCount === 1 ? "call" : "calls"}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: withAlpha(theme.text, 0.3) }}
                      >
                        {new Date(contact.lastCallDate).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" }
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

// ─── Date Range Selector ─────────────────────────────────────────────────────

function DateRangeSelector({
  selected,
  onChange,
}: {
  selected: number;
  onChange: (days: number) => void;
}) {
  const { theme } = useColonyTheme();

  return (
    <div
      className="inline-flex rounded-xl p-1"
      style={{ backgroundColor: withAlpha(theme.text, 0.05) }}
    >
      {DATE_RANGES.map((range) => {
        const active = selected === range.days;
        return (
          <button
            key={range.days}
            onClick={() => onChange(range.days)}
            className="h-7 px-3 rounded-lg text-[11px] font-medium transition-all duration-200"
            style={{
              backgroundColor: active
                ? withAlpha(theme.text, 0.1)
                : "transparent",
              color: active ? theme.text : withAlpha(theme.text, 0.45),
            }}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
