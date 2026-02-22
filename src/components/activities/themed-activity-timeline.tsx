"use client";

import { formatDistanceToNow } from "@/lib/date-utils";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
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
  createdAt: string;
  contact?: { id: string; name: string } | null;
  deal?: { id: string; title: string } | null;
  property?: { id: string; address: string } | null;
}

const activityIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: FileText,
  task_completed: CheckCircle2,
  deal_update: TrendingUp,
};

export function ThemedActivityTimeline({ activities }: { activities: Activity[] }) {
  const { theme } = useColonyTheme();

  return (
    <div className="relative">
      {/* Timeline line */}
      <div
        className="absolute left-[7px] top-3 bottom-0 w-px"
        style={{ backgroundColor: withAlpha(theme.text, 0.08) }}
      />

      <div className="space-y-6">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type] || FileText;

          return (
            <div key={activity.id} className="relative flex gap-4">
              {/* Dot */}
              <div
                className="relative z-10 mt-1.5 h-[15px] w-[15px] rounded-full shrink-0 flex items-center justify-center"
                style={{
                  backgroundColor: theme.bg,
                  border: `2px solid ${theme.accent}`,
                }}
              >
                <div
                  className="h-[5px] w-[5px] rounded-full"
                  style={{ backgroundColor: theme.accent }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accent }} />
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: theme.text }}
                      >
                        {activity.title}
                      </p>
                    </div>
                    {activity.description && (
                      <p
                        className="mt-1 text-sm line-clamp-2"
                        style={{ color: theme.textMuted }}
                      >
                        {activity.description}
                      </p>
                    )}
                    {activity.deal && (
                      <p className="mt-1 text-xs" style={{ color: withAlpha(theme.text, 0.35) }}>
                        Deal: {activity.deal.title}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs" style={{ color: withAlpha(theme.text, 0.3) }}>
                      {formatDistanceToNow(new Date(activity.createdAt))}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="h-6 w-6 flex items-center justify-center rounded transition-colors"
                          style={{ color: withAlpha(theme.text, 0.25) }}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </button>
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
