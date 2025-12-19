"use client";

import { useEffect, useState, useSyncExternalStore, useMemo } from "react";
import { useTheme } from "@/components/theme-provider";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmailAccounts } from "./email-accounts";
import {
  Moon,
  Sun,
  Monitor,
  Bell,
  Calendar,
  Shield,
  Palette,
  User as UserIcon,
  Building2,
  Download,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// Subscribe to nothing - just for getting client-side value
const emptySubscribe = () => () => {};

export function SettingsContent() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  
  // Create supabase client lazily on client side only
  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null;
    // Dynamic import to avoid issues during SSR
    const { createClient } = require("@/lib/supabase/client");
    return createClient();
  }, []);
  
  useEffect(() => {
    if (!supabase) return;
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);
  
  // Calendar URL - use useSyncExternalStore to safely access window
  const calendarUrl = useSyncExternalStore(
    emptySubscribe,
    () => `${window.location.origin}/api/calendar`,
    () => "/api/calendar" // Server snapshot
  );
  
  // Notification preferences (local state for demo)
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    taskReminders: true,
    dealUpdates: true,
    weeklyDigest: false,
  });

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how Colony looks on your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {theme === "system"
                ? `Currently using ${resolvedTheme} mode based on your system preferences.`
                : `Using ${theme} mode.`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Accounts */}
      <EmailAccounts />

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Choose what notifications you want to receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive updates via email
              </p>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={(checked: boolean) =>
                setNotifications((prev) => ({ ...prev, email: checked }))
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Push Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Browser push notifications
              </p>
            </div>
            <Switch
              checked={notifications.push}
              onCheckedChange={(checked: boolean) =>
                setNotifications((prev) => ({ ...prev, push: checked }))
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Task Reminders</Label>
              <p className="text-xs text-muted-foreground">
                Get reminded about upcoming tasks
              </p>
            </div>
            <Switch
              checked={notifications.taskReminders}
              onCheckedChange={(checked: boolean) =>
                setNotifications((prev) => ({ ...prev, taskReminders: checked }))
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Deal Updates</Label>
              <p className="text-xs text-muted-foreground">
                Notifications when deals change status
              </p>
            </div>
            <Switch
              checked={notifications.dealUpdates}
              onCheckedChange={(checked: boolean) =>
                setNotifications((prev) => ({ ...prev, dealUpdates: checked }))
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Weekly Digest</Label>
              <p className="text-xs text-muted-foreground">
                Summary of your weekly activity
              </p>
            </div>
            <Switch
              checked={notifications.weeklyDigest}
              onCheckedChange={(checked: boolean) =>
                setNotifications((prev) => ({ ...prev, weeklyDigest: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Calendar Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integration
          </CardTitle>
          <CardDescription>
            Sync your tasks with external calendar applications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">iCal Feed</Label>
              <p className="text-xs text-muted-foreground">
                Subscribe to your tasks in any calendar app
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/calendar" target="_blank">
                <Download className="h-4 w-4 mr-2" />
                Download .ics
              </a>
            </Button>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-2">Calendar URL:</p>
            <code className="text-xs bg-background px-2 py-1 rounded break-all">
              {calendarUrl}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>
            Manage your account information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user && (
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-medium">
                  {user.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  Signed in with {user.app_metadata?.provider || "email"}
                </p>
              </div>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Sign Out</Label>
              <p className="text-xs text-muted-foreground">
                Sign out of your account on this device
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
            >
              <Shield className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Data & Privacy
          </CardTitle>
          <CardDescription>
            Export or delete your data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Export Data</Label>
              <p className="text-xs text-muted-foreground">
                Download all your contacts, properties, and deals
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-destructive">Delete Account</Label>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
