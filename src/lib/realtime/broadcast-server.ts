// ============================================================================
// COLONY - Server-side Realtime Broadcast
// Call from API routes / server actions after Prisma writes
// ============================================================================

import { createClient } from "@/lib/supabase/server";

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
 */
export async function broadcastChange(change: RecordChange): Promise<void> {
  const supabase = await createClient();

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
