"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  Megaphone,
  Home,
  CalendarDays,
  Loader2,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  type: string;
  channel: string | null;
  status: string;
  scheduledAt: Date | string;
  color: string | null;
}

interface ContentCalendarProps {
  initialEvents: CalendarEvent[];
}

const eventTypes = [
  { value: "ad_campaign", label: "Ad Campaign", color: "#3b82f6" },
  { value: "social_post", label: "Social Post", color: "#8b5cf6" },
  { value: "email", label: "Email", color: "#22c55e" },
  { value: "open_house", label: "Open House", color: "#f59e0b" },
  { value: "follow_up", label: "Follow-up", color: "#ef4444" },
  { value: "custom", label: "Custom", color: "#6b7280" },
];

const channels = [
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "email", label: "Email", icon: Mail },
];

function getChannelIcon(channel: string | null) {
  switch (channel) {
    case "facebook": return Facebook;
    case "instagram": return Instagram;
    case "linkedin": return Linkedin;
    case "email": return Mail;
    default: return CalendarDays;
  }
}

function getEventColor(type: string, customColor: string | null): string {
  if (customColor) return customColor;
  const found = eventTypes.find((t) => t.value === type);
  return found?.color || "#6b7280";
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const startPad = firstDay.getDay();

  // Pad from previous month
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  // Pad to complete last week
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }

  return days;
}

export function ContentCalendar({ initialEvents }: ContentCalendarProps) {
  const { theme } = useColonyTheme();
  const router = useRouter();
  const now = new Date();

  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Add event form state
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("social_post");
  const [newChannel, setNewChannel] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const days = getDaysInMonth(currentYear, currentMonth);

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  function getEventsForDate(date: Date): CalendarEvent[] {
    return events.filter((e) => {
      const eventDate = new Date(e.scheduledAt);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  }

  function handleDayClick(date: Date) {
    setSelectedDate(date);
    setShowAdd(true);
    setNewTitle("");
    setNewType("social_post");
    setNewChannel("");
    setNewDescription("");
  }

  async function handleCreate() {
    if (!newTitle || !selectedDate) return;
    setCreating(true);

    try {
      const res = await fetch("/api/marketing/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          type: newType,
          channel: newChannel || undefined,
          description: newDescription || undefined,
          startDate: selectedDate.toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      setEvents([...events, data.event]);
      setShowAdd(false);
    } catch (error) {
      console.error("Create event error:", error);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/marketing/calendar/${id}`, { method: "DELETE" });
      setEvents(events.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Delete event error:", error);
    }
  }

  const isToday = (date: Date) =>
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const isCurrentMonth = (date: Date) => date.getMonth() === currentMonth;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-light"
            style={{ fontFamily: "var(--font-spectral), Georgia, serif" }}
          >
            Content Calendar
          </h1>
          <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
            Plan and schedule your marketing activities
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Month navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg transition-colors hover:opacity-70"
              style={{ color: theme.textMuted }}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span
              className="text-sm font-medium min-w-[140px] text-center"
              style={{ color: theme.text }}
            >
              {MONTHS[currentMonth]} {currentYear}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg transition-colors hover:opacity-70"
              style={{ color: theme.textMuted }}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={() => {
              setCurrentMonth(now.getMonth());
              setCurrentYear(now.getFullYear());
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: withAlpha(theme.text, 0.05),
              color: theme.textMuted,
            }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {eventTypes.map((type) => (
          <div key={type.value} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: type.color }}
            />
            <span className="text-xs" style={{ color: theme.textMuted }}>
              {type.label}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: `1px solid ${withAlpha(theme.text, 0.08)}`,
        }}
      >
        {/* Day headers */}
        <div className="grid grid-cols-7">
          {DAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-3 text-center text-xs font-medium"
              style={{
                backgroundColor: withAlpha(theme.text, 0.04),
                color: theme.textMuted,
                borderBottom: `1px solid ${withAlpha(theme.text, 0.08)}`,
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7">
          {days.map((date, idx) => {
            const dayEvents = getEventsForDate(date);
            const today = isToday(date);
            const inMonth = isCurrentMonth(date);

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(date)}
                className="min-h-[100px] p-1.5 cursor-pointer transition-colors hover:opacity-80"
                style={{
                  backgroundColor: today
                    ? withAlpha(theme.accent, 0.05)
                    : "transparent",
                  borderRight:
                    (idx + 1) % 7 !== 0
                      ? `1px solid ${withAlpha(theme.text, 0.06)}`
                      : undefined,
                  borderBottom: `1px solid ${withAlpha(theme.text, 0.06)}`,
                  opacity: inMonth ? 1 : 0.35,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-medium inline-flex items-center justify-center ${today ? "h-6 w-6 rounded-full" : ""}`}
                    style={{
                      color: today ? "#fff" : theme.text,
                      backgroundColor: today ? theme.accent : "transparent",
                    }}
                  >
                    {date.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[9px]" style={{ color: theme.textMuted }}>
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Events */}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => {
                    const color = getEventColor(event.type, event.color);
                    return (
                      <div
                        key={event.id}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] truncate"
                        style={{
                          backgroundColor: withAlpha(color, 0.15),
                          color: color,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate">{event.title}</span>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] px-1.5" style={{ color: theme.textMuted }}>
                      +{dayEvents.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAdd && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div
            className="rounded-xl p-6 w-full max-w-md shadow-xl"
            style={{
              backgroundColor: theme.bg,
              border: `1px solid ${withAlpha(theme.text, 0.1)}`,
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-medium" style={{ color: theme.text }}>
                Add Event — {selectedDate.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </h3>
              <button
                onClick={() => setShowAdd(false)}
                className="p-1 rounded-lg hover:opacity-70"
                style={{ color: theme.textMuted }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Title */}
            <div className="mb-3">
              <label className="text-xs font-medium mb-1 block" style={{ color: theme.textMuted }}>
                Title
              </label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Post new listing on Instagram"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.05),
                  color: theme.text,
                  border: `1px solid ${withAlpha(theme.text, 0.1)}`,
                }}
                autoFocus
              />
            </div>

            {/* Type */}
            <div className="mb-3">
              <label className="text-xs font-medium mb-1 block" style={{ color: theme.textMuted }}>
                Type
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {eventTypes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setNewType(t.value)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor:
                        newType === t.value
                          ? withAlpha(t.color, 0.15)
                          : withAlpha(theme.text, 0.05),
                      color: newType === t.value ? t.color : theme.textMuted,
                      border: `1px solid ${newType === t.value ? withAlpha(t.color, 0.3) : "transparent"}`,
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Channel */}
            <div className="mb-3">
              <label className="text-xs font-medium mb-1 block" style={{ color: theme.textMuted }}>
                Channel (optional)
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {channels.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.value}
                      onClick={() =>
                        setNewChannel(newChannel === c.value ? "" : c.value)
                      }
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                      style={{
                        backgroundColor:
                          newChannel === c.value
                            ? withAlpha(theme.accent, 0.15)
                            : withAlpha(theme.text, 0.05),
                        color:
                          newChannel === c.value ? theme.accent : theme.textMuted,
                        border: `1px solid ${newChannel === c.value ? withAlpha(theme.accent, 0.3) : "transparent"}`,
                      }}
                    >
                      <Icon className="h-3 w-3" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="mb-5">
              <label className="text-xs font-medium mb-1 block" style={{ color: theme.textMuted }}>
                Notes (optional)
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Any additional details..."
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.05),
                  color: theme.text,
                  border: `1px solid ${withAlpha(theme.text, 0.1)}`,
                }}
              />
            </div>

            {/* Events on this day */}
            {getEventsForDate(selectedDate).length > 0 && (
              <div className="mb-5">
                <label className="text-xs font-medium mb-1.5 block" style={{ color: theme.textMuted }}>
                  Existing events
                </label>
                <div className="space-y-1">
                  {getEventsForDate(selectedDate).map((event) => {
                    const color = getEventColor(event.type, event.color);
                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: withAlpha(color, 0.1),
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs" style={{ color: theme.text }}>
                            {event.title}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="p-0.5 rounded hover:opacity-70"
                          style={{ color: theme.textMuted }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.05),
                  color: theme.textMuted,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle || creating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: theme.accent, color: "#fff" }}
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
