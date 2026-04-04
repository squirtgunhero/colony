import { prisma } from "@/lib/prisma";

interface CallActionRecord {
  id: string;
  callId: string;
  userId: string;
  type: string;
  description: string;
  dueDate: Date | null;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
}

interface ExecutionResult {
  success: boolean;
  error?: string;
}

/**
 * Resolves the contactId from a CallAction's associated Call record.
 */
async function getContactIdForAction(callId: string): Promise<string | null> {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    select: { contactId: true },
  });
  return call?.contactId ?? null;
}

/**
 * Executes a CallAction by mapping its type to the appropriate DB operation.
 *
 * Tier-0 actions (auto-executed): add_note, score_updated, status_changed, tag_added
 * Tier-1 actions (user approval): create_task, send_email, schedule_showing, follow_up_call
 */
export async function executeCallAction(action: CallActionRecord): Promise<ExecutionResult> {
  try {
    if (action.completed) {
      return { success: true }; // Already done
    }

    const contactId = await getContactIdForAction(action.callId);

    switch (action.type) {
      case "create_task": {
        await prisma.task.create({
          data: {
            userId: action.userId,
            contactId: contactId || undefined,
            title: action.description,
            priority: "medium",
            dueDate: action.dueDate || undefined,
          },
        });
        break;
      }

      case "add_note": {
        if (contactId) {
          const contact = await prisma.contact.findUnique({
            where: { id: contactId },
            select: { notes: true },
          });
          const existing = contact?.notes || "";
          const timestamp = new Date().toLocaleString();
          const updatedNotes = existing
            ? `${existing}\n\n[${timestamp} - AI] ${action.description}`
            : `[${timestamp} - AI] ${action.description}`;

          await prisma.contact.update({
            where: { id: contactId },
            data: { notes: updatedNotes },
          });
        }
        break;
      }

      case "score_updated": {
        if (contactId) {
          // Parse score from description, e.g. "Lead score updated to 85"
          const scoreMatch = action.description.match(/(\d+)/);
          if (scoreMatch) {
            const score = parseInt(scoreMatch[1], 10);
            await prisma.contact.update({
              where: { id: contactId },
              data: { leadScore: score },
            });
          }
        }
        break;
      }

      case "status_changed": {
        if (contactId) {
          // Parse status from description, e.g. "Status changed to client"
          const statusMatch = action.description.match(/(?:to|:)\s*(\w+)/i);
          if (statusMatch) {
            const status = statusMatch[1].toLowerCase();
            const validStatuses = ["lead", "client", "agent", "vendor"];
            if (validStatuses.includes(status)) {
              await prisma.contact.update({
                where: { id: contactId },
                data: { type: status },
              });
            }
          }
        }
        break;
      }

      case "tag_added": {
        if (contactId) {
          const contact = await prisma.contact.findUnique({
            where: { id: contactId },
            select: { tags: true },
          });
          // Parse tag from description, e.g. "Tag added: interested"
          const tagMatch = action.description.match(/(?:tag(?:ged)?|add(?:ed)?)[:\s]+(.+)/i);
          const newTag = tagMatch ? tagMatch[1].trim().toLowerCase() : action.description.toLowerCase();
          const existingTags = contact?.tags || [];
          if (!existingTags.includes(newTag)) {
            await prisma.contact.update({
              where: { id: contactId },
              data: { tags: [...existingTags, newTag] },
            });
          }
        }
        break;
      }

      case "follow_up_call": {
        await prisma.task.create({
          data: {
            userId: action.userId,
            contactId: contactId || undefined,
            title: `Follow-up call: ${action.description}`,
            priority: "high",
            dueDate: action.dueDate || new Date(Date.now() + 86400000),
          },
        });
        break;
      }

      case "send_email": {
        // We cannot auto-send email without a template, so create a task reminder
        await prisma.task.create({
          data: {
            userId: action.userId,
            contactId: contactId || undefined,
            title: `Send email: ${action.description}`,
            description: "Created by Voice AI — draft and send manually",
            priority: "medium",
            dueDate: action.dueDate || new Date(Date.now() + 86400000),
          },
        });
        break;
      }

      case "schedule_showing": {
        await prisma.task.create({
          data: {
            userId: action.userId,
            contactId: contactId || undefined,
            title: `Schedule showing: ${action.description}`,
            priority: "high",
            dueDate: action.dueDate || new Date(Date.now() + 86400000),
          },
        });
        break;
      }

      default: {
        return {
          success: false,
          error: `Unknown action type: ${action.type}`,
        };
      }
    }

    // Mark the CallAction as completed
    await prisma.callAction.update({
      where: { id: action.id },
      data: {
        completed: true,
        completedAt: new Date(),
      },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[Action Executor] Failed to execute action ${action.id}:`, message);
    return { success: false, error: message };
  }
}
