"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Plus, Inbox } from "lucide-react";
import { useColonyTheme } from "@/lib/chat-theme-context";
import { withAlpha } from "@/lib/themes";
import { ThreadList } from "@/components/inbox/thread-list";
import { ThreadDetail } from "@/components/inbox/thread-detail";
import { InboxFilters } from "@/components/inbox/inbox-filters";
import { 
  fetchInboxThreads, 
  fetchThreadDetail,
  fetchUnreadCount,
} from "./actions";
import type { ThreadFilters, ThreadDetail as ThreadDetailType } from "@/lib/db/inbox";

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
  lastMessageChannel: "email" | "sms" | "call" | null;
  isUnread: boolean;
  messageCount: number;
}

interface InboxClientProps {
  initialThreads: ThreadListItem[];
  initialNextCursor: string | null;
  initialUnreadCount: number;
}

export function InboxClient({
  initialThreads,
  initialNextCursor,
  initialUnreadCount,
}: InboxClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [threads, setThreads] = useState<ThreadListItem[]>(initialThreads);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    searchParams.get("thread")
  );
  const [selectedThread, setSelectedThread] = useState<ThreadDetailType | null>(null);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [filters, setFilters] = useState<ThreadFilters>({ status: "open" });
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch threads when filters or search change
  useEffect(() => {
    const filtersWithSearch: ThreadFilters = {
      ...filters,
      search: debouncedSearch || undefined,
    };

    startTransition(async () => {
      const result = await fetchInboxThreads(filtersWithSearch);
      if (result.success && result.data) {
        setThreads(result.data.threads);
        setNextCursor(result.data.nextCursor);
      }
    });
  }, [filters, debouncedSearch]);

  // Fetch selected thread detail
  useEffect(() => {
    if (!selectedThreadId) {
      setSelectedThread(null);
      return;
    }

    let cancelled = false;
    
    // Start loading (deferred to next tick to avoid synchronous setState warning)
    const loadThread = async () => {
      setIsLoadingDetail(true);
      
      const result = await fetchThreadDetail(selectedThreadId);
      if (cancelled) return;
      
      if (result.success && result.data) {
        setSelectedThread(result.data);
        // Update unread count since we're marking as read
        const countResult = await fetchUnreadCount();
        if (!cancelled && countResult.success) {
          setUnreadCount(countResult.count);
        }
      }
      
      if (!cancelled) {
        setIsLoadingDetail(false);
      }
    };
    
    loadThread();
    
    return () => {
      cancelled = true;
    };
  }, [selectedThreadId]);

  // Update URL when thread is selected
  const handleSelectThread = useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
    const url = new URL(window.location.href);
    url.searchParams.set("thread", threadId);
    router.replace(url.pathname + url.search, { scroll: false });
  }, [router]);

  // Handle back (mobile)
  const handleBack = useCallback(() => {
    setSelectedThreadId(null);
    setSelectedThread(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("thread");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [router]);

  // Load more threads
  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    const filtersWithSearch: ThreadFilters = {
      ...filters,
      search: debouncedSearch || undefined,
    };

    const result = await fetchInboxThreads(filtersWithSearch, nextCursor);
    if (result.success && result.data) {
      setThreads((prev) => [...prev, ...result.data.threads]);
      setNextCursor(result.data.nextCursor);
    }
    setIsLoadingMore(false);
  }, [nextCursor, isLoadingMore, filters, debouncedSearch]);

  // Refresh thread list and detail
  const handleThreadUpdate = useCallback(async () => {
    // Refresh thread list
    const filtersWithSearch: ThreadFilters = {
      ...filters,
      search: debouncedSearch || undefined,
    };
    const listResult = await fetchInboxThreads(filtersWithSearch);
    if (listResult.success && listResult.data) {
      setThreads(listResult.data.threads);
      setNextCursor(listResult.data.nextCursor);
    }

    // Refresh selected thread detail
    if (selectedThreadId) {
      const detailResult = await fetchThreadDetail(selectedThreadId);
      if (detailResult.success && detailResult.data) {
        setSelectedThread(detailResult.data);
      }
    }

    // Refresh unread count
    const countResult = await fetchUnreadCount();
    if (countResult.success) {
      setUnreadCount(countResult.count);
    }
  }, [filters, debouncedSearch, selectedThreadId]);

  const { theme } = useColonyTheme();

  // Determine if we should show detail view (mobile responsive)
  const showDetail = selectedThreadId !== null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Thread list panel */}
      <div
        className={cn(
          "flex flex-col",
          "w-full md:w-[360px] lg:w-[400px]",
          showDetail && "hidden md:flex"
        )}
        style={{ borderRight: `1px solid ${withAlpha(theme.text, 0.06)}` }}
      >
        <InboxFilters
          filters={filters}
          onFiltersChange={setFilters}
          unreadCount={unreadCount}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="flex-1 overflow-hidden">
          <ThreadList
            threads={threads}
            selectedThreadId={selectedThreadId}
            onSelectThread={handleSelectThread}
            onLoadMore={handleLoadMore}
            hasMore={!!nextCursor}
            isLoading={isPending || isLoadingMore}
          />
        </div>
      </div>

      {/* Thread detail panel */}
      <div
        className={cn(
          "flex-1 flex flex-col",
          !showDetail && "hidden md:flex"
        )}
      >
        {isLoadingDetail ? (
          <div className="flex-1 flex items-center justify-center">
            <div style={{ color: theme.textMuted }}>Loading...</div>
          </div>
        ) : selectedThread ? (
          <ThreadDetail
            thread={selectedThread}
            onBack={handleBack}
            onThreadUpdate={handleThreadUpdate}
          />
        ) : (
          <EmptyInboxState />
        )}
      </div>
    </div>
  );
}

function EmptyInboxState() {
  const { theme } = useColonyTheme();
  const neumorphicRaised = `4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.04)`;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full mb-6"
        style={{ backgroundColor: withAlpha(theme.accent, 0.12) }}
      >
        <Inbox className="h-10 w-10" style={{ color: theme.accent }} />
      </div>
      <h3 className="text-xl font-medium mb-2" style={{ color: theme.text }}>
        All caught up!
      </h3>
      <p className="max-w-[320px] mb-6" style={{ color: theme.textMuted }}>
        Select a conversation from the list to view it, or start a new one.
      </p>
      <button
        className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
        style={{
          backgroundColor: theme.accent,
          color: theme.bg,
          boxShadow: neumorphicRaised,
        }}
      >
        <Plus className="h-4 w-4" />
        New conversation
      </button>
    </div>
  );
}

