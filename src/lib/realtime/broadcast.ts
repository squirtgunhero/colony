"use client";

// ============================================================================
// COLONY - Realtime Broadcast (Client-side only)
// Subscribes to record changes from other team members
// ============================================================================

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Client-side: subscribe to real-time record changes
// ---------------------------------------------------------------------------

interface RecordChangePayload {
  entityType: string;
  entityId: string;
  userId: string;
  action: string;
  changes: Record<string, unknown>;
  timestamp: string;
}

export function useRealtimeUpdates(
  entityType: string,
  entityId: string | undefined,
  onUpdate: (change: RecordChangePayload) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    if (!entityId) return;

    const supabase = createClient();
    const channelName = `record:${entityType}:${entityId}`;

    // Get current user to skip own broadcasts
    let currentUserId: string | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      currentUserId = user?.id ?? null;
    });

    const channel = supabase
      .channel(`broadcast:${channelName}`)
      .on("broadcast", { event: "record_change" }, ({ payload }) => {
        const change = payload as RecordChangePayload;
        // Skip own changes
        if (change.userId === currentUserId) return;
        callbackRef.current(change);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [entityType, entityId]);
}
