import { Suspense } from "react";
import { requireUserId } from "@/lib/supabase/auth";
import { getInboxThreads, getUnreadCount } from "@/lib/db/inbox";
import { InboxClient } from "./inbox-client";

export const metadata = {
  title: "Inbox | Colony CRM",
  description: "Your unified communication inbox",
};

async function InboxData() {
  // Verify authentication
  await requireUserId();
  
  const [threadsResult, unreadCount] = await Promise.all([
    getInboxThreads({ status: "open" }),
    getUnreadCount(),
  ]);

  return (
    <InboxClient 
      initialThreads={threadsResult.threads}
      initialNextCursor={threadsResult.nextCursor}
      initialUnreadCount={unreadCount}
    />
  );
}

function InboxSkeleton() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Thread list skeleton */}
      <div className="w-full md:w-[360px] lg:w-[400px] border-r border-border">
        <div className="p-4 border-b border-border space-y-3">
          <div className="h-9 bg-muted rounded-md skeleton" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-24 bg-muted rounded-md skeleton" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex gap-3">
              <div className="h-10 w-10 rounded-full bg-muted skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded skeleton" />
                <div className="h-3 w-48 bg-muted rounded skeleton" />
                <div className="h-3 w-full bg-muted rounded skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail skeleton */}
      <div className="hidden md:flex flex-1 items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4 skeleton" />
          <div className="h-4 w-48 bg-muted rounded mx-auto skeleton" />
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxData />
    </Suspense>
  );
}

