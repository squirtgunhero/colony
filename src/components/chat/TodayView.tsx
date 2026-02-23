"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { toggleTask } from "@/app/(dashboard)/tasks/actions";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  TrendingUp,
  Clock,
  Activity,
} from "lucide-react";

interface TodayTask {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  contact: { id: string; name: string } | null;
}

interface TodayActivity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
  contact: { id: string; name: string } | null;
  deal: { id: string; title: string } | null;
}

interface DealChange {
  id: string;
  title: string;
  deal: { id: string; title: string; stage: string } | null;
  createdAt: string;
}

interface TodayData {
  tasksDueToday: TodayTask[];
  overdueTasks: TodayTask[];
  recentActivities: TodayActivity[];
  dealChanges: DealChange[];
}

export function TodayView() {
  const { theme } = useColonyTheme();
  const [data, setData] = useState<TodayData | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/chat/today")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => {});
  }, []);

  const handleToggleTask = async (taskId: string) => {
    setCompletedIds((prev) => new Set(prev).add(taskId));
    try {
      await toggleTask(taskId, true);
    } catch {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2" style={{ color: theme.textMuted }}>
          <Clock className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading your day...</span>
        </div>
      </div>
    );
  }

  const isEmpty =
    data.tasksDueToday.length === 0 &&
    data.overdueTasks.length === 0 &&
    data.recentActivities.length === 0 &&
    data.dealChanges.length === 0;

  if (isEmpty) {
    return (
      <div className="text-center py-12 px-4">
        <Activity className="h-10 w-10 mx-auto mb-3" style={{ color: theme.accent, opacity: 0.4 }} />
        <p style={{ color: theme.textMuted, fontFamily: "'DM Sans', sans-serif" }}>
          Nothing on the schedule today. Enjoy the quiet.
        </p>
      </div>
    );
  }

  const neumorphicRaised = `3px 3px 6px rgba(0,0,0,0.35), -3px -3px 6px rgba(255,255,255,0.03)`;

  return (
    <div className="space-y-6 w-full max-w-lg mx-auto">
      {/* Overdue tasks */}
      {data.overdueTasks.length > 0 && (
        <Section
          title="Overdue"
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          accentColor="#ef4444"
          theme={theme}
        >
          {data.overdueTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              completed={completedIds.has(task.id)}
              onToggle={handleToggleTask}
              theme={theme}
              neumorphic={neumorphicRaised}
              isOverdue
            />
          ))}
        </Section>
      )}

      {/* Due today */}
      {data.tasksDueToday.length > 0 && (
        <Section
          title="Due Today"
          icon={<Clock className="h-3.5 w-3.5" />}
          accentColor={theme.accent}
          theme={theme}
        >
          {data.tasksDueToday.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              completed={completedIds.has(task.id)}
              onToggle={handleToggleTask}
              theme={theme}
              neumorphic={neumorphicRaised}
            />
          ))}
        </Section>
      )}

      {/* Deal changes */}
      {data.dealChanges.length > 0 && (
        <Section
          title="Deal Updates"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          accentColor={theme.accent}
          theme={theme}
        >
          {data.dealChanges.map((change) => (
            <div
              key={change.id}
              className="px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: theme.bgGlow, boxShadow: neumorphicRaised }}
            >
              <p style={{ color: theme.text }}>{change.title}</p>
              {change.deal && (
                <Link
                  href={`/deals/${change.deal.id}`}
                  className="text-xs mt-1 block transition-colors"
                  style={{ color: theme.accent }}
                >
                  {change.deal.title} &rarr; {change.deal.stage}
                </Link>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Recent activity */}
      {data.recentActivities.length > 0 && (
        <Section
          title="Today's Activity"
          icon={<Activity className="h-3.5 w-3.5" />}
          accentColor={theme.accent}
          theme={theme}
        >
          {data.recentActivities.slice(0, 5).map((act) => (
            <div
              key={act.id}
              className="px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: theme.bgGlow, boxShadow: neumorphicRaised }}
            >
              <p style={{ color: theme.text }}>{act.title}</p>
              {act.contact && (
                <span className="text-xs" style={{ color: theme.textMuted }}>
                  {act.contact.name}
                </span>
              )}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  accentColor,
  theme,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  theme: { text: string; textMuted: string };
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: accentColor }}>{icon}</span>
        <h3
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: theme.textMuted, fontFamily: "'DM Sans', sans-serif" }}
        >
          {title}
        </h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function TaskItem({
  task,
  completed,
  onToggle,
  theme,
  neumorphic,
  isOverdue,
}: {
  task: TodayTask;
  completed: boolean;
  onToggle: (id: string) => void;
  theme: { text: string; textMuted: string; bgGlow: string; accent: string };
  neumorphic: string;
  isOverdue?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all"
      style={{
        backgroundColor: theme.bgGlow,
        boxShadow: neumorphic,
        opacity: completed ? 0.5 : 1,
      }}
    >
      <button
        onClick={() => onToggle(task.id)}
        className="shrink-0 transition-colors"
        style={{ color: completed ? theme.accent : theme.textMuted }}
      >
        {completed ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          style={{
            color: theme.text,
            textDecoration: completed ? "line-through" : "none",
          }}
        >
          {task.title}
        </p>
        {task.contact && (
          <span className="text-xs" style={{ color: theme.textMuted }}>
            {task.contact.name}
          </span>
        )}
      </div>
      {isOverdue && !completed && (
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
          style={{
            backgroundColor: withAlpha("#ef4444", 0.15),
            color: "#ef4444",
          }}
        >
          overdue
        </span>
      )}
    </div>
  );
}
