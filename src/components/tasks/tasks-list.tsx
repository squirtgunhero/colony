"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskDialog } from "./task-dialog";
import { toggleTask, deleteTask } from "@/app/(dashboard)/tasks/actions";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  Calendar,
  User,
  Building2,
  Handshake,
  CheckSquare,
} from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: string;
  completed: boolean;
  contact: { id: string; name: string } | null;
  property: { id: string; address: string; city: string } | null;
  deal: { id: string; title: string } | null;
}

interface Contact {
  id: string;
  name: string;
}

interface Property {
  id: string;
  address: string;
  city: string;
}

interface Deal {
  id: string;
  title: string;
}

interface TasksListProps {
  tasks: Task[];
  contacts: Contact[];
  properties: Property[];
  deals: Deal[];
}

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

export function TasksList({
  tasks,
  contacts,
  properties,
  deals,
}: TasksListProps) {
  const [search, setSearch] = useState("");

  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.description?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  const isOverdue = (dueDate: Date | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <Card
      className={cn(
        "transition-all",
        task.completed && "opacity-60"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Checkbox
            checked={task.completed}
            onCheckedChange={async () => {
              await toggleTask(task.id, !task.completed);
              toast.success(task.completed ? "Task reopened" : "Task completed", {
                description: task.title,
              });
            }}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4
                  className={cn(
                    "font-medium",
                    task.completed && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </h4>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <TaskDialog
                    task={task}
                    contacts={contacts}
                    properties={properties}
                    deals={deals}
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  </TaskDialog>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={async () => {
                      await deleteTask(task.id);
                      toast.success("Task deleted", {
                        description: `${task.title} has been removed.`,
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge
                variant="outline"
                className={priorityColors[task.priority] || ""}
              >
                {task.priority}
              </Badge>

              {task.dueDate && (
                <Badge
                  variant="outline"
                  className={cn(
                    "flex items-center gap-1",
                    isOverdue(task.dueDate) &&
                      !task.completed &&
                      "bg-red-500/20 text-red-400 border-red-500/30"
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  {formatDate(task.dueDate)}
                </Badge>
              )}

              {task.contact && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {task.contact.name}
                </Badge>
              )}

              {task.property && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {task.property.address}
                </Badge>
              )}

              {task.deal && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Handshake className="h-3 w-3" />
                  {task.deal.title}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pending
            <Badge variant="secondary" className="text-xs">
              {pendingTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            Completed
            <Badge variant="secondary" className="text-xs">
              {completedTasks.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingTasks.length === 0 ? (
            <div className="flex h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-border">
              <CheckSquare className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No pending tasks</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedTasks.length === 0 ? (
            <div className="flex h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-border">
              <CheckSquare className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No completed tasks</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

