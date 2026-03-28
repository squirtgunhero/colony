// ============================================================================
// COLONY - Typed Event Bus
// Central event system for CRM events — powers workflow automations
// ============================================================================

export interface CrmEvent {
  type: CrmEventType;
  entityType: "contact" | "deal" | "property" | "task";
  entityId: string;
  userId: string;
  teamId?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
}

export type CrmEventType =
  | "record.created"
  | "record.updated"
  | "record.deleted"
  | "score.changed"
  | "enrichment.completed"
  | "ai.computed"
  | "deal.stage_changed"
  | "task.completed"
  | "email.opened"
  | "email.clicked";

type EventHandler = (event: CrmEvent) => void | Promise<void>;

class CrmEventBus {
  private handlers: EventHandler[] = [];

  on(handler: EventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  async emit(event: CrmEvent): Promise<void> {
    for (const handler of this.handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`[EventBus] Handler failed for ${event.type}:`, error);
      }
    }
  }
}

// Singleton event bus
export const eventBus = new CrmEventBus();

// ---------------------------------------------------------------------------
// Realtime broadcast integration — forward events to Supabase Realtime
// so other connected clients see changes immediately
// ---------------------------------------------------------------------------

const BROADCAST_EVENTS = new Set<CrmEventType>([
  "record.created",
  "record.updated",
  "record.deleted",
  "deal.stage_changed",
  "enrichment.completed",
  "ai.computed",
  "score.changed",
]);

eventBus.on(async (event) => {
  if (!BROADCAST_EVENTS.has(event.type)) return;

  try {
    const { broadcastChange } = await import("@/lib/realtime/broadcast-server");
    await broadcastChange({
      entityType: event.entityType,
      entityId: event.entityId,
      userId: event.userId,
      action: event.type === "record.created"
        ? "created"
        : event.type === "record.deleted"
          ? "deleted"
          : "updated",
      changes: event.changes
        ? Object.fromEntries(
            Object.entries(event.changes).map(([k, v]) => [k, v.to])
          )
        : event.metadata,
    });
  } catch {
    // Broadcast is best-effort — don't fail the event pipeline
  }
});
