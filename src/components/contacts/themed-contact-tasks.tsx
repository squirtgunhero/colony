"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toggleTask, deleteTask, createTask, updateTask } from "@/app/(dashboard)/tasks/actions";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
import { formatDistanceToNow } from "@/lib/date-utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: string;
  completed: boolean;
}

function AddTaskDialog({
  contactId,
  children,
  task,
}: {
  contactId: string;
  children: React.ReactNode;
  task?: Task;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
  );
  const [priority, setPriority] = useState(task?.priority || "medium");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsLoading(true);
    try {
      if (task) {
        await updateTask(task.id, {
          title,
          description: description || undefined,
          dueDate: dueDate || undefined,
          priority,
          contactId,
        });
        toast.success("Task updated");
      } else {
        await createTask({
          title,
          description: description || undefined,
          dueDate: dueDate || undefined,
          priority,
          contactId,
        });
        toast.success("Task created");
      }
      setOpen(false);
      if (!task) {
        setTitle("");
        setDescription("");
        setDueDate("");
        setPriority("medium");
      }
    } catch (error) {
      console.error("Failed to save task:", error);
      toast.error("Failed to save task");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">
            {task ? "Edit Task" : "New Task"}
          </DialogTitle>
          <DialogDescription>
            {task ? "Update task details" : "Add a task for this contact"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-medium">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Follow up with client"
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              rows={2}
              className="text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-xs font-medium">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-xs font-medium">
                Priority
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-sm">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="text-sm">
              {isLoading ? "Saving..." : task ? "Save" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ThemedContactTasks({
  contactId,
  tasks,
}: {
  contactId: string;
  tasks: Task[];
}) {
  const { theme } = useColonyTheme();
  const [showCompleted, setShowCompleted] = useState(false);

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  if (tasks.length === 0) {
    return (
      <div className="py-2">
        <p className="text-sm" style={{ color: theme.textMuted }}>
          No tasks yet
        </p>
        <AddTaskDialog contactId={contactId}>
          <button
            className="text-sm mt-1 transition-colors"
            style={{ color: theme.textMuted }}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
          >
            + Add your first task
          </button>
        </AddTaskDialog>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {pendingTasks.map((task) => (
        <TaskItem key={task.id} task={task} contactId={contactId} theme={theme} />
      ))}

      {completedTasks.length > 0 && (
        <>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full py-2 text-xs transition-colors text-center"
            style={{ color: withAlpha(theme.text, 0.3) }}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.textMuted)}
            onMouseLeave={(e) => (e.currentTarget.style.color = withAlpha(theme.text, 0.3))}
          >
            {showCompleted ? "Hide" : "Show"} {completedTasks.length} completed
          </button>
          {showCompleted &&
            completedTasks.map((task) => (
              <TaskItem key={task.id} task={task} contactId={contactId} theme={theme} />
            ))}
        </>
      )}

      <AddTaskDialog contactId={contactId}>
        <button
          className="flex items-center gap-1.5 text-xs font-medium pt-2 transition-colors"
          style={{ color: theme.textMuted }}
          onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
          onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </AddTaskDialog>
    </div>
  );
}

function TaskItem({
  task,
  contactId,
  theme,
}: {
  task: Task;
  contactId: string;
  theme: ReturnType<typeof useColonyTheme>["theme"];
}) {
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    new Date(task.dueDate).toDateString() !== new Date().toDateString();

  return (
    <div
      className="flex items-start gap-3 py-2 px-3 -mx-3 rounded-lg transition-colors"
      style={{ opacity: task.completed ? 0.45 : 1 }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.04))}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={async () => {
          await toggleTask(task.id, !task.completed);
          toast.success(task.completed ? "Task reopened" : "Task completed");
        }}
        className="mt-0.5"
        style={{
          borderColor: withAlpha(theme.text, 0.2),
        }}
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-sm"
          style={{
            color: theme.text,
            textDecoration: task.completed ? "line-through" : "none",
          }}
        >
          {task.title}
        </p>
        {task.dueDate && !task.completed && (
          <p
            className="text-xs mt-0.5"
            style={{ color: isOverdue ? "#ef4444" : theme.textMuted }}
          >
            {isOverdue ? "Overdue" : formatDistanceToNow(new Date(task.dueDate))}
          </p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="h-6 w-6 flex items-center justify-center rounded transition-colors"
            style={{ color: withAlpha(theme.text, 0.25) }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <AddTaskDialog contactId={contactId} task={task}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          </AddTaskDialog>
          <DropdownMenuItem
            className="text-red-600"
            onClick={async () => {
              await deleteTask(task.id);
              toast.success("Task deleted");
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
