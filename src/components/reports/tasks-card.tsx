import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";

interface TasksCardProps {
  completed: number;
  pending: number;
  rate: number;
}

export function TasksCard({ completed, pending, rate }: TasksCardProps) {
  return (
    <Card className="h-full overflow-hidden border-neutral-200 relative">
      <div className="h-full p-4 flex items-center gap-6">
        {/* Progress Bar */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Task Completion</span>
            <span className="text-lg font-bold text-neutral-900">{rate}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-neutral-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all duration-1000"
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-neutral-900" />
            <div>
              <p className="text-lg font-bold">{completed}</p>
              <p className="text-xs text-neutral-500">Done</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="h-4 w-4 text-neutral-400" />
            <div>
              <p className="text-lg font-bold">{pending}</p>
              <p className="text-xs text-neutral-500">Pending</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
