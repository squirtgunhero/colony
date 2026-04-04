"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  ListChecks,
  ArrowLeft,
  Phone,
  CheckCircle,
  Clock,
  XCircle,
  SkipForward,
  BotMessageSquare,
  Play,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { DialingSession } from "@/components/dialer/DialingSession";
import { TaraSession } from "@/components/dialer/TaraSession";

interface Entry {
  id: string;
  contactId: string;
  position: number;
  status: string;
  outcome: string | null;
  notes: string | null;
  calledAt: string | null;
  contact: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    type: string;
    leadScore: number | null;
    leadGrade: string | null;
  } | null;
}

interface Props {
  list: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    filterJson: Record<string, unknown>[] | null;
    lastRefreshedAt: string | null;
  };
  entries: Entry[];
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
  skipped: "#6b7280",
};

export function CallListDetail({ list, entries }: Props) {
  const { theme } = useColonyTheme();
  const borderColor = withAlpha(theme.text, 0.06);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDialing, setIsDialing] = useState(false);
  const [isTaraActive, setIsTaraActive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{ added: number; total: number } | null>(null);

  const isSmartList = !!list.filterJson;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await fetch("/api/dialer/call-lists/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callListId: list.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setRefreshResult(data);
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTimeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const completed = entries.filter((e) => e.status === "completed").length;
  const pending = entries.filter((e) => e.status === "pending").length;
  const progress = entries.length > 0 ? Math.round((completed / entries.length) * 100) : 0;

  const handleMarkEntry = (entryId: string, outcome: string) => {
    startTransition(async () => {
      await fetch(`/api/dialer/call-lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId,
          action: "complete",
          outcome,
        }),
      });
      router.refresh();
    });
  };

  if (isTaraActive) {
    return (
      <TaraSession
        callListId={list.id}
        callListName={list.name}
        objective="qualify"
        onExit={() => {
          setIsTaraActive(false);
          router.refresh();
        }}
      />
    );
  }

  if (isDialing) {
    return (
      <DialingSession
        callListId={list.id}
        callListName={list.name}
        onExit={() => {
          setIsDialing(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={list.name}
        subtitle={list.description || `${entries.length} contacts in this list`}
        icon={ListChecks}
        overline="Dialer / Call Lists"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/browse/dialer/lists"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-all duration-150 hover:opacity-90"
              style={{
                backgroundColor: withAlpha(theme.text, 0.06),
                color: withAlpha(theme.text, 0.7),
                border: `1px solid ${withAlpha(theme.text, 0.08)}`,
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              All Lists
            </Link>
            {isSmartList && (
              <>
                {list.lastRefreshedAt && (
                  <span
                    className="text-[11px] px-2 py-1 rounded-lg"
                    style={{
                      backgroundColor: withAlpha(theme.text, 0.04),
                      color: withAlpha(theme.text, 0.45),
                    }}
                  >
                    Last refreshed: {formatTimeAgo(list.lastRefreshedAt)}
                  </span>
                )}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-all duration-150 hover:opacity-90"
                  style={{
                    backgroundColor: withAlpha(theme.accent, 0.1),
                    color: theme.accent,
                    border: `1px solid ${withAlpha(theme.accent, 0.2)}`,
                    opacity: isRefreshing ? 0.6 : 1,
                  }}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing ? "Refreshing..." : "Refresh Now"}
                </button>
                {refreshResult && refreshResult.added > 0 && (
                  <span
                    className="text-[11px] font-medium px-2 py-1 rounded-lg"
                    style={{
                      backgroundColor: withAlpha("#22c55e", 0.1),
                      color: "#22c55e",
                    }}
                  >
                    +{refreshResult.added} added
                  </span>
                )}
              </>
            )}
            {pending > 0 && (
              <>
                <button
                  onClick={() => setIsTaraActive(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium transition-all duration-150 hover:opacity-90"
                  style={{
                    backgroundColor: withAlpha("#bf5af2", 0.12),
                    color: "#bf5af2",
                    border: `1px solid ${withAlpha("#bf5af2", 0.2)}`,
                  }}
                >
                  <BotMessageSquare className="h-4 w-4" />
                  Assign Tara
                </button>
                <ActionButton
                  label="Start Dialing"
                  icon={Play}
                  onClick={() => setIsDialing(true)}
                />
              </>
            )}
          </div>
        }
      />

      {/* Stats */}
      <StatGrid columns={3}>
        <StatCard label="Total Contacts" value={entries.length} icon={Phone} />
        <StatCard label="Completed" value={completed} icon={CheckCircle} color="#22c55e" />
        <StatCard label="Remaining" value={pending} icon={Clock} color="#eab308" />
      </StatGrid>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-medium" style={{ color: withAlpha(theme.text, 0.5) }}>
            Progress
          </span>
          <span className="text-[12px] font-bold" style={{ color: theme.text }}>
            {progress}%
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: withAlpha(theme.text, 0.08) }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: progress === 100 ? "#22c55e" : theme.accent,
            }}
          />
        </div>
      </div>

      {/* Entry list */}
      <SectionCard title="Contacts" subtitle={`${pending} remaining`} noPadding>
        <div>
          {entries.map((entry, i) => {
            const contact = entry.contact;
            const isDone = entry.status === "completed";
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-5 py-3 transition-colors"
                style={{
                  borderBottom: i < entries.length - 1 ? `1px solid ${borderColor}` : undefined,
                  opacity: isDone ? 0.5 : 1,
                }}
              >
                {/* Status indicator */}
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: isDone
                      ? outcomeColors[entry.outcome || "connected"] || "#22c55e"
                      : withAlpha(theme.text, 0.15),
                  }}
                />

                {/* Contact info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: theme.text }}>
                    {contact?.name || "Unknown Contact"}
                  </p>
                  <p className="text-[11px]" style={{ color: withAlpha(theme.text, 0.4) }}>
                    {contact?.phone || "No phone"}
                  </p>
                </div>

                {/* Lead score */}
                {contact?.leadGrade && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      backgroundColor: withAlpha(theme.accent, 0.12),
                      color: theme.accent,
                    }}
                  >
                    {contact.leadGrade}
                  </span>
                )}

                {/* Outcome or actions */}
                {isDone ? (
                  <span
                    className="text-[10px] font-medium capitalize px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: withAlpha(
                        outcomeColors[entry.outcome || "connected"] || "#22c55e",
                        0.15
                      ),
                      color: outcomeColors[entry.outcome || "connected"] || "#22c55e",
                    }}
                  >
                    {(entry.outcome || "completed").replace(/_/g, " ")}
                  </span>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMarkEntry(entry.id, "connected")}
                      className="h-7 w-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/[0.05]"
                      style={{ color: "#22c55e" }}
                      title="Mark connected"
                      disabled={isPending}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleMarkEntry(entry.id, "no_answer")}
                      className="h-7 w-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/[0.05]"
                      style={{ color: "#6b7280" }}
                      title="No answer"
                      disabled={isPending}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleMarkEntry(entry.id, "skipped")}
                      className="h-7 w-7 flex items-center justify-center rounded-md transition-colors hover:bg-white/[0.05]"
                      style={{ color: withAlpha(theme.text, 0.3) }}
                      title="Skip"
                      disabled={isPending}
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
