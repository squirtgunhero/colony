import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckSquare, Calendar } from "lucide-react";
import { formatDate } from "@/lib/date-utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: string;
  completed: boolean;
  contact: { name: string } | null;
  property: { address: string } | null;
  deal: { title: string } | null;
}

interface UpcomingTasksProps {
  tasks: Task[];
}

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-green-500/20 text-green-400",
};

export function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Upcoming Tasks</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px]">
          {tasks.length === 0 ? (
            <div className="flex h-[200px] flex-col items-center justify-center text-muted-foreground">
              <CheckSquare className="h-8 w-8 mb-2 opacity-50" />
              <p>No upcoming tasks</p>
            </div>
          ) : (
            <div className="space-y-1 px-6 pb-6">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                    <CheckSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.dueDate && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(task.dueDate)}</span>
                      </div>
                    )}
                    {(task.contact || task.property || task.deal) && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {task.contact?.name ||
                          task.property?.address ||
                          task.deal?.title}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={priorityColors[task.priority] || ""}
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

