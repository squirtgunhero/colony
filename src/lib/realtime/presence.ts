"use client";

// ============================================================================
// COLONY - Realtime Presence
// Tracks which team members are viewing/editing a record
// ============================================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface PresenceUser {
  userId: string;
  name: string;
  avatar: string | null;
  editing: string | null; // field name being edited, or null
  color: string;
}

// Assigned colors for presence indicators
const PRESENCE_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
];

function getPresenceColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

interface UsePresenceOptions {
  userName: string;
  userAvatar?: string | null;
}

export function usePresence(
  entityType: string,
  entityId: string | undefined,
  options: UsePresenceOptions
) {
  const [others, setOthers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const editingRef = useRef<string | null>(null);

  // Set editing field and broadcast
  const setEditing = useCallback((fieldName: string | null) => {
    editingRef.current = fieldName;
    const channel = channelRef.current;
    if (channel && userIdRef.current) {
      channel.track({
        userId: userIdRef.current,
        name: options.userName,
        avatar: options.userAvatar || null,
        editing: fieldName,
        color: getPresenceColor(userIdRef.current),
      });
    }
  }, [options.userName, options.userAvatar]);

  useEffect(() => {
    if (!entityId) return;

    const supabase = createClient();
    const channelName = `record:${entityType}:${entityId}`;

    // Get the current user's ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      userIdRef.current = user.id;

      const channel = supabase.channel(channelName, {
        config: { presence: { key: user.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState<PresenceUser>();
          const users: PresenceUser[] = [];

          for (const [key, presences] of Object.entries(state)) {
            if (key === user.id) continue; // Skip self
            const latest = presences[presences.length - 1];
            if (latest) {
              users.push({
                userId: latest.userId,
                name: latest.name,
                avatar: latest.avatar,
                editing: latest.editing,
                color: latest.color || getPresenceColor(key),
              });
            }
          }

          setOthers(users);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              userId: user.id,
              name: options.userName,
              avatar: options.userAvatar || null,
              editing: null,
              color: getPresenceColor(user.id),
            });
          }
        });

      channelRef.current = channel;
    });

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [entityType, entityId, options.userName, options.userAvatar]);

  return { others, setEditing };
}
