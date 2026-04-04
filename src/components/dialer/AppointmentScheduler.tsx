"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface AppointmentSchedulerProps {
  contactName: string;
  contactEmail?: string;
  callId?: string;
  onScheduled: (event: { eventId: string; startTime: string }) => void;
  onClose: () => void;
}

interface TimeSlot {
  start: string;
  end: string;
}

type DurationOption = 30 | 60 | 90;

// ============================================================================
// Component
// ============================================================================

export function AppointmentScheduler({
  contactName,
  contactEmail,
  callId,
  onScheduled,
  onClose,
}: AppointmentSchedulerProps) {
  const { theme } = useColonyTheme();

  // State
  const [selectedDay, setSelectedDay] = useState(0); // 0 = today, up to 6
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [busySlots, setBusySlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [summary, setSummary] = useState(`Meeting with ${contactName}`);
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState<DurationOption>(60);
  const [loading, setLoading] = useState(false);
  const [fetchingSlots, setFetchingSlots] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const borderColor = withAlpha(theme.text, 0.06);

  // Build the 7 day buttons (today through +6)
  const days = useMemo(() => {
    const result: { date: Date; label: string; short: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const label =
        i === 0
          ? "Today"
          : i === 1
          ? "Tomorrow"
          : d.toLocaleDateString(undefined, { weekday: "short" });
      const short = d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      result.push({ date: d, label, short });
    }
    return result;
  }, []);

  // Fetch availability for the selected day
  const fetchAvailability = useCallback(async () => {
    setFetchingSlots(true);
    setSelectedSlot(null);
    setError(null);

    const day = days[selectedDay].date;
    const startDate = new Date(day);
    startDate.setHours(8, 0, 0, 0);
    const endDate = new Date(day);
    endDate.setHours(18, 0, 0, 0);

    // If today, start from next 30-min boundary
    const now = new Date();
    if (startDate < now) {
      startDate.setTime(now.getTime());
      startDate.setMinutes(Math.ceil(startDate.getMinutes() / 30) * 30, 0, 0);
    }

    try {
      const res = await fetch(
        `/api/calendar/availability?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      if (!res.ok) {
        const data = await res.json();
        // If no calendar connected, still show all slots as available
        if (res.status === 422) {
          setError(null);
        } else {
          setError(data.error || "Failed to fetch availability");
        }
      }
      const data = await res.json();
      setAvailableSlots(data.available || []);
      setBusySlots(data.busySlots || []);
    } catch {
      // If calendar unavailable, generate local slots
      const slots: TimeSlot[] = [];
      const cursor = new Date(startDate);
      while (cursor < endDate) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + 30 * 60 * 1000);
        if (slotStart.getHours() >= 8 && slotStart.getHours() < 18) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
          });
        }
        cursor.setTime(cursor.getTime() + 30 * 60 * 1000);
      }
      setAvailableSlots(slots);
      setBusySlots([]);
    } finally {
      setFetchingSlots(false);
    }
  }, [days, selectedDay]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Build all display slots (busy + available) for the grid
  const displaySlots = useMemo(() => {
    const allSlots: (TimeSlot & { available: boolean })[] = [];

    // Combine available and busy into a unified grid
    const day = days[selectedDay].date;
    const startHour = 8;
    const endHour = 18;
    const now = new Date();

    for (let h = startHour; h < endHour; h++) {
      for (const m of [0, 30]) {
        const slotStart = new Date(day);
        slotStart.setHours(h, m, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

        // Skip past slots for today
        if (slotStart < now) continue;

        const isBusy = busySlots.some((busy) => {
          const bs = new Date(busy.start).getTime();
          const be = new Date(busy.end).getTime();
          return slotStart.getTime() < be && slotEnd.getTime() > bs;
        });

        allSlots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          available: !isBusy,
        });
      }
    }

    return allSlots;
  }, [days, selectedDay, busySlots]);

  // Schedule the appointment
  const handleSchedule = useCallback(async () => {
    if (!selectedSlot || !summary.trim()) return;

    setLoading(true);
    setError(null);

    const startTime = new Date(selectedSlot.start);
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: summary.trim(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          attendeeEmail: contactEmail || undefined,
          location: location.trim() || undefined,
          description: callId
            ? `Scheduled from Colony CRM dialer (Call: ${callId})`
            : "Scheduled from Colony CRM dialer",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to schedule appointment");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setSuccess(true);

      // Update call record if we have a callId
      if (callId) {
        await fetch("/api/dialer/calls", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callId,
            appointmentSet: true,
            appointmentDate: startTime.toISOString(),
            calendarEventId: data.eventId,
          }),
        });
      }

      // Notify parent after brief delay so user sees success state
      setTimeout(() => {
        onScheduled({
          eventId: data.eventId,
          startTime: startTime.toISOString(),
        });
      }, 1200);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedSlot, summary, duration, contactEmail, location, callId, onScheduled]);

  const formatSlotTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const durationOptions: { value: DurationOption; label: string }[] = [
    { value: 30, label: "30 min" },
    { value: 60, label: "1 hour" },
    { value: 90, label: "1.5 hours" },
  ];

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{
          backgroundColor: theme.bg,
          border: `1px solid ${borderColor}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 sticky top-0 z-10"
          style={{
            backgroundColor: theme.bg,
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: withAlpha(theme.accent, 0.1) }}
            >
              <Calendar className="h-4 w-4" style={{ color: theme.accent }} />
            </div>
            <div>
              <h2
                className="text-[15px] font-semibold"
                style={{ color: theme.text }}
              >
                Schedule Appointment
              </h2>
              <p
                className="text-[11px]"
                style={{ color: withAlpha(theme.text, 0.4) }}
              >
                with {contactName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-70"
            style={{ backgroundColor: withAlpha(theme.text, 0.06) }}
          >
            <X className="h-4 w-4" style={{ color: withAlpha(theme.text, 0.5) }} />
          </button>
        </div>

        {/* Success state */}
        {success && (
          <div className="p-10 flex flex-col items-center gap-4">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: withAlpha("#22c55e", 0.12) }}
            >
              <Check className="h-7 w-7" style={{ color: "#22c55e" }} />
            </div>
            <p
              className="text-[15px] font-semibold"
              style={{ color: theme.text }}
            >
              Appointment Scheduled
            </p>
            {selectedSlot && (
              <p
                className="text-[13px] text-center"
                style={{ color: withAlpha(theme.text, 0.5) }}
              >
                {new Date(selectedSlot.start).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}{" "}
                at {formatSlotTime(selectedSlot.start)}
              </p>
            )}
          </div>
        )}

        {/* Main form */}
        {!success && (
          <div className="p-5 space-y-5">
            {/* Day picker */}
            <div>
              <p
                className="text-[11px] uppercase tracking-wider font-medium mb-2.5"
                style={{ color: withAlpha(theme.text, 0.4) }}
              >
                Select Date
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {days.map((day, i) => {
                  const isSelected = selectedDay === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(i)}
                      className="flex-shrink-0 flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all"
                      style={{
                        backgroundColor: isSelected
                          ? withAlpha(theme.accent, 0.12)
                          : withAlpha(theme.text, 0.03),
                        border: isSelected
                          ? `1.5px solid ${withAlpha(theme.accent, 0.3)}`
                          : `1px solid ${withAlpha(theme.text, 0.06)}`,
                      }}
                    >
                      <span
                        className="text-[11px] font-medium"
                        style={{
                          color: isSelected
                            ? theme.accent
                            : withAlpha(theme.text, 0.5),
                        }}
                      >
                        {day.label}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{
                          color: isSelected
                            ? withAlpha(theme.accent, 0.7)
                            : withAlpha(theme.text, 0.3),
                        }}
                      >
                        {day.short}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slot grid */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Clock
                  className="h-3.5 w-3.5"
                  style={{ color: withAlpha(theme.text, 0.3) }}
                />
                <p
                  className="text-[11px] uppercase tracking-wider font-medium"
                  style={{ color: withAlpha(theme.text, 0.4) }}
                >
                  Available Times
                </p>
              </div>

              {fetchingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2
                    className="h-5 w-5 animate-spin"
                    style={{ color: withAlpha(theme.text, 0.3) }}
                  />
                </div>
              ) : displaySlots.length === 0 ? (
                <div
                  className="text-center py-8 rounded-xl"
                  style={{
                    backgroundColor: withAlpha(theme.text, 0.02),
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <p
                    className="text-[13px]"
                    style={{ color: withAlpha(theme.text, 0.4) }}
                  >
                    No available slots for this day.
                  </p>
                </div>
              ) : (
                <div
                  className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto rounded-xl p-3"
                  style={{
                    backgroundColor: withAlpha(theme.text, 0.02),
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  {displaySlots.map((slot) => {
                    const isSelected =
                      selectedSlot?.start === slot.start;
                    const isAvailable = slot.available;

                    return (
                      <button
                        key={slot.start}
                        onClick={() =>
                          isAvailable ? setSelectedSlot(slot) : undefined
                        }
                        disabled={!isAvailable}
                        className="h-9 rounded-lg text-[11px] font-medium transition-all"
                        style={{
                          backgroundColor: isSelected
                            ? withAlpha(theme.accent, 0.15)
                            : !isAvailable
                            ? withAlpha(theme.text, 0.03)
                            : withAlpha(theme.text, 0.04),
                          color: isSelected
                            ? theme.accent
                            : !isAvailable
                            ? withAlpha(theme.text, 0.2)
                            : withAlpha(theme.text, 0.6),
                          border: isSelected
                            ? `1.5px solid ${withAlpha(theme.accent, 0.3)}`
                            : `1px solid ${
                                !isAvailable
                                  ? withAlpha(theme.text, 0.03)
                                  : withAlpha(theme.text, 0.06)
                              }`,
                          cursor: isAvailable ? "pointer" : "not-allowed",
                          textDecoration: !isAvailable
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {formatSlotTime(slot.start)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Duration selector */}
            <div>
              <p
                className="text-[11px] uppercase tracking-wider font-medium mb-2"
                style={{ color: withAlpha(theme.text, 0.4) }}
              >
                Duration
              </p>
              <div className="flex gap-2">
                {durationOptions.map((opt) => {
                  const isSelected = duration === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setDuration(opt.value)}
                      className="flex-1 h-9 rounded-lg text-[12px] font-medium transition-all"
                      style={{
                        backgroundColor: isSelected
                          ? withAlpha(theme.accent, 0.12)
                          : withAlpha(theme.text, 0.04),
                        color: isSelected
                          ? theme.accent
                          : withAlpha(theme.text, 0.5),
                        border: isSelected
                          ? `1.5px solid ${withAlpha(theme.accent, 0.3)}`
                          : `1px solid ${withAlpha(theme.text, 0.06)}`,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary input */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User
                  className="h-3.5 w-3.5"
                  style={{ color: withAlpha(theme.text, 0.3) }}
                />
                <p
                  className="text-[11px] uppercase tracking-wider font-medium"
                  style={{ color: withAlpha(theme.text, 0.4) }}
                >
                  Summary
                </p>
              </div>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Meeting title..."
                className="w-full h-10 px-3 rounded-lg text-[13px] focus:outline-none"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.04),
                  border: `1px solid ${withAlpha(theme.text, 0.06)}`,
                  color: theme.text,
                }}
              />
            </div>

            {/* Location input */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin
                  className="h-3.5 w-3.5"
                  style={{ color: withAlpha(theme.text, 0.3) }}
                />
                <p
                  className="text-[11px] uppercase tracking-wider font-medium"
                  style={{ color: withAlpha(theme.text, 0.4) }}
                >
                  Location (optional)
                </p>
              </div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office, Zoom link, etc."
                className="w-full h-10 px-3 rounded-lg text-[13px] focus:outline-none"
                style={{
                  backgroundColor: withAlpha(theme.text, 0.04),
                  border: `1px solid ${withAlpha(theme.text, 0.06)}`,
                  color: theme.text,
                }}
              />
            </div>

            {/* Error message */}
            {error && (
              <div
                className="rounded-lg px-3 py-2 text-[12px]"
                style={{
                  backgroundColor: withAlpha("#ef4444", 0.08),
                  color: "#ef4444",
                  border: `1px solid ${withAlpha("#ef4444", 0.15)}`,
                }}
              >
                {error}
              </div>
            )}

            {/* Schedule button */}
            <button
              onClick={handleSchedule}
              disabled={!selectedSlot || !summary.trim() || loading}
              className="w-full h-12 rounded-xl text-[14px] font-semibold transition-all hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: theme.accent,
                color: theme.bg,
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Schedule Appointment
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
