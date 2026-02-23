"use client";

import { useState, useCallback, useTransition } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/date-utils";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  User,
  Archive,
  Clock,
  MoreHorizontal,
  Circle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  markAsRead, 
  markAsUnread, 
  archiveInboxThread 
} from "@/app/(dashboard)/inbox/actions";
import type { MessageChannel } from "@/lib/db/inbox";

interface ThreadListItem {
  id: string;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  unknownEmail: string | null;
  unknownPhone: string | null;
  unknownName: string | null;
  status: string;
  assignedUserId: string | null;
  lastMessageAt: Date;
  lastMessagePreview: string | null;
  lastMessageChannel: MessageChannel | null;
  isUnread: boolean;
  messageCount: number;
}

interface ThreadListProps {
  threads: ThreadListItem[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

const channelIcons: Record<MessageChannel, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  call: Phone,
};

const channelOpacities: Record<MessageChannel, number> = {
  email: 0.7,
  sms: 0.85,
  call: 1,
};

export function ThreadList({
  threads,
  selectedThreadId,
  onSelectThread,
  onLoadMore,
  hasMore,
  isLoading,
}: ThreadListProps) {
  const [isPending, startTransition] = useTransition();
  const [actioningThreadId, setActioningThreadId] = useState<string | null>(null);

  const handleMarkRead = useCallback((threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActioningThreadId(threadId);
    startTransition(async () => {
      await markAsRead(threadId);
      setActioningThreadId(null);
    });
  }, []);

  const handleMarkUnread = useCallback((threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActioningThreadId(threadId);
    startTransition(async () => {
      await markAsUnread(threadId);
      setActioningThreadId(null);
    });
  }, []);

  const handleArchive = useCallback((threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActioningThreadId(threadId);
    startTransition(async () => {
      await archiveInboxThread(threadId);
      setActioningThreadId(null);
    });
  }, []);

  const { theme } = useColonyTheme();

  if (threads.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full mb-4"
          style={{ backgroundColor: withAlpha(theme.accent, 0.12) }}
        >
          <Mail className="h-8 w-8" style={{ color: theme.accent }} />
        </div>
        <h3 className="text-lg font-medium mb-1" style={{ color: theme.text }}>
          No conversations yet
        </h3>
        <p className="text-sm max-w-[280px]" style={{ color: theme.textMuted }}>
          When you send or receive messages, they&apos;ll appear here.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {threads.map((thread) => {
          const isSelected = thread.id === selectedThreadId;
          const isActioning = thread.id === actioningThreadId && isPending;
          const ChannelIcon = thread.lastMessageChannel 
            ? channelIcons[thread.lastMessageChannel] 
            : Mail;
          const channelOpacity = thread.lastMessageChannel 
            ? channelOpacities[thread.lastMessageChannel] 
            : 0.5;

          // Determine display name
          const displayName = thread.contactName 
            || thread.unknownName 
            || thread.unknownEmail 
            || thread.unknownPhone 
            || "Unknown";

          // Secondary info
          const secondaryInfo = thread.contactEmail 
            || thread.contactPhone 
            || (thread.contactName && (thread.unknownEmail || thread.unknownPhone))
            || null;

          return (
            <div
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              className={cn(
                "group relative flex items-start gap-3 p-4 cursor-pointer transition-colors",
                isSelected 
                  ? "bg-accent" 
                  : "hover:bg-muted/50",
                isActioning && "opacity-50"
              )}
            >
              {/* Unread indicator */}
              {thread.isUnread && (
                <div className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
              )}

              {/* Avatar / Icon */}
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                thread.contactId ? "bg-primary/10" : "bg-muted"
              )}>
                {thread.contactId ? (
                  <span className="text-sm font-medium text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "text-sm truncate",
                      thread.isUnread ? "font-semibold" : "font-medium"
                    )}>
                      {displayName}
                    </span>
                    <ChannelIcon className="h-3.5 w-3.5 shrink-0" style={{ color: withAlpha(theme.accent, channelOpacity) }} />
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(thread.lastMessageAt))}
                  </span>
                </div>

                {secondaryInfo && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {secondaryInfo}
                  </p>
                )}

                {thread.lastMessagePreview && (
                  <p className={cn(
                    "text-sm mt-1 line-clamp-2",
                    thread.isUnread 
                      ? "text-foreground" 
                      : "text-muted-foreground"
                  )}>
                    {thread.lastMessagePreview}
                  </p>
                )}

                {/* Message count badge */}
                {thread.messageCount > 1 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-xs text-muted-foreground">
                      {thread.messageCount} messages
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {thread.isUnread ? (
                      <DropdownMenuItem onClick={(e) => handleMarkRead(thread.id, e as unknown as React.MouseEvent)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as read
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={(e) => handleMarkUnread(thread.id, e as unknown as React.MouseEvent)}>
                        <Circle className="h-4 w-4 mr-2" />
                        Mark as unread
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Clock className="h-4 w-4 mr-2" />
                      Snooze
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => handleArchive(thread.id, e as unknown as React.MouseEvent)}
                      className="text-muted-foreground"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}

        {/* Load more */}
        {hasMore && (
          <div className="p-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

