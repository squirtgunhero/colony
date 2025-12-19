"use client";

import { formatDistanceToNow } from "@/lib/date-utils";
import { 
  Phone, 
  Mail, 
  Users, 
  FileText, 
  CheckCircle2, 
  TrendingUp,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteActivity } from "@/app/(dashboard)/activities/actions";

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  metadata: string | null;
  createdAt: Date;
  contact?: { id: string; name: string } | null;
  deal?: { id: string; title: string } | null;
  property?: { id: string; address: string } | null;
}

interface ActivityTimelineProps {
  activities: Activity[];
  showContact?: boolean;
}

const activityIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: FileText,
  task_completed: CheckCircle2,
  deal_update: TrendingUp,
};

const activityColors: Record<string, string> = {
  call: "bg-blue-100 text-blue-600",
  email: "bg-purple-100 text-purple-600",
  meeting: "bg-green-100 text-green-600",
  note: "bg-amber-100 text-amber-600",
  task_completed: "bg-emerald-100 text-emerald-600",
  deal_update: "bg-rose-100 text-rose-600",
};

export function ActivityTimeline({ activities, showContact = false }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-neutral-300 mb-3" />
        <p className="text-sm text-neutral-500 mb-1">No activities yet</p>
        <p className="text-xs text-neutral-400">
          Log a call, email, or note to get started
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-neutral-200" />

      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type] || FileText;
          const colorClass = activityColors[activity.type] || "bg-neutral-100 text-neutral-600";

          return (
            <div key={activity.id} className="relative flex gap-4 pl-0">
              {/* Icon */}
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  colorClass
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {activity.title}
                    </p>
                    {showContact && activity.contact && (
                      <p className="text-xs text-neutral-500">
                        with {activity.contact.name}
                      </p>
                    )}
                    {activity.description && (
                      <p className="mt-1 text-sm text-neutral-600 line-clamp-2">
                        {activity.description}
                      </p>
                    )}
                    {activity.deal && (
                      <p className="mt-1 text-xs text-neutral-500">
                        Deal: {activity.deal.title}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-neutral-400">
                      {formatDistanceToNow(activity.createdAt)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteActivity(activity.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

