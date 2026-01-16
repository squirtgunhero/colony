"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Mail,
  MessageSquare,
  Phone,
  Filter,
  Archive,
  Clock,
  Inbox,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ThreadFilters, MessageChannel } from "@/lib/db/inbox";

interface InboxFiltersProps {
  filters: ThreadFilters;
  onFiltersChange: (filters: ThreadFilters) => void;
  unreadCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const filterTabs = [
  { id: "open", label: "Open", icon: Inbox, status: "open" as const },
  { id: "assigned", label: "Assigned to me", icon: User, assignedToMe: true },
  { id: "archived", label: "Archived", icon: Archive, status: "archived" as const },
  { id: "snoozed", label: "Snoozed", icon: Clock, status: "snoozed" as const },
];

const channelFilters: { id: MessageChannel | "all"; label: string; icon: typeof Mail }[] = [
  { id: "all", label: "All channels", icon: Mail },
  { id: "email", label: "Email", icon: Mail },
  { id: "sms", label: "SMS", icon: MessageSquare },
  { id: "call", label: "Calls", icon: Phone },
];

export function InboxFilters({
  filters,
  onFiltersChange,
  unreadCount,
  searchQuery,
  onSearchChange,
}: InboxFiltersProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const activeTab = filters.assignedToMe 
    ? "assigned" 
    : filters.status === "archived" 
    ? "archived" 
    : filters.status === "snoozed" 
    ? "snoozed" 
    : "open";

  const handleTabChange = (tabId: string) => {
    const tab = filterTabs.find((t) => t.id === tabId);
    if (!tab) return;

    onFiltersChange({
      ...filters,
      status: tab.status,
      assignedToMe: tab.assignedToMe || false,
    });
  };

  const handleChannelChange = (channelId: MessageChannel | "all") => {
    onFiltersChange({
      ...filters,
      channel: channelId === "all" ? undefined : channelId,
    });
  };

  const handleUnreadToggle = () => {
    onFiltersChange({
      ...filters,
      unreadOnly: !filters.unreadOnly,
    });
  };

  const activeChannel = filters.channel || "all";
  const activeChannelConfig = channelFilters.find((c) => c.id === activeChannel);

  return (
    <div className="p-4 border-b border-border space-y-3">
      {/* Search */}
      <Input
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search conversations..."
        className="h-9"
      />

      {/* Tab filters */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {filterTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-8 px-3 shrink-0",
                isActive && "bg-accent"
              )}
              onClick={() => handleTabChange(tab.id)}
            >
              <tab.icon className="h-3.5 w-3.5 mr-1.5" />
              {tab.label}
              {tab.id === "open" && unreadCount > 0 && (
                <Badge 
                  variant="default" 
                  className="ml-1.5 h-4 min-w-[16px] px-1 text-[10px]"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Secondary filters */}
      <div className="flex items-center gap-2">
        {/* Channel filter - only render after mount to prevent hydration mismatch */}
        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                {activeChannelConfig && (
                  <activeChannelConfig.icon className="h-3.5 w-3.5 mr-1.5" />
                )}
                {activeChannelConfig?.label || "All channels"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Filter by channel</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {channelFilters.map((channel) => (
                <DropdownMenuItem
                  key={channel.id}
                  onClick={() => handleChannelChange(channel.id)}
                  className={cn(activeChannel === channel.id && "bg-accent")}
                >
                  <channel.icon className="h-4 w-4 mr-2" />
                  {channel.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" size="sm" className="h-8">
            <Mail className="h-3.5 w-3.5 mr-1.5" />
            All channels
          </Button>
        )}

        {/* Unread filter */}
        <Button
          variant={filters.unreadOnly ? "secondary" : "outline"}
          size="sm"
          className="h-8"
          onClick={handleUnreadToggle}
        >
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          Unread only
        </Button>

        {/* Active filters indicator */}
        {(filters.channel || filters.unreadOnly) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={() => onFiltersChange({ status: filters.status })}
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

