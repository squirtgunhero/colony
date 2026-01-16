"use client";

// ============================================
// COLONY - Task Panel for Context Drawer
// Shows task details in drawer format
// ============================================

import { useEffect, useState } from "react";
import { CheckSquare, Calendar, User, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  contact?: { id: string; name: string };
}

interface TaskPanelProps {
  entityId?: string;
}

export function TaskPanel({ entityId }: TaskPanelProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) {
      setLoading(false);
      return;
    }

    async function fetchTask() {
      try {
        const res = await fetch(`/api/tasks/${entityId}`);
        if (res.ok) {
          const json = await res.json();
          setTask(json);
        }
      } catch (error) {
        console.error("Failed to fetch task:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTask();
  }, [entityId]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <CheckSquare className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p>Task not found</p>
      </div>
    );
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex items-center justify-center h-10 w-10 rounded-lg shrink-0",
          task.completed 
            ? "bg-green-500/10 text-green-600 dark:text-green-400" 
            : "bg-muted"
        )}>
          <CheckSquare className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "text-lg font-semibold",
            task.completed && "line-through text-muted-foreground"
          )}>
            {task.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full capitalize",
              task.priority === "high" && "bg-red-500/10 text-red-600 dark:text-red-400",
              task.priority === "medium" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              task.priority === "low" && "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            )}>
              {task.priority} priority
            </span>
            {task.completed && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                Completed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Description
          </h4>
          <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            {task.description}
          </p>
        </div>
      )}

      {/* Details */}
      <div className="space-y-3">
        {task.dueDate && (
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg",
            isOverdue ? "bg-red-500/10" : "bg-muted/30"
          )}>
            {isOverdue ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Calendar className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className={cn(
                "text-sm font-medium",
                isOverdue && "text-red-600 dark:text-red-400"
              )}>
                {formatDate(new Date(task.dueDate))}
                {isOverdue && " (Overdue)"}
              </p>
            </div>
          </div>
        )}
        {task.contact && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Related Contact</p>
              <p className="text-sm font-medium">{task.contact.name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border/50">
        <Clock className="h-3.5 w-3.5" />
        <span>Created {formatDate(new Date(task.createdAt))}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" className="flex-1">
          Edit
        </Button>
        <Button 
          size="sm" 
          className="flex-1"
          variant={task.completed ? "outline" : "default"}
        >
          {task.completed ? "Mark Incomplete" : "Mark Complete"}
        </Button>
      </div>
    </div>
  );
}
