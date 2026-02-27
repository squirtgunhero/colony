// ============================================
// COLONY ASSISTANT - Action Executor
// Maps Action objects to CRUD endpoints
// ============================================

import type { Action } from "./types";

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Execute a single action against the API
 * This is called only after user clicks "Apply"
 */
export async function executeAction(action: Action): Promise<ActionResult> {
  try {
    switch (action.kind) {
      case "create_lead": {
        const res = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: action.payload.name,
            email: action.payload.email,
            type: "lead",
            source: action.payload.source,
          }),
        });
        if (!res.ok) throw new Error("Failed to create lead");
        const data = await res.json();
        return { success: true, message: `Created lead: ${action.payload.name}`, data };
      }

      case "update_lead": {
        const res = await fetch(`/api/contacts/${action.payload.leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action.payload.patch),
        });
        if (!res.ok) throw new Error("Failed to update lead");
        const data = await res.json();
        return { success: true, message: "Lead updated successfully", data };
      }

      case "create_task": {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: action.payload.title,
            contactId: action.payload.leadId,
            dueAt: action.payload.dueAt,
            priority: action.payload.priority || "med",
            status: "pending",
          }),
        });
        if (!res.ok) throw new Error("Failed to create task");
        const data = await res.json();
        return { success: true, message: `Created task: ${action.payload.title}`, data };
      }

      case "log_note": {
        // For now, we'll update the lead's notes field
        const res = await fetch(`/api/contacts/${action.payload.leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: action.payload.note }),
        });
        if (!res.ok) throw new Error("Failed to log note");
        return { success: true, message: "Note logged successfully" };
      }

      case "draft_email": {
        // This would integrate with an email service
        // For now, return the draft for preview
        return { 
          success: true, 
          message: "Email draft ready",
          data: {
            subject: action.payload.subject,
            body: action.payload.body,
            leadId: action.payload.leadId,
          }
        };
      }

      case "search": {
        const entityMap: Record<string, string> = {
          lead: "contacts",
          deal: "deals",
          property: "properties",
        };
        const endpoint = entityMap[action.payload.entity];
        const res = await fetch(`/api/${endpoint}?search=${encodeURIComponent(action.payload.query)}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        return { success: true, message: `Found ${data.length || 0} results`, data };
      }

      case "summarize": {
        const entityMap: Record<string, string> = {
          lead: "contacts",
          deal: "deals",
          property: "properties",
        };
        const endpoint = entityMap[action.payload.entity];
        if (!endpoint) throw new Error(`Unsupported entity type: ${action.payload.entity}`);
        const res = await fetch(`/api/${endpoint}/${action.payload.id}`);
        if (!res.ok) throw new Error(`Failed to fetch ${action.payload.entity}`);
        const data = await res.json();
        return {
          success: true,
          message: `Fetched ${action.payload.entity} details`,
          data,
        };
      }

      default:
        return { success: false, message: "Unknown action type" };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed";
    return { success: false, message };
  }
}

/**
 * Check if an action is a mutation (requires confirmation)
 */
export function isMutationAction(action: Action): boolean {
  const mutationKinds = ["create_lead", "update_lead", "create_task", "log_note"];
  return mutationKinds.includes(action.kind);
}

/**
 * Get a human-readable description of an action
 */
export function getActionDescription(action: Action): string {
  switch (action.kind) {
    case "create_lead":
      return `Create new lead: ${action.payload.name}`;
    case "update_lead":
      return `Update lead ${action.payload.leadId}`;
    case "create_task":
      return `Create task: ${action.payload.title}`;
    case "log_note":
      return `Log note for lead ${action.payload.leadId}`;
    case "draft_email":
      return `Draft email: ${action.payload.subject}`;
    case "search":
      return `Search ${action.payload.entity}s: "${action.payload.query}"`;
    case "summarize":
      return `Summarize ${action.payload.entity}`;
    default:
      return "Unknown action";
  }
}

/**
 * Get the icon name for an action
 */
export function getActionIcon(action: Action): string {
  switch (action.kind) {
    case "create_lead":
      return "UserPlus";
    case "update_lead":
      return "UserCog";
    case "create_task":
      return "CheckSquare";
    case "log_note":
      return "FileText";
    case "draft_email":
      return "Mail";
    case "search":
      return "Search";
    case "summarize":
      return "BookOpen";
    default:
      return "Zap";
  }
}

