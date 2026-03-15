"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, CheckSquare, Square, Circle, Clock, User, Handshake } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate: Date | null;
  priority: string;
  completed: boolean;
  contact?: { id: string; name: string } | null;
  deal?: { id: string; title: string } | null;
}

interface TasksListViewProps {
  tasks: Task[];
}

const priorityColors: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#6b7280",
};

function formatDueDate(date: Date | null): string {
  if (!date) return "No due date";
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays <= 7) return `Due in ${diffDays}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TasksListView({ tasks: initialTasks }: TasksListViewProps) {
  const { theme } = useColonyTheme();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [tasks, setTasks] = useState(initialTasks);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && !task.completed) ||
      (filter === "completed" && task.completed);
    return matchesSearch && matchesFilter;
  });

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const overdueCount = tasks.filter((t) => {
    if (t.completed || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  async function toggleTask(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newCompleted = !task.completed;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: newCompleted } : t))
    );
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: newCompleted }),
    });
  }

  const neumorphicRaised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;
  const neumorphicRecessed = `inset 3px 3px 6px rgba(0,0,0,0.3), inset -3px -3px 6px rgba(255,255,255,0.02)`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[28px] leading-tight font-semibold tracking-[-0.01em]"
            style={{ color: theme.text, fontFamily: "'Spectral', serif" }}
          >
            Tasks
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: theme.textMuted, fontFamily: "'DM Sans', sans-serif" }}
          >
            {pendingCount} pending{overdueCount > 0 ? ` \u00b7 ${overdueCount} overdue` : ""}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: theme.textMuted }}
          />
          <input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl text-sm outline-none transition-all"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              boxShadow: neumorphicRecessed,
              border: `1px solid ${withAlpha(theme.text, 0.06)}`,
              color: theme.text,
              caretColor: theme.accent,
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "completed"] as const).map((f) => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 text-sm rounded-lg capitalize transition-all duration-200"
                style={{
                  backgroundColor: isActive ? withAlpha(theme.accent, 0.15) : "transparent",
                  color: isActive ? theme.accent : theme.textMuted,
                  boxShadow: isActive ? neumorphicRaised : "none",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="h-12 w-12 mx-auto mb-4" style={{ color: theme.accent, opacity: 0.4 }} />
            <p style={{ color: theme.textMuted }}>No tasks found</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue =
              !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
            return (
              <div
                key={task.id}
                className="flex items-start gap-3 p-4 rounded-xl transition-all duration-200 group"
                style={{
                  backgroundColor: theme.bgGlow,
                  boxShadow: neumorphicRaised,
                  opacity: task.completed ? 0.5 : 1,
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTask(task.id)}
                  className="mt-0.5 shrink-0 transition-colors"
                  style={{ color: task.completed ? theme.accent : theme.textMuted }}
                >
                  {task.completed ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className="font-medium truncate"
                      style={{
                        color: theme.text,
                        textDecoration: task.completed ? "line-through" : "none",
                      }}
                    >
                      {task.title}
                    </h3>
                    {/* Priority dot */}
                    <Circle
                      className="h-2 w-2 shrink-0"
                      fill={priorityColors[task.priority] || priorityColors.low}
                      stroke="none"
                    />
                  </div>

                  {task.description && (
                    <p
                      className="text-sm mt-0.5 line-clamp-1"
                      style={{ color: theme.textMuted }}
                    >
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: theme.textMuted }}>
                    {/* Due date */}
                    <span
                      className="flex items-center gap-1"
                      style={{ color: isOverdue ? "#ef4444" : theme.textMuted }}
                    >
                      <Clock className="h-3 w-3" />
                      {formatDueDate(task.dueDate)}
                    </span>

                    {/* Contact */}
                    {task.contact && (
                      <Link
                        href={`/contacts/${task.contact.id}`}
                        className="flex items-center gap-1 hover:underline"
                        style={{ color: theme.textMuted }}
                      >
                        <User className="h-3 w-3" />
                        {task.contact.name}
                      </Link>
                    )}

                    {/* Deal */}
                    {task.deal && (
                      <Link
                        href={`/deals/${task.deal.id}`}
                        className="flex items-center gap-1 hover:underline"
                        style={{ color: theme.textMuted }}
                      >
                        <Handshake className="h-3 w-3" />
                        {task.deal.title}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
