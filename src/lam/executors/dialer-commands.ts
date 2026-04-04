// Dialer Command Executors — Chat-to-Dialer integration
// Allows users to control the dialer from the Tara chat interface.
import { prisma } from "@/lib/prisma";
import type { ActionExecutor, ActionResult } from "../types";
import type { Action } from "../actionSchema";

/**
 * Helper to extract a string field from the action payload safely.
 */
function payloadStr(action: Action, field: string): string | undefined {
  const raw = action.payload as Record<string, unknown>;
  const val = raw[field];
  return typeof val === "string" ? val : undefined;
}

export const dialerCommandExecutors: Record<string, ActionExecutor> = {
  /**
   * dialer.start_tara_session — Start Tara on a call list with an objective.
   * Finds the call list by name or ID, then kicks off the batch voice-AI endpoint.
   */
  "dialer.start_tara_session": async (action, ctx): Promise<ActionResult> => {
    const callListId = payloadStr(action, "callListId");
    const callListName = payloadStr(action, "callListName");
    const objective = payloadStr(action, "objective") || "qualify";

    try {
      // Resolve call list — by ID first, then by name
      let list;
      if (callListId) {
        list = await prisma.callList.findFirst({
          where: { id: callListId, userId: ctx.user_id },
          include: {
            entries: { where: { status: "pending" }, select: { id: true } },
          },
        });
      }

      if (!list && callListName) {
        list = await prisma.callList.findFirst({
          where: {
            userId: ctx.user_id,
            name: { contains: callListName, mode: "insensitive" },
            status: { in: ["active", "paused"] },
          },
          include: {
            entries: { where: { status: "pending" }, select: { id: true } },
          },
        });
      }

      // If no specific list, pick the most recent active list
      if (!list) {
        list = await prisma.callList.findFirst({
          where: {
            userId: ctx.user_id,
            status: { in: ["active", "paused"] },
          },
          orderBy: { updatedAt: "desc" },
          include: {
            entries: { where: { status: "pending" }, select: { id: true } },
          },
        });
      }

      if (!list) {
        return {
          action_id: action.action_id,
          action_type: "dialer.start_tara_session",
          status: "failed",
          error:
            "No call list found. Create a call list in the Dialer tab first, then ask me to start calling.",
        };
      }

      const pendingCount = list.entries.length;
      if (pendingCount === 0) {
        return {
          action_id: action.action_id,
          action_type: "dialer.start_tara_session",
          status: "failed",
          error: `The list "${list.name}" has no pending contacts to call. All entries have already been called or skipped.`,
        };
      }

      // Call the internal batch endpoint to kick off the session
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://app.colony.so";
      const batchRes = await fetch(`${baseUrl}/api/dialer/voice-ai/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Use internal secret for server-to-server auth
          "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
        },
        body: JSON.stringify({
          callListId: list.id,
          objective,
          userId: ctx.user_id,
        }),
      });

      if (!batchRes.ok) {
        const errData = await batchRes.json().catch(() => ({}));
        return {
          action_id: action.action_id,
          action_type: "dialer.start_tara_session",
          status: "failed",
          error: `Failed to start session: ${(errData as Record<string, unknown>).error || batchRes.statusText}`,
        };
      }

      return {
        action_id: action.action_id,
        action_type: "dialer.start_tara_session",
        status: "success",
        data: {
          session_started: true,
          list_name: list.name,
          list_id: list.id,
          pending_contacts: pendingCount,
          objective,
        },
        entity_id: list.id,
      };
    } catch (err) {
      return {
        action_id: action.action_id,
        action_type: "dialer.start_tara_session",
        status: "failed",
        error: `Error starting session: ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }
  },

  /**
   * dialer.stop_session — Stop/pause an active Tara session.
   */
  "dialer.stop_session": async (action, ctx): Promise<ActionResult> => {
    const callListId = payloadStr(action, "callListId");

    try {
      // Find the active list to stop
      let list;
      if (callListId) {
        list = await prisma.callList.findFirst({
          where: { id: callListId, userId: ctx.user_id, status: "active" },
        });
      }

      if (!list) {
        // Find the most recently active list
        list = await prisma.callList.findFirst({
          where: { userId: ctx.user_id, status: "active" },
          orderBy: { updatedAt: "desc" },
        });
      }

      if (!list) {
        return {
          action_id: action.action_id,
          action_type: "dialer.stop_session",
          status: "failed",
          error: "No active calling session found to stop.",
        };
      }

      // Update list status to paused
      await prisma.callList.update({
        where: { id: list.id },
        data: { status: "paused" },
      });

      return {
        action_id: action.action_id,
        action_type: "dialer.stop_session",
        status: "success",
        data: {
          session_stopped: true,
          list_name: list.name,
          list_id: list.id,
        },
        entity_id: list.id,
        before_state: { status: "active" },
        after_state: { status: "paused" },
      };
    } catch (err) {
      return {
        action_id: action.action_id,
        action_type: "dialer.stop_session",
        status: "failed",
        error: `Error stopping session: ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }
  },

  /**
   * dialer.get_status — Get current dialer/session status and today's stats.
   */
  "dialer.get_status": async (action, ctx): Promise<ActionResult> => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get active call lists
      const activeLists = await prisma.callList.findMany({
        where: { userId: ctx.user_id, status: "active" },
        select: { id: true, name: true, status: true },
      });

      // Get today's call stats
      const todaysCalls = await prisma.call.findMany({
        where: {
          userId: ctx.user_id,
          startedAt: { gte: todayStart },
        },
        select: {
          status: true,
          outcome: true,
          duration: true,
          isVoiceAI: true,
        },
      });

      const totalCalls = todaysCalls.length;
      const connectedCalls = todaysCalls.filter(
        (c) => c.status === "completed" && (c.duration || 0) > 0
      ).length;
      const aiCalls = todaysCalls.filter((c) => c.isVoiceAI).length;

      // Count outcomes
      const outcomes: Record<string, number> = {};
      for (const call of todaysCalls) {
        if (call.outcome) {
          outcomes[call.outcome] = (outcomes[call.outcome] || 0) + 1;
        }
      }

      // Get all lists for overview
      const allLists = await prisma.callList.findMany({
        where: {
          userId: ctx.user_id,
          status: { in: ["active", "paused"] },
        },
        select: {
          id: true,
          name: true,
          status: true,
          _count: {
            select: {
              entries: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      });

      const statusSummary = [
        `Today: ${totalCalls} calls made, ${connectedCalls} connected${aiCalls > 0 ? `, ${aiCalls} by Tara AI` : ""}`,
        activeLists.length > 0
          ? `Active sessions: ${activeLists.map((l) => l.name).join(", ")}`
          : "No active calling sessions",
        Object.keys(outcomes).length > 0
          ? `Outcomes: ${Object.entries(outcomes).map(([k, v]) => `${k}: ${v}`).join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join(". ");

      return {
        action_id: action.action_id,
        action_type: "dialer.get_status",
        status: "success",
        data: {
          status: statusSummary,
          active_sessions: activeLists,
          todays_stats: {
            total_calls: totalCalls,
            connected: connectedCalls,
            ai_calls: aiCalls,
            outcomes,
          },
          recent_lists: allLists.map((l) => ({
            id: l.id,
            name: l.name,
            status: l.status,
            entry_count: l._count.entries,
          })),
        },
      };
    } catch (err) {
      return {
        action_id: action.action_id,
        action_type: "dialer.get_status",
        status: "failed",
        error: `Error getting status: ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }
  },

  /**
   * dialer.quick_call — Find a contact and prepare call data.
   * Does not initiate the call directly (browser-only via Twilio Device),
   * but returns contact info so the chat can suggest opening the dialer.
   */
  "dialer.quick_call": async (action, ctx): Promise<ActionResult> => {
    const contactName = payloadStr(action, "contactName");
    const contactId = payloadStr(action, "contactId");
    const phone = payloadStr(action, "phone");

    try {
      let contact;

      if (contactId) {
        contact = await prisma.contact.findFirst({
          where: { id: contactId, userId: ctx.user_id },
          select: { id: true, name: true, phone: true, email: true, type: true },
        });
      } else if (contactName) {
        contact = await prisma.contact.findFirst({
          where: {
            userId: ctx.user_id,
            name: { contains: contactName, mode: "insensitive" },
          },
          select: { id: true, name: true, phone: true, email: true, type: true },
        });
      } else if (phone) {
        contact = await prisma.contact.findFirst({
          where: {
            userId: ctx.user_id,
            phone: { contains: phone },
          },
          select: { id: true, name: true, phone: true, email: true, type: true },
        });
      }

      if (!contact) {
        return {
          action_id: action.action_id,
          action_type: "dialer.quick_call",
          status: "failed",
          error: contactName
            ? `No contact found matching "${contactName}". Check the name and try again.`
            : "Could not find the contact. Please provide a name, ID, or phone number.",
        };
      }

      if (!contact.phone) {
        return {
          action_id: action.action_id,
          action_type: "dialer.quick_call",
          status: "failed",
          error: `${contact.name} doesn't have a phone number on file. Add their number first, then try again.`,
        };
      }

      return {
        action_id: action.action_id,
        action_type: "dialer.quick_call",
        status: "success",
        data: {
          call_initiated: true,
          contact: {
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            type: contact.type,
          },
          message: `Ready to call ${contact.name} at ${contact.phone}. Open the Dialer to start the call.`,
        },
        entity_id: contact.id,
      };
    } catch (err) {
      return {
        action_id: action.action_id,
        action_type: "dialer.quick_call",
        status: "failed",
        error: `Error finding contact: ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }
  },

  /**
   * dialer.session_summary — Get summary of the most recent or specified dialing session.
   */
  "dialer.session_summary": async (action, ctx): Promise<ActionResult> => {
    const callListId = payloadStr(action, "callListId");

    try {
      // Find the target call list
      let list;
      if (callListId) {
        list = await prisma.callList.findFirst({
          where: { id: callListId, userId: ctx.user_id },
        });
      } else {
        // Get the most recently updated list
        list = await prisma.callList.findFirst({
          where: { userId: ctx.user_id },
          orderBy: { updatedAt: "desc" },
        });
      }

      if (!list) {
        return {
          action_id: action.action_id,
          action_type: "dialer.session_summary",
          status: "failed",
          error: "No call lists found. Create a list and run a session first.",
        };
      }

      // Get entries with outcomes
      const entries = await prisma.callListEntry.findMany({
        where: { callListId: list.id },
        select: {
          status: true,
          outcome: true,
          calledAt: true,
          contact: { select: { name: true } },
        },
      });

      // Get calls associated with this list
      const calls = await prisma.call.findMany({
        where: { callListId: list.id, userId: ctx.user_id },
        select: {
          status: true,
          outcome: true,
          duration: true,
          isVoiceAI: true,
          aiSummary: true,
        },
      });

      const totalEntries = entries.length;
      const completedEntries = entries.filter(
        (e) => e.status === "completed"
      ).length;
      const pendingEntries = entries.filter(
        (e) => e.status === "pending"
      ).length;
      const skippedEntries = entries.filter(
        (e) => e.status === "skipped"
      ).length;

      const totalCalls = calls.length;
      const connectedCalls = calls.filter(
        (c) => c.status === "completed" && (c.duration || 0) > 0
      ).length;
      const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);

      // Count outcomes
      const outcomes: Record<string, number> = {};
      for (const call of calls) {
        if (call.outcome) {
          outcomes[call.outcome] = (outcomes[call.outcome] || 0) + 1;
        }
      }

      const summaryParts = [
        `List: "${list.name}" (${list.status})`,
        `Progress: ${completedEntries}/${totalEntries} contacts called${pendingEntries > 0 ? `, ${pendingEntries} remaining` : ""}${skippedEntries > 0 ? `, ${skippedEntries} skipped` : ""}`,
        `Calls: ${totalCalls} total, ${connectedCalls} connected`,
        totalDuration > 0
          ? `Total talk time: ${Math.round(totalDuration / 60)} minutes`
          : "",
        Object.keys(outcomes).length > 0
          ? `Outcomes: ${Object.entries(outcomes).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join(". ");

      return {
        action_id: action.action_id,
        action_type: "dialer.session_summary",
        status: "success",
        data: {
          summary: summaryParts,
          list_id: list.id,
          list_name: list.name,
          list_status: list.status,
          stats: {
            total_entries: totalEntries,
            completed: completedEntries,
            pending: pendingEntries,
            skipped: skippedEntries,
            total_calls: totalCalls,
            connected_calls: connectedCalls,
            total_duration_seconds: totalDuration,
            outcomes,
          },
        },
        entity_id: list.id,
      };
    } catch (err) {
      return {
        action_id: action.action_id,
        action_type: "dialer.session_summary",
        status: "failed",
        error: `Error getting summary: ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }
  },
};
