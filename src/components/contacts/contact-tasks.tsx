"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toggleTask, deleteTask, createTask, updateTask } from "@/app/(dashboard)/tasks/actions";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: string;
  completed: boolean;
}

interface ContactTasksProps {
  contactId: string;
  tasks: Task[];
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
          <DialogTitle className="text-lg font-medium">{task ? "Edit Task" : "New Task"}</DialogTitle>
          <DialogDescription className="text-stone-500">
            {task ? "Update task details" : "Add a task for this contact"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-medium text-stone-600">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Follow up with client"
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-medium text-stone-600">Description</Label>
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
              <Label htmlFor="dueDate" className="text-xs font-medium text-stone-600">Due Date</Label>
              <Input 
                id="dueDate" 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-xs font-medium text-stone-600">Priority</Label>
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-sm"
            >
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

function TaskItem({ 
  task, 
  contactId,
}: { 
  task: Task; 
  contactId: string;
}) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && 
    new Date(task.dueDate).toDateString() !== new Date().toDateString();

  return (
    <div className={cn(
      "flex items-start gap-3 px-5 py-3 hover:bg-stone-50 transition-colors",
      task.completed && "opacity-50"
    )}>
      <Checkbox
        checked={task.completed}
        onCheckedChange={async () => {
          await toggleTask(task.id, !task.completed);
          toast.success(task.completed ? "Task reopened" : "Task completed");
        }}
        className="mt-0.5 border-stone-300 data-[state=checked]:bg-stone-900 data-[state=checked]:border-stone-900"
      />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm text-stone-900",
          task.completed && "line-through text-stone-400"
        )}>
          {task.title}
        </p>
        {task.dueDate && !task.completed && (
          <p className={cn(
            "text-xs mt-0.5",
            isOverdue ? "text-red-500" : "text-stone-400"
          )}>
            {isOverdue ? "Overdue" : formatDistanceToNow(task.dueDate)}
          </p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-6 w-6 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors rounded">
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

export function ContactTasks({ contactId, tasks }: ContactTasksProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <section className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <h2 className="text-sm font-medium text-stone-900">
          Tasks
          {pendingTasks.length > 0 && (
            <span className="text-stone-400 font-normal ml-1.5">{pendingTasks.length}</span>
          )}
        </h2>
        <AddTaskDialog contactId={contactId}>
          <button className="text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </AddTaskDialog>
      </div>
      
      {tasks.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-stone-400">No tasks yet</p>
          <AddTaskDialog contactId={contactId}>
            <button className="text-sm text-stone-500 hover:text-stone-700 mt-1 underline underline-offset-2">
              Add your first task
            </button>
          </AddTaskDialog>
        </div>
      ) : (
        <div className="divide-y divide-stone-50">
          {/* Pending tasks */}
          {pendingTasks.map((task) => (
            <TaskItem key={task.id} task={task} contactId={contactId} />
          ))}
          
          {/* Completed tasks toggle */}
          {completedTasks.length > 0 && (
            <>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="w-full px-5 py-2.5 text-xs text-stone-400 hover:text-stone-600 transition-colors text-center bg-stone-50/50"
              >
                {showCompleted ? "Hide" : "Show"} {completedTasks.length} completed
              </button>
              
              {showCompleted && completedTasks.map((task) => (
                <TaskItem key={task.id} task={task} contactId={contactId} />
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}
