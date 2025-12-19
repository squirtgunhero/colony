"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Search, 
  Send as SendIcon, 
  Calendar,
  User,
  ChevronRight,
  Inbox,
  TrendingUp
} from "lucide-react";
import { formatDistanceToNow, formatDate } from "@/lib/date-utils";

interface EmailActivity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  metadata: string | null;
  createdAt: Date;
  contact: {
    id: string;
    name: string;
    email: string | null;
  } | null;
}

interface EmailHistoryProps {
  emails: EmailActivity[];
  stats: {
    total: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export function EmailHistory({ emails, stats }: EmailHistoryProps) {
  const [search, setSearch] = useState("");

  const filteredEmails = emails.filter((email) => {
    const searchLower = search.toLowerCase();
    return (
      email.title.toLowerCase().includes(searchLower) ||
      email.description?.toLowerCase().includes(searchLower) ||
      email.contact?.name.toLowerCase().includes(searchLower) ||
      email.contact?.email?.toLowerCase().includes(searchLower)
    );
  });

  const parseMetadata = (metadata: string | null) => {
    if (!metadata) return null;
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Emails Sent</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.thisWeek}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.thisMonth}</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search emails..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Email List */}
      <Card className="divide-y divide-border">
        {filteredEmails.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-1">No emails yet</h3>
            <p className="text-sm text-muted-foreground">
              {search ? "No emails match your search" : "Emails you send will appear here"}
            </p>
          </div>
        ) : (
          filteredEmails.map((email) => {
            const metadata = parseMetadata(email.metadata);
            const recipientEmail = metadata?.to;

            return (
              <div
                key={email.id}
                className="p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <SendIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{email.title.replace("Sent: ", "")}</p>
                        {email.contact ? (
                          <Link
                            href={`/contacts/${email.contact.id}`}
                            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5"
                          >
                            <User className="h-3 w-3" />
                            {email.contact.name}
                            {recipientEmail && (
                              <span className="text-muted-foreground/70">
                                ({recipientEmail})
                              </span>
                            )}
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        ) : recipientEmail ? (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            To: {recipientEmail}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          Sent
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(email.createdAt)}
                        </span>
                      </div>
                    </div>
                    {email.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {email.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {formatDate(email.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* Tip */}
      <Card className="p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <strong>Tip:</strong> Send emails directly from contact profiles or use the dropdown menu in the contacts table. 
          All sent emails are automatically logged as activities.
        </p>
      </Card>
    </div>
  );
}

