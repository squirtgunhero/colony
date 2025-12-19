"use client";

import Link from "next/link";
import { formatDistanceToNow } from "@/lib/date-utils";
import { 
  Phone, 
  Mail, 
  Users, 
  FileText, 
  CheckCircle2, 
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: Date;
  contact?: { id: string; name: string } | null;
  deal?: { id: string; title: string } | null;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const activityIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: FileText,
  task_completed: CheckCircle2,
  deal_update: TrendingUp,
};

// Muted, sophisticated icon backgrounds
const activityStyles: Record<string, string> = {
  call: "bg-[rgba(74,111,165,0.08)] text-[#4a6fa5]",
  email: "bg-[rgba(107,70,139,0.08)] text-[#6b468b]",
  meeting: "bg-[rgba(61,122,74,0.08)] text-[#3d7a4a]",
  note: "bg-[rgba(180,83,9,0.08)] text-[#b45309]",
  task_completed: "bg-[rgba(61,122,74,0.08)] text-[#3d7a4a]",
  deal_update: "bg-[rgba(107,107,107,0.08)] text-[#6b6b6b]",
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-overline mb-1">Recent Activity</p>
            <p className="text-title-sm">Timeline</p>
          </div>
          <Link href="/contacts">
            <Button variant="ghost" size="sm" className="h-8 text-[11px] text-muted-foreground hover:text-foreground gap-1">
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-[13px] font-medium text-foreground mb-0.5">No recent activity</p>
            <p className="text-caption">Log calls, emails, and notes to see them here</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[14px] top-2 bottom-2 w-px bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.04)]" />
            
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const Icon = activityIcons[activity.type] || FileText;
                const styleClass = activityStyles[activity.type] || "bg-muted/50 text-muted-foreground";

                return (
                  <div key={activity.id} className="flex items-start gap-3 relative">
                    {/* Icon */}
                    <div className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full relative z-10",
                      styleClass
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-medium truncate">{activity.title}</p>
                        <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                          {formatDistanceToNow(activity.createdAt)}
                        </span>
                      </div>
                      {activity.contact && (
                        <Link 
                          href={`/contacts/${activity.contact.id}`}
                          className="text-[12px] text-muted-foreground hover:text-primary transition-colors"
                        >
                          {activity.contact.name}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
