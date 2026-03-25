"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  ArrowLeft,
  Sparkles,
  User,
  Pause,
  Play,
  UserCheck,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";

interface Message {
  id: string;
  role: string;
  content: string;
  channel: string;
  createdAt: string;
}

interface Engagement {
  id: string;
  channel: string;
  status: string;
  aiObjective: string;
  messageCount: number;
  lastReplyAt: string | null;
  summary: string | null;
  nextFollowUp: string | null;
  createdAt: string;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    source: string | null;
    type: string;
    tags: string[];
    createdAt: string;
  };
  messages: Message[];
}

interface Props {
  engagement: Engagement;
}

const objectiveLabels: Record<string, string> = {
  qualify: "Qualify Lead",
  nurture: "Nurture",
  schedule_showing: "Schedule Showing",
  re_engage: "Re-engage",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  qualified: "Qualified",
  converted: "Converted",
  unresponsive: "Unresponsive",
  opted_out: "Opted Out",
};

const statusColors: Record<string, string> = {
  active: "#22c55e",
  paused: "#eab308",
  qualified: "#3b82f6",
  converted: "#8b5cf6",
  unresponsive: "#6b7280",
  opted_out: "#ef4444",
};

export function AIConversationView({ engagement }: Props) {
  const { theme } = useColonyTheme();
  const borderColor = withAlpha(theme.text, 0.06);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      await fetch(`/api/ai-engage/${engagement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      window.location.reload();
    });
  };

  const firstName = engagement.contact.name.split(" ")[0];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/browse/ai-engage"
        className="flex items-center gap-2 text-sm font-medium transition-colors"
        style={{ color: withAlpha(theme.text, 0.4) }}
      >
        <ArrowLeft className="h-4 w-4" />
        AI Engagements
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-medium shrink-0"
          style={{
            background: `linear-gradient(135deg, ${withAlpha(theme.accent, 0.2)}, ${withAlpha(theme.accent, 0.08)})`,
            color: theme.accent,
          }}
        >
          {engagement.contact.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href={`/browse/contacts/${engagement.contact.id}`}
              className="text-[22px] font-semibold hover:underline"
              style={{ fontFamily: "'Spectral', serif", color: theme.text }}
            >
              {engagement.contact.name}
            </Link>
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: withAlpha(statusColors[engagement.status] || "#6b7280", 0.15),
                color: statusColors[engagement.status] || "#6b7280",
              }}
            >
              {statusLabels[engagement.status]}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[12px]" style={{ color: withAlpha(theme.text, 0.4) }}>
            <span>{engagement.channel.toUpperCase()}</span>
            <span>{objectiveLabels[engagement.aiObjective]}</span>
            <span>{engagement.messageCount} messages</span>
            {engagement.contact.source && <span>Source: {engagement.contact.source.replace(/_/g, " ")}</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {engagement.status === "active" ? (
            <button
              onClick={() => handleStatusChange("paused")}
              disabled={isPending}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12px] font-medium transition-colors"
              style={{ backgroundColor: withAlpha("#eab308", 0.15), color: "#eab308" }}
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
          ) : engagement.status === "paused" ? (
            <button
              onClick={() => handleStatusChange("active")}
              disabled={isPending}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12px] font-medium transition-colors"
              style={{ backgroundColor: withAlpha("#22c55e", 0.15), color: "#22c55e" }}
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </button>
          ) : null}
          {!["qualified", "converted"].includes(engagement.status) && (
            <button
              onClick={() => handleStatusChange("qualified")}
              disabled={isPending}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12px] font-medium transition-colors"
              style={{ backgroundColor: withAlpha("#3b82f6", 0.15), color: "#3b82f6" }}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Mark Qualified
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Messages */}
        <div
          className="flex-1 rounded-xl"
          style={{ backgroundColor: withAlpha(theme.text, 0.02), border: `1px solid ${borderColor}` }}
        >
          <div className="p-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
            <h3 className="text-[14px] font-medium" style={{ color: theme.text }}>
              Conversation
            </h3>
          </div>
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
            {engagement.messages.length === 0 ? (
              <p className="text-[13px] text-center py-8" style={{ color: withAlpha(theme.text, 0.4) }}>
                No messages yet. Tara will send the first message on the next processing cycle.
              </p>
            ) : (
              engagement.messages.map((msg) => {
                const isAI = msg.role === "assistant";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}
                  >
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0"
                      style={{
                        backgroundColor: isAI ? withAlpha(theme.accent, 0.15) : withAlpha(theme.text, 0.1),
                        color: isAI ? theme.accent : withAlpha(theme.text, 0.6),
                      }}
                    >
                      {isAI ? <Sparkles className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    </div>
                    <div
                      className={`max-w-[75%] rounded-xl px-4 py-2.5 ${isAI ? "rounded-tl-sm" : "rounded-tr-sm"}`}
                      style={{
                        backgroundColor: isAI ? withAlpha(theme.accent, 0.08) : withAlpha(theme.text, 0.06),
                      }}
                    >
                      <p className="text-[13px]" style={{ color: theme.text }}>
                        {msg.content}
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: withAlpha(theme.text, 0.3) }}>
                        {new Date(msg.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-4">
          {/* Contact info */}
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: withAlpha(theme.text, 0.03), border: `1px solid ${borderColor}` }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: withAlpha(theme.text, 0.35) }}>
              Contact
            </p>
            <div className="space-y-2 text-[12px]">
              {engagement.contact.phone && (
                <div className="flex items-center gap-2" style={{ color: withAlpha(theme.text, 0.6) }}>
                  <Phone className="h-3 w-3" />
                  {engagement.contact.phone}
                </div>
              )}
              {engagement.contact.email && (
                <div className="flex items-center gap-2" style={{ color: withAlpha(theme.text, 0.6) }}>
                  <Mail className="h-3 w-3" />
                  {engagement.contact.email}
                </div>
              )}
              <div className="flex items-center gap-2" style={{ color: withAlpha(theme.text, 0.6) }}>
                <Calendar className="h-3 w-3" />
                Lead since {new Date(engagement.contact.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
            {engagement.contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {engagement.contact.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                    style={{ backgroundColor: withAlpha(theme.text, 0.06), color: withAlpha(theme.text, 0.5) }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* AI Summary */}
          {engagement.summary && (
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: withAlpha(theme.text, 0.03), border: `1px solid ${borderColor}` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: withAlpha(theme.text, 0.35) }}>
                AI Summary
              </p>
              <p className="text-[12px]" style={{ color: withAlpha(theme.text, 0.6) }}>
                {engagement.summary}
              </p>
            </div>
          )}

          {/* Next follow-up */}
          {engagement.nextFollowUp && engagement.status === "active" && (
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: withAlpha(theme.accent, 0.05), border: `1px solid ${withAlpha(theme.accent, 0.15)}` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: theme.accent }}>
                Next Follow-up
              </p>
              <p className="text-[13px] font-medium" style={{ color: theme.text }}>
                {new Date(engagement.nextFollowUp).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
