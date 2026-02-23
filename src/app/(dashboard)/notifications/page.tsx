"use client";

import { useState } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { PageHeader } from "@/components/layout/page-header";
import { Bell, CheckCircle2, AlertCircle, Info, Calendar, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const initialNotifications = [
  {
    id: "1",
    type: "info",
    title: "Welcome to Colony",
    description: "Get started by adding your first contact or property.",
    time: "Just now",
    read: false,
  },
  {
    id: "2",
    type: "task",
    title: "No upcoming tasks",
    description: "You're all caught up! Add tasks to stay organized.",
    time: "1 hour ago",
    read: true,
  },
  {
    id: "3",
    type: "deal",
    title: "Set up your pipeline",
    description: "Start tracking deals to monitor your sales progress.",
    time: "2 hours ago",
    read: true,
  },
];

const iconMap: Record<string, typeof Bell> = {
  info: Info,
  task: Calendar,
  deal: Target,
  success: CheckCircle2,
  warning: AlertCircle,
};

export default function NotificationsPage() {
  const { theme } = useColonyTheme();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [pressedBtn, setPressedBtn] = useState<string | null>(null);

  const hasUnread = notifications.some((n) => !n.read);

  const neumorphicRaised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;
  const neumorphicPressed = `inset 3px 3px 6px rgba(0,0,0,0.4), inset -3px -3px 6px rgba(255,255,255,0.04)`;

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const handleClearAll = () => {
    setNotifications([]);
    toast.success("All notifications cleared");
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Notifications"
        description="Stay updated on your activities and important alerts."
      />

      <div className="p-4 sm:p-6 max-w-3xl">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" style={{ color: theme.accent }} />
            <h2
              className="text-lg font-semibold"
              style={{ color: theme.text, fontFamily: "'DM Sans', sans-serif" }}
            >
              Recent Notifications
            </h2>
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              {hasUnread && (
                <button
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                  style={{
                    backgroundColor: theme.bgGlow,
                    color: theme.textMuted,
                    boxShadow: pressedBtn === "mark" ? neumorphicPressed : neumorphicRaised,
                  }}
                  onMouseDown={() => setPressedBtn("mark")}
                  onMouseUp={() => setPressedBtn(null)}
                  onMouseLeave={() => setPressedBtn(null)}
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </button>
              )}
              <button
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                style={{
                  backgroundColor: theme.bgGlow,
                  color: theme.textMuted,
                  boxShadow: pressedBtn === "clear" ? neumorphicPressed : neumorphicRaised,
                }}
                onMouseDown={() => setPressedBtn("clear")}
                onMouseUp={() => setPressedBtn(null)}
                onMouseLeave={() => setPressedBtn(null)}
                onClick={handleClearAll}
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Notification list */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-12 w-12 mb-4" style={{ color: theme.accent, opacity: 0.4 }} />
            <p className="text-lg font-medium" style={{ color: theme.textMuted }}>
              No notifications
            </p>
            <p className="text-sm mt-1" style={{ color: withAlpha(theme.text, 0.35) }}>
              You&apos;re all caught up!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = iconMap[notification.type] || Bell;
              return (
                <div
                  key={notification.id}
                  className="flex items-start gap-4 p-4 rounded-xl transition-all duration-200"
                  style={{
                    backgroundColor: notification.read
                      ? theme.bgGlow
                      : withAlpha(theme.accent, 0.06),
                    boxShadow: neumorphicRaised,
                  }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
                    style={{
                      backgroundColor: withAlpha(theme.accent, 0.15),
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: theme.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="font-medium"
                        style={{ color: notification.read ? theme.textSoft : theme.text }}
                      >
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span
                          className="h-2 w-2 rounded-full shrink-0 mt-2"
                          style={{ backgroundColor: theme.accent }}
                        />
                      )}
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: theme.textMuted }}>
                      {notification.description}
                    </p>
                    <p
                      className="text-xs mt-2"
                      style={{ color: withAlpha(theme.text, 0.3) }}
                    >
                      {notification.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
