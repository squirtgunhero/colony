"use client";

import { useState, useTransition } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  initializeClosingChecklist,
  toggleClosingTask,
  addClosingTask,
  deleteClosingTask,
} from "./actions";
import { CheckCircle, Circle, Plus, Trash2, ListChecks } from "lucide-react";

interface ClosingTask {
  id: string;
  title: string;
  category: string;
  dueDate: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  position: number;
}

interface Props {
  dealId: string;
  tasks: ClosingTask[];
}

const categoryLabels: Record<string, string> = {
  contract: "Contract",
  inspection: "Inspection",
  appraisal: "Appraisal",
  title: "Title",
  financing: "Financing",
  closing: "Closing",
  general: "General",
};

const categoryOrder = ["contract", "inspection", "appraisal", "title", "financing", "closing", "general"];

export function ClosingChecklist({ dealId, tasks }: Props) {
  const { theme } = useColonyTheme();
  const borderColor = withAlpha(theme.text, 0.06);
  const [isPending, startTransition] = useTransition();
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [showAdd, setShowAdd] = useState(false);

  const completed = tasks.filter((t) => t.isCompleted).length;
  const total = tasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Group by category
  const grouped = categoryOrder
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat] || cat,
      tasks: tasks.filter((t) => t.category === cat),
    }))
    .filter((g) => g.tasks.length > 0);

  if (tasks.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: withAlpha(theme.text, 0.02), border: `1px solid ${borderColor}` }}
      >
        <ListChecks className="h-8 w-8 mx-auto mb-3" style={{ color: withAlpha(theme.text, 0.2) }} />
        <p className="text-[14px] font-medium mb-1" style={{ color: theme.text }}>
          No closing checklist yet
        </p>
        <p className="text-[12px] mb-4" style={{ color: withAlpha(theme.text, 0.4) }}>
          Initialize the default closing checklist to track your transaction tasks
        </p>
        <button
          onClick={() => startTransition(() => initializeClosingChecklist(dealId))}
          disabled={isPending}
          className="h-9 px-5 rounded-lg text-[13px] font-medium transition-all"
          style={{ backgroundColor: theme.accent, color: theme.bg }}
        >
          {isPending ? "Creating..." : "Create Closing Checklist"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl" style={{ backgroundColor: withAlpha(theme.text, 0.02), border: `1px solid ${borderColor}` }}>
      {/* Header */}
      <div className="p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${borderColor}` }}>
        <div className="flex items-center gap-3">
          <ListChecks className="h-4 w-4" style={{ color: theme.accent }} />
          <h3 className="text-[15px] font-medium" style={{ color: theme.text }}>Closing Checklist</h3>
          <span className="text-[12px] ml-1" style={{ color: withAlpha(theme.text, 0.4) }}>
            {completed} / {total}
          </span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 text-[12px] font-medium transition-colors"
          style={{ color: theme.accent }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Task
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-4 pb-2">
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: withAlpha(theme.text, 0.08) }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: progress === 100 ? "#22c55e" : theme.accent,
            }}
          />
        </div>
        <p className="text-[11px] text-right mt-1" style={{ color: withAlpha(theme.text, 0.3) }}>
          {progress}% complete
        </p>
      </div>

      {/* Add task form */}
      {showAdd && (
        <div className="px-5 pb-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTitle.trim()) return;
              startTransition(async () => {
                await addClosingTask(dealId, newTitle.trim(), newCategory);
                setNewTitle("");
                setShowAdd(false);
              });
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title..."
              className="flex-1 h-9 px-3 rounded-lg text-[13px] outline-none bg-transparent"
              style={{ border: `1px solid ${borderColor}`, color: theme.text }}
              autoFocus
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="h-9 px-2 rounded-lg text-[12px] outline-none bg-transparent"
              style={{ border: `1px solid ${borderColor}`, color: theme.text }}
            >
              {categoryOrder.map((cat) => (
                <option key={cat} value={cat} style={{ backgroundColor: theme.bg }}>
                  {categoryLabels[cat]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isPending || !newTitle.trim()}
              className="h-9 px-4 rounded-lg text-[12px] font-medium"
              style={{ backgroundColor: theme.accent, color: theme.bg }}
            >
              Add
            </button>
          </form>
        </div>
      )}

      {/* Task groups */}
      <div className="px-5 pb-5 space-y-4">
        {grouped.map((group) => (
          <div key={group.category}>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-2"
              style={{ color: withAlpha(theme.text, 0.35) }}
            >
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 group py-1.5 px-2 -mx-2 rounded-lg transition-colors hover:bg-white/[0.02]"
                >
                  <button
                    onClick={() =>
                      startTransition(() => toggleClosingTask(task.id, !task.isCompleted))
                    }
                    className="shrink-0 transition-colors"
                    style={{ color: task.isCompleted ? "#22c55e" : withAlpha(theme.text, 0.2) }}
                  >
                    {task.isCompleted ? (
                      <CheckCircle className="h-4.5 w-4.5" />
                    ) : (
                      <Circle className="h-4.5 w-4.5" />
                    )}
                  </button>
                  <span
                    className="flex-1 text-[13px] transition-all"
                    style={{
                      color: task.isCompleted ? withAlpha(theme.text, 0.3) : theme.text,
                      textDecoration: task.isCompleted ? "line-through" : "none",
                    }}
                  >
                    {task.title}
                  </span>
                  {task.isCompleted && task.completedAt && (
                    <span className="text-[10px] shrink-0" style={{ color: withAlpha(theme.text, 0.25) }}>
                      {new Date(task.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                  <button
                    onClick={() => startTransition(() => deleteClosingTask(task.id))}
                    className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
                    style={{ color: withAlpha(theme.text, 0.3) }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
