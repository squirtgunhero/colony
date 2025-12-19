"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
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

  // Count tasks for current month
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
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Day Headers */}
          {DAYS.map((day) => (
            <div key={day} className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
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
                className={cn(
                  "relative h-9 flex flex-col items-center justify-center rounded-lg text-[13px] transition-all duration-150 cursor-pointer",
                  todayMarker
                    ? "bg-foreground text-background font-semibold ring-2 ring-foreground ring-offset-2 ring-offset-card"
                    : hasTasks
                    ? "bg-muted/40 font-medium"
                    : "hover:bg-muted/30"
                )}
              >
                {day}
                {hasTasks && !todayMarker && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayTasks.slice(0, 2).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 w-1 rounded-full",
                          hasHighPriority ? "bg-[#c2410c]" : "bg-muted-foreground"
                        )}
                      />
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)] flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">
            <span className="font-medium text-foreground">{monthTaskCount}</span> tasks this month
          </p>
          <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1">
            Open Calendar
            <ArrowUpRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
