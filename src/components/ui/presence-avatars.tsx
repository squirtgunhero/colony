"use client";

// ============================================================================
// COLONY - Presence Avatars
// Shows small circular avatars of other users viewing/editing a record
// ============================================================================

import { useState } from "react";
import type { PresenceUser } from "@/lib/realtime/presence";

interface PresenceAvatarsProps {
  users: PresenceUser[];
  maxVisible?: number;
}

export function PresenceAvatars({ users, maxVisible = 3 }: PresenceAvatarsProps) {
  if (users.length === 0) return null;

  const visible = users.slice(0, maxVisible);
  const overflow = users.length - maxVisible;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <PresenceAvatar key={user.userId} user={user} />
      ))}
      {overflow > 0 && (
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold border-2 border-background z-10"
          style={{ backgroundColor: "#374151", color: "#d1d5db" }}
          title={users
            .slice(maxVisible)
            .map((u) => u.name)
            .join(", ")}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

function PresenceAvatar({ user }: { user: PresenceUser }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const editingLabel = user.editing
    ? `Editing: ${user.editing}`
    : "Viewing";

  return (
    <div
      className="relative z-10"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="h-7 w-7 rounded-full object-cover border-2 border-background"
          style={{ boxShadow: `0 0 0 2px ${user.color}` }}
        />
      ) : (
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold border-2 border-background"
          style={{
            backgroundColor: user.color,
            color: "#fff",
          }}
        >
          {user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)}
        </div>
      )}

      {/* Editing indicator dot */}
      {user.editing && (
        <div
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-background"
          style={{ backgroundColor: user.color }}
        />
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 rounded-lg text-[11px] whitespace-nowrap z-50 pointer-events-none"
          style={{
            backgroundColor: "#1f2937",
            color: "#f3f4f6",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <div className="font-medium">{user.name}</div>
          <div style={{ color: "#9ca3af" }}>{editingLabel}</div>
        </div>
      )}
    </div>
  );
}
