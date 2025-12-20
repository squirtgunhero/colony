import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Handshake } from "lucide-react";
import { formatDistanceToNow } from "@/lib/date-utils";

interface Contact {
  id: string;
  name: string;
  type: string;
  createdAt: Date;
}

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  createdAt: Date;
  contact: Contact | null;
}

interface RecentActivityProps {
  contacts: Contact[];
  deals: Deal[];
}

const stageColors: Record<string, string> = {
  new_lead: "bg-blue-500/20 text-blue-400",
  qualified: "bg-purple-500/20 text-purple-400",
  showing: "bg-amber-500/20 text-amber-400",
  offer: "bg-orange-500/20 text-orange-400",
  negotiation: "bg-pink-500/20 text-pink-400",
  closed: "bg-green-500/20 text-green-400",
};

const stageLabels: Record<string, string> = {
  new_lead: "New Contact",
  qualified: "Qualified",
  showing: "Showing",
  offer: "Offer",
  negotiation: "Negotiation",
  closed: "Closed",
};

export function RecentActivity({ contacts, deals }: RecentActivityProps) {
  // Combine and sort by date
  const activities = [
    ...contacts.map((c) => ({
      type: "contact" as const,
      id: c.id,
      title: c.name,
      subtitle: c.type,
      date: c.createdAt,
    })),
    ...deals.map((d) => ({
      type: "deal" as const,
      id: d.id,
      title: d.title,
      subtitle: d.stage,
      value: d.value,
      date: d.createdAt,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px]">
          {activities.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              No recent activity
            </div>
          ) : (
            <div className="space-y-1 px-6 pb-6">
              {activities.slice(0, 8).map((activity) => (
                <div
                  key={`${activity.type}-${activity.id}`}
                  className="flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    {activity.type === "contact" ? (
                      <Users className="h-4 w-4 text-primary" />
                    ) : (
                      <Handshake className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.date)}
                    </p>
                  </div>
                  {activity.type === "deal" ? (
                    <Badge
                      variant="secondary"
                      className={stageColors[activity.subtitle] || ""}
                    >
                      {stageLabels[activity.subtitle] || activity.subtitle}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="capitalize">
                      {activity.subtitle}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

