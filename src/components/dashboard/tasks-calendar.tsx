"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  dueDate: Date | null;
  priority: string;
}

interface TasksCalendarProps {
  tasks: Task[];
}

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function TasksCalendar({ tasks }: TasksCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { theme } = useColonyTheme();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const totalDays = lastDayOfMonth.getDate();

  let startDay = firstDayOfMonth.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  const getTasksForDate = (day: number) => {
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === day &&
        taskDate.getMonth() === month &&
        taskDate.getFullYear() === year
      );
    });
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const monthTaskCount = tasks.filter((task) => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    return taskDate.getMonth() === month && taskDate.getFullYear() === year;
  }).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-overline mb-1">Schedule</p>
            <p className="text-title-sm">{MONTHS[month]} {year}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-7 gap-0.5">
          {DAYS.map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-medium uppercase tracking-wide py-2"
              style={{ color: theme.textMuted }}
            >
              {day}
            </div>
          ))}

          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-9" />;
            }

            const dayTasks = getTasksForDate(day);
            const hasHighPriority = dayTasks.some((t) => t.priority === "high");
            const hasTasks = dayTasks.length > 0;
            const todayMarker = isToday(day);

            return (
              <div
                key={day}
                className="relative h-9 flex flex-col items-center justify-center rounded-lg text-[13px] cursor-pointer transition-colors duration-150"
                style={{
                  backgroundColor: todayMarker
                    ? theme.accent
                    : hasTasks
                    ? theme.surface
                    : "transparent",
                  color: todayMarker ? theme.bg : theme.text,
                  fontWeight: todayMarker ? 600 : hasTasks ? 500 : 400,
                }}
              >
                {day}
                {hasTasks && !todayMarker && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayTasks.slice(0, 2).map((_, i) => (
                      <div
                        key={i}
                        className="h-1 w-1 rounded-full"
                        style={{
                          backgroundColor: hasHighPriority ? theme.accent : theme.textMuted,
                        }}
                      />
                    ))}
                    {dayTasks.length > 2 && (
                      <div
                        className="h-1 w-1 rounded-full"
                        style={{ backgroundColor: theme.textMuted, opacity: 0.4 }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="mt-4 pt-4 flex items-center justify-between"
          style={{ borderTop: `1px solid ${theme.accentSoft}` }}
        >
          <p className="text-[12px]" style={{ color: theme.textMuted }}>
            <span className="font-medium" style={{ color: theme.text }}>{monthTaskCount}</span> tasks this month
          </p>
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" style={{ color: theme.textMuted }}>
            Open Calendar
            <ArrowUpRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
