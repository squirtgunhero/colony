"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Send, Lock, Globe, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import type { ReferralMessageInfo, MessageType, MessageVisibility, ReferralStatus, ParticipantRole } from "@/lib/db/referrals";

interface ReferralConversationProps {
  referralId: string;
  referralStatus: ReferralStatus;
  isParticipant: boolean;
  isCreator: boolean;
  userRole: ParticipantRole | null;
  currentUserId: string;
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "?";
}

function formatMessageDate(date: Date): string {
  if (isToday(date)) {
    return format(date, "'Today at' h:mm a");
  }
  if (isYesterday(date)) {
    return format(date, "'Yesterday at' h:mm a");
  }
  return format(date, "MMM d, yyyy 'at' h:mm a");
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: ReferralMessageInfo;
  isOwn: boolean;
}) {
  if (message.messageType === "system") {
    return (
      <div className="flex justify-center py-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          <span>{message.bodyText}</span>
          <span className="opacity-50">
            {format(new Date(message.createdAt), "h:mm a")}
          </span>
        </div>
      </div>
    );
  }

  const isPrivate = message.visibility === "participants_only";

  return (
    <div className={cn("flex gap-3 group", isOwn && "flex-row-reverse")}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {getInitials(message.createdByName, message.createdByEmail)}
        </AvatarFallback>
      </Avatar>

      <div className={cn("flex flex-col max-w-[70%]", isOwn && "items-end")}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-foreground">
            {message.createdByName ?? message.createdByEmail ?? "Unknown"}
          </span>
          {isPrivate && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              <Lock className="h-2.5 w-2.5 mr-0.5" />
              Private
            </Badge>
          )}
        </div>

        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md",
            isPrivate && !isOwn && "border border-primary/20 bg-primary/5"
          )}
        >
          {message.bodyText}
        </div>

        <span className="text-[10px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatMessageDate(new Date(message.createdAt))}
        </span>
      </div>
    </div>
  );
}

export function ReferralConversation({
  referralId,
  referralStatus,
  isParticipant,
  isCreator,
  userRole,
  currentUserId,
}: ReferralConversationProps) {
  const [messages, setMessages] = useState<ReferralMessageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("comment");
  const [visibility, setVisibility] = useState<MessageVisibility>("public");
  const scrollRef = useRef<HTMLDivElement>(null);

  const isClosed = referralStatus === "closed";
  const canSendPrivate = isParticipant;
  const canSendPublic = !isClosed;

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/referrals/${referralId}/messages`);
        if (!response.ok) throw new Error("Failed to fetch messages");
        const data = await response.json();
        setMessages(data.messages);
      } catch (error) {
        toast.error("Failed to load conversation");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [referralId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/referrals/${referralId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bodyText: messageText.trim(),
          messageType: isParticipant && visibility === "participants_only" ? "private" : "comment",
          visibility,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to send message");
      }

      // Refetch messages
      const messagesResponse = await fetch(`/api/referrals/${referralId}/messages`);
      const messagesData = await messagesResponse.json();
      setMessages(messagesData.messages);
      setMessageText("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="space-y-4 py-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.createdByUserId === currentUserId}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Composer */}
      <div className="p-4">
        {isClosed ? (
          <div className="text-center text-muted-foreground text-sm py-2">
            This referral is closed. You can no longer send messages.
          </div>
        ) : (
          <div className="space-y-3">
            {isParticipant && (
              <div className="flex items-center gap-2">
                <Select
                  value={visibility}
                  onValueChange={(v) => setVisibility(v as MessageVisibility)}
                >
                  <SelectTrigger className="w-[180px]" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <span className="flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        Public Comment
                      </span>
                    </SelectItem>
                    <SelectItem value="participants_only">
                      <span className="flex items-center gap-2">
                        <Lock className="h-3 w-3" />
                        Participants Only
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  {visibility === "public"
                    ? "Visible to everyone who can see this referral"
                    : "Only visible to participants"}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                placeholder={
                  isParticipant
                    ? "Type your message..."
                    : "Add a public comment..."
                }
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={sending}
                rows={2}
                className="resize-none"
              />
              <Button
                onClick={handleSend}
                disabled={!messageText.trim() || sending}
                size="icon"
                className="shrink-0 h-auto"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

