"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Calendar,
  CheckSquare,
  ListTodo,
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
  contactName: string;
  tasks: Task[];
}

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-green-500/20 text-green-400",
};

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
      // Reset form only for new tasks
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
          <DialogTitle>{task ? "Edit Task" : "Add Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update this task" : "Create a new task for this contact"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Follow up with client"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task details..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input 
                id="dueDate" 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
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
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : task ? "Update" : "Add Task"}
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
      "flex items-start gap-3 py-2 px-1 -mx-1 rounded-md hover:bg-muted/50 transition-colors",
      task.completed && "opacity-60"
    )}>
      <Checkbox
        checked={task.completed}
        onCheckedChange={async () => {
          await toggleTask(task.id, !task.completed);
          toast.success(task.completed ? "Task reopened" : "Task completed");
        }}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium leading-tight",
          task.completed && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <Badge 
            variant="outline" 
            className={cn("text-[10px] px-1.5 py-0", priorityColors[task.priority])}
          >
            {task.priority}
          </Badge>
          {task.dueDate && (
            <span className={cn(
              "text-xs text-muted-foreground flex items-center gap-1",
              isOverdue && !task.completed && "text-red-400"
            )}>
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(task.dueDate)}
            </span>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <AddTaskDialog contactId={contactId} task={task}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          </AddTaskDialog>
          <DropdownMenuItem
            className="text-destructive"
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

export function ContactTasks({ contactId, contactName, tasks }: ContactTasksProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          Tasks
          {pendingTasks.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingTasks.length}
            </Badge>
          )}
        </CardTitle>
        <AddTaskDialog contactId={contactId}>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Plus className="h-4 w-4" />
          </Button>
        </AddTaskDialog>
      </CardHeader>
      <CardContent className="pt-0">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mt-2">No tasks yet</p>
            <AddTaskDialog contactId={contactId}>
              <Button variant="link" size="sm" className="mt-1">
                Add your first task
              </Button>
            </AddTaskDialog>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Pending tasks */}
            {pendingTasks.map((task) => (
              <TaskItem key={task.id} task={task} contactId={contactId} />
            ))}
            
            {/* Completed tasks toggle */}
            {completedTasks.length > 0 && (
              <>
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground py-2 flex items-center gap-2 transition-colors"
                >
                  <div className="h-px flex-1 bg-border" />
                  <span>
                    {showCompleted ? "Hide" : "Show"} {completedTasks.length} completed
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </button>
                
                {showCompleted && (
                  <div className="space-y-1">
                    {completedTasks.map((task) => (
                      <TaskItem key={task.id} task={task} contactId={contactId} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

