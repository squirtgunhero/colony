"use client";

import { useState, useEffect, useCallback } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Zap,
  Phone,
  Mail,
  Calendar,
  StickyNote,
  ListTodo,
  Star,
  Tag,
  ArrowRight,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface ActionContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface ActionCall {
  id: string;
  toNumber: string;
  aiSummary: string | null;
  createdAt: string;
  contact: ActionContact | null;
}

interface CallAction {
  id: string;
  callId: string;
  type: string;
  description: string;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
  call: ActionCall;
}

const typeConfig: Record<string, { icon: typeof Phone; label: string; color: string }> = {
  follow_up_call: { icon: Phone, label: "Follow-up Call", color: "#64d2ff" },
  send_email: { icon: Mail, label: "Send Email", color: "#ff9f0a" },
  schedule_showing: { icon: Calendar, label: "Schedule Showing", color: "#30d158" },
  add_note: { icon: StickyNote, label: "Add Note", color: "#98989d" },
  create_task: { icon: ListTodo, label: "Create Task", color: "#bf5af2" },
  score_updated: { icon: Star, label: "Score Update", color: "#ffd60a" },
  status_changed: { icon: ArrowRight, label: "Status Change", color: "#ff453a" },
  tag_added: { icon: Tag, label: "Add Tag", color: "#30d158" },
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `In ${diffDays} days`;
}

interface GroupedActions {
  contactId: string | null;
  contactName: string;
  actions: CallAction[];
}

function groupByContact(actions: CallAction[]): GroupedActions[] {
  const map = new Map<string, GroupedActions>();

  for (const action of actions) {
    const contact = action.call.contact;
    const key = contact?.id || `unknown-${action.callId}`;
    const existing = map.get(key);
    if (existing) {
      existing.actions.push(action);
    } else {
      map.set(key, {
        contactId: contact?.id || null,
        contactName: contact?.name || action.call.toNumber,
        actions: [action],
      });
    }
  }

  return Array.from(map.values());
}

export function CallActionQueue() {
  const { theme } = useColonyTheme();
  const [actions, setActions] = useState<CallAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ id: string; type: "success" | "error"; message: string } | null>(null);

  const fetchActions = useCallback(async () => {
    try {
      const res = await fetch("/api/dialer/actions");
      if (res.ok) {
        const data = await res.json();
        setActions(data.actions || []);
      }
    } catch {
      // Silently fail — we just won't show the queue
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const handleExecute = async (actionId: string) => {
    setExecutingIds((prev) => new Set(prev).add(actionId));
    setFeedback(null);

    try {
      const res = await fetch("/api/dialer/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId }),
      });

      if (res.ok) {
        setActions((prev) => prev.filter((a) => a.id !== actionId));
        setFeedback({ id: actionId, type: "success", message: "Action executed" });
      } else {
        const data = await res.json();
        setFeedback({ id: actionId, type: "error", message: data.error || "Failed to execute" });
      }
    } catch {
      setFeedback({ id: actionId, type: "error", message: "Network error" });
    } finally {
      setExecutingIds((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  };

  const handleDismiss = async (actionId: string) => {
    setExecutingIds((prev) => new Set(prev).add(actionId));
    setFeedback(null);

    try {
      const res = await fetch("/api/dialer/actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, action: "dismiss" }),
      });

      if (res.ok) {
        setActions((prev) => prev.filter((a) => a.id !== actionId));
        setFeedback({ id: actionId, type: "success", message: "Action dismissed" });
      } else {
        const data = await res.json();
        setFeedback({ id: actionId, type: "error", message: data.error || "Failed to dismiss" });
      }
    } catch {
      setFeedback({ id: actionId, type: "error", message: "Network error" });
    } finally {
      setExecutingIds((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  };

  // Clear feedback after 3 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Don't render anything if no pending actions
  if (loading || actions.length === 0) return null;

  const grouped = groupByContact(actions);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: withAlpha(theme.text, 0.03) }}
    >
      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ borderBottom: `0.5px solid ${withAlpha(theme.text, 0.05)}` }}
      >
        <div className="flex items-center gap-2.5">
          <Zap
            className="h-4 w-4"
            style={{ color: "#ff9f0a" }}
            strokeWidth={1.5}
          />
          <h3 className="text-[14px] font-semibold" style={{ color: theme.text }}>
            Pending Actions
          </h3>
          <span
            className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
            style={{
              backgroundColor: withAlpha("#ff9f0a", 0.12),
              color: "#ff9f0a",
            }}
          >
            {actions.length}
          </span>
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div
          className="mx-4 mt-3 px-3 py-2 rounded-lg flex items-center gap-2 text-[12px]"
          style={{
            backgroundColor: withAlpha(
              feedback.type === "success" ? "#30d158" : "#ff453a",
              0.1
            ),
            color: feedback.type === "success" ? "#30d158" : "#ff453a",
          }}
        >
          {feedback.type === "success" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" />
          )}
          {feedback.message}
        </div>
      )}

      {/* Action groups */}
      <div className="px-4 py-3 space-y-3">
        {grouped.map((group) => (
          <div key={group.contactId || group.contactName}>
            {/* Contact name */}
            <p
              className="text-[12px] font-medium mb-1.5 px-1"
              style={{ color: withAlpha(theme.text, 0.5) }}
            >
              {group.contactName}
            </p>

            {/* Actions for this contact */}
            <div className="space-y-1">
              {group.actions.map((action) => {
                const config = typeConfig[action.type] || {
                  icon: ListTodo,
                  label: action.type,
                  color: "#98989d",
                };
                const Icon = config.icon;
                const isExecuting = executingIds.has(action.id);

                return (
                  <div
                    key={action.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
                    style={{ backgroundColor: withAlpha(theme.text, 0.02) }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.05))
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.02))
                    }
                  >
                    {/* Type icon */}
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: withAlpha(config.color, 0.12) }}
                    >
                      <Icon
                        className="h-3.5 w-3.5"
                        style={{ color: config.color }}
                        strokeWidth={1.5}
                      />
                    </div>

                    {/* Description + meta */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-medium truncate"
                        style={{ color: theme.text }}
                      >
                        {action.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: config.color }}
                        >
                          {config.label}
                        </span>
                        {action.dueDate && (
                          <span
                            className="text-[10px]"
                            style={{ color: withAlpha(theme.text, 0.35) }}
                          >
                            {formatRelativeDate(action.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleExecute(action.id)}
                        disabled={isExecuting}
                        className="h-7 px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-40"
                        style={{
                          backgroundColor: withAlpha("#30d158", 0.12),
                          color: "#30d158",
                        }}
                      >
                        {isExecuting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        Execute
                      </button>
                      <button
                        onClick={() => handleDismiss(action.id)}
                        disabled={isExecuting}
                        className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                        style={{
                          backgroundColor: withAlpha(theme.text, 0.05),
                          color: withAlpha(theme.text, 0.4),
                        }}
                        title="Dismiss"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
