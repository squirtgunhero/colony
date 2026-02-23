"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate, formatDistanceToNow } from "@/lib/date-utils";
import {
  Mail,
  MessageSquare,
  Phone,
  User,
  Send,
  Archive,
  Clock,
  MoreHorizontal,
  ArrowLeft,
  ExternalLink,
  StickyNote,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Voicemail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  archiveInboxThread,
  sendInboxMessage,
  addNote,
} from "@/app/(dashboard)/inbox/actions";
import type { ThreadDetail as ThreadDetailType, ThreadMessage, MessageChannel } from "@/lib/db/inbox";
import type { Prisma } from "@prisma/client";

interface ThreadDetailProps {
  thread: ThreadDetailType;
  onBack?: () => void;
  onThreadUpdate?: () => void;
}

const channelLabels: Record<MessageChannel, string> = {
  email: "Email",
  sms: "SMS",
  call: "Call",
};

export function ThreadDetail({ thread, onBack, onThreadUpdate }: ThreadDetailProps) {
  const [isPending, startTransition] = useTransition();
  const [composerChannel, setComposerChannel] = useState<MessageChannel>("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mark as read on mount
  useEffect(() => {
    startTransition(async () => {
      await markAsRead(thread.id);
    });
  }, [thread.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread.messages.length]);

  // Determine recipient address
  const recipientAddress = thread.contact?.email 
    || thread.contact?.phone 
    || thread.unknownEmail 
    || thread.unknownPhone 
    || "";

  const displayName = thread.contact?.name 
    || thread.unknownName 
    || thread.unknownEmail 
    || thread.unknownPhone 
    || "Unknown";

  const handleSend = async () => {
    if (!body.trim()) return;
    
    setIsSending(true);
    try {
      const result = await sendInboxMessage({
        threadId: thread.id,
        channel: composerChannel,
        to: recipientAddress,
        subject: composerChannel === "email" ? subject : undefined,
        body: body.trim(),
      });

      if (result.success) {
        setBody("");
        setSubject("");
        onThreadUpdate?.();
      } else {
        console.error("Failed to send:", result.error);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;

    startTransition(async () => {
      const result = await addNote(thread.id, noteText.trim());
      if (result.success) {
        setNoteText("");
        setShowNoteInput(false);
        onThreadUpdate?.();
      }
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      await archiveInboxThread(thread.id);
      onBack?.();
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-background">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Contact info */}
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          thread.contact ? "bg-primary/10" : "bg-muted"
        )}>
          {thread.contact ? (
            <span className="text-sm font-medium text-primary">
              {displayName.charAt(0).toUpperCase()}
            </span>
          ) : (
            <User className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-medium truncate">{displayName}</h2>
            {thread.contact && (
              <Link 
                href={`/contacts/${thread.contact.id}`}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {thread.contact?.email || thread.contact?.phone || thread.unknownEmail || thread.unknownPhone}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowNoteInput(!showNoteInput)}
          >
            <StickyNote className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { startTransition(async () => { await markAsUnread(thread.id); }); }}>
                Mark as unread
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Clock className="h-4 w-4 mr-2" />
                Snooze
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive} className="text-muted-foreground">
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages timeline */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {thread.messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No messages yet. Start the conversation below.
            </div>
          ) : (
            thread.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Note input (conditionally shown) */}
      {showNoteInput && (
        <div className="p-4 border-t border-border bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-400">
              Internal Note
            </span>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a private note..."
              className="min-h-[60px] bg-background"
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!noteText.trim() || isPending}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowNoteInput(false);
                  setNoteText("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="p-4 border-t border-border bg-background">
        {/* Channel tabs */}
        <div className="flex items-center justify-between mb-3">
          <Tabs
            value={composerChannel}
            onValueChange={(v) => setComposerChannel(v as MessageChannel)}
          >
            <TabsList className="h-8">
              <TabsTrigger value="email" className="text-xs h-7 px-3">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Email
              </TabsTrigger>
              <TabsTrigger value="sms" className="text-xs h-7 px-3">
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                SMS
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Subject (email only) */}
        {composerChannel === "email" && (
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="mb-2"
          />
        )}

        {/* Body */}
        <div className="flex gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Write your ${channelLabels[composerChannel].toLowerCase()}...`}
            className="min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!body.trim() || isSending}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press ⌘+Enter to send
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Message Bubble Component
// ============================================================================

interface MessageBubbleProps {
  message: ThreadMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";
  const isInternalNote = (message.metadata as Prisma.JsonObject)?.type === "internal_note";

  // Call-specific status icons
  const getCallIcon = () => {
    if (message.channel !== "call") return null;
    switch (message.status) {
      case "missed":
        return <PhoneMissed className="h-4 w-4 text-destructive" />;
      case "voicemail":
        return <Voicemail className="h-4 w-4 text-amber-500" />;
      case "completed":
        return isOutbound 
          ? <PhoneOutgoing className="h-4 w-4 text-emerald-500" />
          : <PhoneIncoming className="h-4 w-4 text-blue-500" />;
      default:
        return <Phone className="h-4 w-4" />;
    }
  };

  const getChannelIcon = () => {
    if (isInternalNote) return <StickyNote className="h-4 w-4 text-amber-600" />;
    switch (message.channel) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "call":
        return getCallIcon();
      default:
        return null;
    }
  };

  if (isInternalNote) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[80%] p-3 rounded-lg bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-1">
            <StickyNote className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-800 dark:text-amber-400">
              Internal Note
            </span>
            <span className="text-xs text-amber-600/70">
              {formatDistanceToNow(new Date(message.occurredAt))}
            </span>
          </div>
          <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
            {message.bodyText}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg p-3",
          isOutbound
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center gap-2 mb-1",
          isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {getChannelIcon()}
          {message.subject && (
            <span className="text-xs font-medium truncate">
              {message.subject}
            </span>
          )}
          {message.channel === "call" && (
            <Badge variant={isOutbound ? "secondary" : "outline"} className="text-[10px] h-4">
              {message.status === "missed" ? "Missed" : message.status === "voicemail" ? "Voicemail" : ""}
            </Badge>
          )}
          <span className="text-xs ml-auto shrink-0">
            {formatDistanceToNow(new Date(message.occurredAt))}
          </span>
        </div>

        {/* Body */}
        {message.bodyText && (
          <p className={cn(
            "text-sm whitespace-pre-wrap",
            isOutbound ? "text-primary-foreground" : "text-foreground"
          )}>
            {message.bodyText}
          </p>
        )}

        {/* Timestamp */}
        <p className={cn(
          "text-[10px] mt-2",
          isOutbound ? "text-primary-foreground/50" : "text-muted-foreground/70"
        )}>
          {formatDate(new Date(message.occurredAt))}
        </p>
      </div>
    </div>
  );
}

