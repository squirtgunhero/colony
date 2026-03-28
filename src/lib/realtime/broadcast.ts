"use client";

// ============================================================================
// COLONY - Realtime Broadcast
// Broadcasts record changes to other team members and subscribes to updates
// ============================================================================

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Server-side: broadcast a change after a Prisma write
// ---------------------------------------------------------------------------

export interface RecordChange {
  entityType: string;
  entityId: string;
  userId: string;
  action: "created" | "updated" | "deleted";
  changes?: Record<string, unknown>;
}

/**
 * Broadcast a record change via Supabase Realtime.
 * Call this from server-side after any write operation.
 * Uses the Supabase service role or anon key to send.
 */
export async function broadcastChange(change: RecordChange): Promise<void> {
  // Dynamic import to avoid bundling server code on client
  const { createClient: createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();

  const channelName = `record:${change.entityType}:${change.entityId}`;

  const channel = supabase.channel(channelName);

  await channel.send({
    type: "broadcast",
    event: "record_change",
    payload: {
      entityType: change.entityType,
      entityId: change.entityId,
      userId: change.userId,
      action: change.action,
      changes: change.changes || {},
      timestamp: new Date().toISOString(),
    },
  });

  await supabase.removeChannel(channel);
}

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
