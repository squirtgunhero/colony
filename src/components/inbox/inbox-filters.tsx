"use client";

import { useState, useEffect } from "react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import {
  Mail,
  MessageSquare,
  Phone,
  Filter,
  Archive,
  Clock,
  Inbox,
  User,
  Search,
} from "lucide-react";
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
  const { theme } = useColonyTheme();
  const [mounted, setMounted] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!channelOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-channel-dropdown]")) setChannelOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [channelOpen]);

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
    setChannelOpen(false);
  };

  const handleUnreadToggle = () => {
    onFiltersChange({ ...filters, unreadOnly: !filters.unreadOnly });
  };

  const activeChannel = filters.channel || "all";
  const activeChannelConfig = channelFilters.find((c) => c.id === activeChannel);

  const neumorphicRaised = `3px 3px 6px rgba(0,0,0,0.4), -3px -3px 6px rgba(255,255,255,0.04)`;
  const neumorphicRecessed = `inset 3px 3px 6px rgba(0,0,0,0.3), inset -3px -3px 6px rgba(255,255,255,0.02)`;
  const dividerColor = withAlpha(theme.text, 0.06);

  return (
    <div className="p-4 space-y-3" style={{ borderBottom: `1px solid ${dividerColor}` }}>
      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
          style={{ color: theme.textMuted }}
        />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search conversations..."
          className="w-full h-9 pl-9 pr-3 rounded-xl text-sm outline-none transition-all"
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            boxShadow: neumorphicRecessed,
            border: `1px solid ${dividerColor}`,
            color: theme.text,
            caretColor: theme.accent,
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
      </div>

      {/* Tab filters */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {filterTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              className="h-8 px-3 shrink-0 flex items-center gap-1.5 rounded-full text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: isActive ? withAlpha(theme.accent, 0.15) : "transparent",
                color: isActive ? theme.accent : theme.textMuted,
              }}
              onClick={() => handleTabChange(tab.id)}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.id === "open" && unreadCount > 0 && (
                <span
                  className="ml-1 h-4 min-w-[16px] px-1 flex items-center justify-center text-[10px] font-semibold rounded-full"
                  style={{
                    backgroundColor: theme.accent,
                    color: theme.bg,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Secondary filters */}
      <div className="flex items-center gap-2">
        {/* Channel filter dropdown */}
        <div className="relative" data-channel-dropdown>
          <button
            className="h-8 px-3 flex items-center gap-1.5 rounded-full text-xs font-medium transition-all duration-200"
            style={{
              backgroundColor: theme.bgGlow,
              color: theme.textMuted,
              boxShadow: neumorphicRaised,
            }}
            onClick={() => setChannelOpen(!channelOpen)}
          >
            {activeChannelConfig && <activeChannelConfig.icon className="h-3.5 w-3.5" />}
            {activeChannelConfig?.label || "All channels"}
          </button>
          {channelOpen && mounted && (
            <div
              className="absolute left-0 top-full mt-2 w-40 rounded-xl py-1 z-50"
              style={{
                backgroundColor: theme.bgGlow,
                boxShadow: neumorphicRaised,
                border: `1px solid ${dividerColor}`,
              }}
            >
              {channelFilters.map((channel) => {
                const ChannelIcon = channel.icon;
                return (
                  <button
                    key={channel.id}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                    style={{
                      color: activeChannel === channel.id ? theme.accent : theme.textSoft,
                      backgroundColor:
                        activeChannel === channel.id ? withAlpha(theme.accent, 0.1) : "transparent",
                    }}
                    onClick={() => handleChannelChange(channel.id)}
                    onMouseEnter={(e) => {
                      if (activeChannel !== channel.id)
                        e.currentTarget.style.backgroundColor = withAlpha(theme.text, 0.04);
                    }}
                    onMouseLeave={(e) => {
                      if (activeChannel !== channel.id)
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <ChannelIcon className="h-3.5 w-3.5" />
                    {channel.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Unread filter */}
        <button
          className="h-8 px-3 flex items-center gap-1.5 rounded-full text-xs font-medium transition-all duration-200"
          style={{
            backgroundColor: filters.unreadOnly ? withAlpha(theme.accent, 0.15) : theme.bgGlow,
            color: filters.unreadOnly ? theme.accent : theme.textMuted,
            boxShadow: neumorphicRaised,
          }}
          onClick={handleUnreadToggle}
        >
          <Filter className="h-3.5 w-3.5" />
          Unread only
        </button>

        {/* Clear filters */}
        {(filters.channel || filters.unreadOnly) && (
          <button
            className="h-8 px-3 text-xs transition-colors"
            style={{ color: theme.textMuted }}
            onClick={() => onFiltersChange({ status: filters.status })}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
