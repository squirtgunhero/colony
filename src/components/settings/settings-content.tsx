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
  Sparkles,
  Plug,
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

  // Autopilot settings (fetched from DB)
  const [autopilot, setAutopilot] = useState<{
    hasPhone: boolean;
    phoneNumber?: string;
    verified?: boolean;
    autopilotEnabled?: boolean;
    digestEnabled?: boolean;
    overdueRemindersEnabled?: boolean;
    referralAlertsEnabled?: boolean;
    digestTime?: string;
    quietStart?: string | null;
    quietEnd?: string | null;
  } | null>(null);

  // Integrations state
  const [integrations, setIntegrations] = useState<{
    meta: { connected: boolean; accountName?: string; status?: string; expiresAt?: string } | null;
    google: { connected: boolean; accountName?: string; customerId?: string } | null;
  }>({ meta: null, google: null });
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/integrations")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setIntegrations(data); })
      .catch(() => {});
  }, []);

  const handleDisconnect = async (provider: "meta" | "google") => {
    setDisconnecting(provider);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (res.ok) {
        setIntegrations((prev) => ({
          ...prev,
          [provider]: { connected: false },
        }));
      }
    } catch {
      // ignore
    } finally {
      setDisconnecting(null);
    }
  };

  useEffect(() => {
    fetch("/api/settings/autopilot")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setAutopilot(data);
      })
      .catch(() => {});
  }, []);

  const updateAutopilot = (field: string, value: unknown) => {
    setAutopilot((prev) => (prev ? { ...prev, [field]: value } : prev));
    fetch("/api/settings/autopilot", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    }).catch(() => {});
  };

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

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Integrations
          </CardTitle>
          <CardDescription>
            Connect your ad accounts to run campaigns through Tara.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Facebook / Meta Ads */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Facebook Ads</p>
                {integrations.meta?.connected ? (
                  <p className="text-xs text-muted-foreground">{integrations.meta.accountName}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Run ads on Facebook & Instagram</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {integrations.meta?.connected ? (
                <>
                  {integrations.meta.status === "expired" ? (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      Expired
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Connected
                    </span>
                  )}
                  {integrations.meta.status === "expired" ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href="/api/meta/auth">Reconnect</a>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect("meta")}
                      disabled={disconnecting === "meta"}
                    >
                      {disconnecting === "meta" ? "..." : "Disconnect"}
                    </Button>
                  )}
                </>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <a href="/api/meta/auth">Connect</a>
                </Button>
              )}
            </div>
          </div>
          <Separator />
          {/* Google Ads */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M15.634 0l-8.27 14.316 4.137 7.163L19.77 7.163z" fill="#FBBC04" />
                  <path d="M15.634 0L7.364 14.316l-4.137-7.163L11.497 0z" fill="#4285F4" />
                  <path d="M3.227 7.153L7.364 14.316 3.227 21.479A4.136 4.136 0 010 17.616V10.99a4.136 4.136 0 013.227-3.837z" fill="#34A853" />
                  <path d="M19.77 7.163L15.634 14.326l4.137 7.163A4.136 4.136 0 0024 17.626V10.99a4.136 4.136 0 00-4.23-3.827z" fill="#EA4335" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">Google Ads</p>
                {integrations.google?.connected ? (
                  <p className="text-xs text-muted-foreground">{integrations.google.accountName}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Run ads on Google Search & Display</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {integrations.google?.connected ? (
                <>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Connected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDisconnect("google")}
                    disabled={disconnecting === "google"}
                  >
                    {disconnecting === "google" ? "..." : "Disconnect"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <a href="/api/google-ads/auth">Connect</a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Accounts */}
      <EmailAccounts />

      {/* Autopilot */}
      {autopilot && autopilot.hasPhone && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Autopilot
            </CardTitle>
            <CardDescription>
              Control how Colony proactively helps you via SMS.
              {autopilot.phoneNumber && (
                <span className="block mt-1 font-medium text-foreground">
                  Connected: {autopilot.phoneNumber}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Autopilot Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  Allow Colony to text you proactively
                </p>
              </div>
              <Switch
                checked={autopilot.autopilotEnabled ?? false}
                onCheckedChange={(checked: boolean) =>
                  updateAutopilot("autopilotEnabled", checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Daily Digest</Label>
                <p className="text-xs text-muted-foreground">
                  Evening summary of your day
                </p>
              </div>
              <Switch
                checked={autopilot.digestEnabled ?? true}
                onCheckedChange={(checked: boolean) =>
                  updateAutopilot("digestEnabled", checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Overdue Reminders</Label>
                <p className="text-xs text-muted-foreground">
                  Get nudged when tasks are overdue
                </p>
              </div>
              <Switch
                checked={autopilot.overdueRemindersEnabled ?? true}
                onCheckedChange={(checked: boolean) =>
                  updateAutopilot("overdueRemindersEnabled", checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Referral Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Notified when someone claims your referral
                </p>
              </div>
              <Switch
                checked={autopilot.referralAlertsEnabled ?? true}
                onCheckedChange={(checked: boolean) =>
                  updateAutopilot("referralAlertsEnabled", checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Digest Time</Label>
                <p className="text-xs text-muted-foreground">
                  When to send your daily summary
                </p>
              </div>
              <select
                value={autopilot.digestTime ?? "18:00"}
                onChange={(e) => updateAutopilot("digestTime", e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const h = i.toString().padStart(2, "0");
                  const label = i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`;
                  return <option key={h} value={`${h}:00`}>{label}</option>;
                })}
              </select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Quiet Hours</Label>
                <p className="text-xs text-muted-foreground">
                  No texts during these hours
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <select
                  value={autopilot.quietStart ?? ""}
                  onChange={(e) => updateAutopilot("quietStart", e.target.value || null)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Off</option>
                  {Array.from({ length: 24 }, (_, i) => {
                    const h = i.toString().padStart(2, "0");
                    const label = i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`;
                    return <option key={h} value={`${h}:00`}>{label}</option>;
                  })}
                </select>
                <span className="text-muted-foreground">to</span>
                <select
                  value={autopilot.quietEnd ?? ""}
                  onChange={(e) => updateAutopilot("quietEnd", e.target.value || null)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Off</option>
                  {Array.from({ length: 24 }, (_, i) => {
                    const h = i.toString().padStart(2, "0");
                    const label = i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`;
                    return <option key={h} value={`${h}:00`}>{label}</option>;
                  })}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
