"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, Copy, Check, ExternalLink, Download } from "lucide-react";

export function CalendarSync() {
  const [copied, setCopied] = useState(false);
  const calendarUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/api/calendar`
    : "/api/calendar";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          Sync Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Sync
          </DialogTitle>
          <DialogDescription>
            Sync your CRM tasks with your favorite calendar app
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Subscribe Option */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Subscribe to Calendar</CardTitle>
              <CardDescription>
                Add this URL to Google Calendar, Apple Calendar, or Outlook to auto-sync tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={calendarUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Add Links */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quick Add To:</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="justify-start gap-2"
                asChild
              >
                <a
                  href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Google Calendar
                </a>
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2"
                asChild
              >
                <a
                  href={`webcal://${calendarUrl.replace(/^https?:\/\//, "")}`}
                >
                  <ExternalLink className="h-4 w-4" />
                  Apple Calendar
                </a>
              </Button>
            </div>
          </div>

          {/* Download Option */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Download Calendar</CardTitle>
              <CardDescription>
                Download an .ics file to import into any calendar app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full gap-2" asChild>
                <a href="/api/calendar" download="regganism-tasks.ics">
                  <Download className="h-4 w-4" />
                  Download .ics File
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

