"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCircle2, AlertCircle, Info, Calendar, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Placeholder notifications - will be dynamic in a real implementation
const initialNotifications = [
  {
    id: "1",
    type: "info",
    title: "Welcome to Colony",
    description: "Get started by adding your first contact or property.",
    time: "Just now",
    read: false,
  },
  {
    id: "2",
    type: "task",
    title: "No upcoming tasks",
    description: "You're all caught up! Add tasks to stay organized.",
    time: "1 hour ago",
    read: true,
  },
  {
    id: "3",
    type: "deal",
    title: "Set up your pipeline",
    description: "Start tracking deals to monitor your sales progress.",
    time: "2 hours ago",
    read: true,
  },
];

const iconMap: Record<string, typeof Bell> = {
  info: Info,
  task: Calendar,
  deal: Target,
  success: CheckCircle2,
  warning: AlertCircle,
};

const colorMap: Record<string, string> = {
  info: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  task: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  deal: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  
  const hasUnread = notifications.some(n => !n.read);
  
  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };
  
  const handleClearAll = () => {
    setNotifications([]);
    toast.success("All notifications cleared");
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Notifications"
        description="Stay updated on your activities and important alerts."
      />

      <div className="p-4 sm:p-6 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Recent Notifications
                </CardTitle>
                <CardDescription className="mt-1">
                  Your latest updates and alerts
                </CardDescription>
              </div>
              {notifications.length > 0 && (
                <div className="flex gap-2">
                  {hasUnread && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearAll}
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No notifications</p>
                <p className="text-sm text-muted-foreground/80">
                  You&apos;re all caught up!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const Icon = iconMap[notification.type] || Bell;
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-xl border transition-colors",
                        notification.read
                          ? "border-border bg-background"
                          : "border-primary/20 bg-primary/5"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                          colorMap[notification.type]
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "font-medium",
                            !notification.read && "text-foreground"
                          )}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {notification.description}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

