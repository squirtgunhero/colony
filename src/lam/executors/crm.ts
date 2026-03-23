// CRM Domain Executors — Lead, Deal, Task, Note, Search, Referral
import { prisma } from "@/lib/prisma";
import type { ActionExecutor } from "../types";
import { recordChange, getUserActiveTeamId } from "../helpers";

export const crmExecutors: Record<string, ActionExecutor> = {
  "lead.create": async (action, ctx) => {
    if (action.type !== "lead.create") throw new Error("Invalid action type");

    const payload = action.payload;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawPayload = payload as any;

    const contact = await prisma.contact.create({
      data: {
        userId: ctx.user_id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        source: payload.source,
        type: payload.type || "lead",
        tags: payload.tags || [],
        notes: payload.notes,
        // Attribution fields (populated when lead comes from a campaign)
        campaignChannel: rawPayload.campaign_channel || undefined,
        campaignName: rawPayload.campaign_name || undefined,
        campaignId: rawPayload.campaign_id || undefined,
        utmSource: rawPayload.utm_source || undefined,
        utmMedium: rawPayload.utm_medium || undefined,
        utmCampaign: rawPayload.utm_campaign || undefined,
        utmContent: rawPayload.utm_content || undefined,
        utmTerm: rawPayload.utm_term || undefined,
        landingPage: rawPayload.landing_page || undefined,
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Contact",
      contact.id,
      "create",
      null,
      contact
    );

    // Create lead attribution record if campaign info is present
    if (rawPayload.campaign_channel || rawPayload.utm_source) {
      try {
        await prisma.leadAttribution.create({
          data: {
            contactId: contact.id,
            channel: rawPayload.campaign_channel || rawPayload.utm_source || payload.source || "direct",
            campaignName: rawPayload.campaign_name,
            campaignId: rawPayload.campaign_id,
            utmSource: rawPayload.utm_source,
            utmMedium: rawPayload.utm_medium,
            utmCampaign: rawPayload.utm_campaign,
            utmContent: rawPayload.utm_content,
            utmTerm: rawPayload.utm_term,
            landingPage: rawPayload.landing_page,
            touchType: "first",
          },
        });
      } catch (e) {
        console.error("[LAM Runtime] Failed to create lead attribution:", e);
      }
    }

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: `Added new contact: ${contact.name}`,
          contactId: contact.id,
        },
      });
      await prisma.contact.update({
        where: { id: contact.id },
        data: { lastContactedAt: new Date() },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for lead.create:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: contact,
      entity_id: contact.id,
      after_state: contact,
    };
  },

  "lead.update": async (action, ctx) => {
    if (action.type !== "lead.update") throw new Error("Invalid action type");

    // Extract all possible sources for contact identification
    const rawPayload = action.payload as Record<string, unknown>;
    const patchObj = (rawPayload.patch || {}) as Record<string, unknown>;

    // Get ID from multiple possible locations
    let contactId: string | undefined = undefined;
    if (typeof rawPayload.id === 'string' && rawPayload.id.length > 0) {
      contactId = rawPayload.id;
    }

    // Get name from multiple possible locations for lookup
    const contactName =
      (typeof rawPayload.name === 'string' ? rawPayload.name : undefined) ||
      (typeof rawPayload.contactName === 'string' ? rawPayload.contactName : undefined) ||
      (typeof patchObj.name === 'string' ? patchObj.name : undefined);

    console.log("[LAM Runtime] lead.update starting:", {
      contactId,
      contactName,
      rawPayload,
      user_id: ctx.user_id,
    });

    // If no ID, try to find by name
    if (!contactId && contactName) {
      console.log("[LAM Runtime] Looking up contact by name:", contactName);

      const found = await prisma.contact.findFirst({
        where: {
          userId: ctx.user_id,
          name: { contains: contactName, mode: "insensitive" },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (found) {
        console.log("[LAM Runtime] Found contact:", { id: found.id, name: found.name });
        contactId = found.id;
      } else {
        console.log("[LAM Runtime] Contact not found for user", ctx.user_id);

        // Debug: check if it exists for any user
        const anyContact = await prisma.contact.findFirst({
          where: { name: { contains: contactName, mode: "insensitive" } },
        });
        if (anyContact) {
          console.log("[LAM Runtime] Contact exists for different user:", {
            id: anyContact.id,
            name: anyContact.name,
            userId: anyContact.userId,
          });
          return {
            action_id: action.action_id,
            action_type: action.type,
            status: "failed",
            error: `Contact "${contactName}" belongs to a different user. Your user ID: ${ctx.user_id}, Contact owner: ${anyContact.userId}`,
          };
        }
      }
    }

    // Final check - we must have a contact ID at this point
    if (!contactId) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed",
        error: `Cannot find contact. Name searched: "${contactName || 'none provided'}", ID: "${rawPayload.id || 'none provided'}"`,
      };
    }

    console.log("[LAM Runtime] Proceeding with update for contact ID:", contactId);

    // Get before state
    const before = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!before) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed",
        error: `Contact with ID ${contactId} not found in database`,
      };
    }

    // Build clean patch object (filter undefined values)
    const cleanPatch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patchObj)) {
      if (value !== undefined && value !== null) {
        cleanPatch[key] = value;
      }
    }

    console.log("[LAM Runtime] Applying patch:", cleanPatch);

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...cleanPatch,
        updatedAt: new Date(),
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Contact",
      contactId,
      "update",
      before,
      contact
    );

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: `Updated contact: ${contact.name}`,
          description: `Changed: ${Object.keys(cleanPatch).join(", ")}`,
          contactId: contactId,
        },
      });
      await prisma.contact.update({
        where: { id: contactId },
        data: { lastContactedAt: new Date() },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for lead.update:", e);
    }

    console.log("[LAM Runtime] Update successful:", { id: contact.id, name: contact.name, tags: contact.tags });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: contact,
      entity_id: contactId,
      before_state: before,
      after_state: contact,
    };
  },

  "deal.create": async (action, ctx) => {
    if (action.type !== "deal.create") throw new Error("Invalid action type");

    const payload = action.payload;

    const deal = await prisma.deal.create({
      data: {
        userId: ctx.user_id,
        title: payload.title,
        value: payload.value,
        stage: payload.stage || "new_lead",
        contactId: payload.contactId,
        propertyId: payload.propertyId,
        expectedCloseDate: payload.expectedCloseDate
          ? new Date(payload.expectedCloseDate)
          : null,
        notes: payload.notes,
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Deal",
      deal.id,
      "create",
      null,
      deal
    );

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "deal_update",
          title: `Created deal: ${deal.title}`,
          dealId: deal.id,
          contactId: deal.contactId,
        },
      });
      if (deal.contactId) {
        await prisma.contact.update({
          where: { id: deal.contactId },
          data: { lastContactedAt: new Date() },
        });
      }
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for deal.create:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: deal,
      entity_id: deal.id,
      after_state: deal,
    };
  },

  "deal.update": async (action, ctx) => {
    if (action.type !== "deal.update") throw new Error("Invalid action type");

    const { id, patch } = action.payload;

    const before = await prisma.deal.findUnique({ where: { id } });
    if (!before) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed",
        error: `Deal ${id} not found`,
      };
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        ...patch,
        expectedCloseDate: patch.expectedCloseDate
          ? new Date(patch.expectedCloseDate)
          : undefined,
        updatedAt: new Date(),
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Deal",
      id,
      "update",
      before,
      deal
    );

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: deal,
      entity_id: id,
      before_state: before,
      after_state: deal,
    };
  },

  "deal.moveStage": async (action, ctx) => {
    if (action.type !== "deal.moveStage")
      throw new Error("Invalid action type");

    const { id, to_stage } = action.payload;

    const before = await prisma.deal.findUnique({ where: { id } });
    if (!before) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed",
        error: `Deal ${id} not found`,
      };
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        stage: to_stage,
        updatedAt: new Date(),
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Deal",
      id,
      "update",
      before,
      deal
    );

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "deal_update",
          title: `${deal.title} moved to ${deal.stage}`,
          description: `From ${before.stage} to ${deal.stage}`,
          dealId: deal.id,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for deal.moveStage:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: deal,
      entity_id: id,
      before_state: before,
      after_state: deal,
    };
  },

  "task.create": async (action, ctx) => {
    if (action.type !== "task.create") throw new Error("Invalid action type");

    const payload = action.payload;

    const task = await prisma.task.create({
      data: {
        userId: ctx.user_id,
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        priority: payload.priority || "medium",
        contactId: payload.contactId,
        dealId: payload.dealId,
        propertyId: payload.propertyId,
        completed: false,
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Task",
      task.id,
      "create",
      null,
      task
    );

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: `Created task: ${task.title}`,
          contactId: task.contactId,
          dealId: task.dealId,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for task.create:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: task,
      entity_id: task.id,
      after_state: task,
    };
  },

  "task.complete": async (action, ctx) => {
    if (action.type !== "task.complete")
      throw new Error("Invalid action type");

    const { id } = action.payload;

    const before = await prisma.task.findUnique({ where: { id } });
    if (!before) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed",
        error: `Task ${id} not found`,
      };
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        completed: true,
        updatedAt: new Date(),
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Task",
      id,
      "update",
      before,
      task
    );

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "task_completed",
          title: `Completed: ${task.title}`,
          contactId: task.contactId,
          dealId: task.dealId,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for task.complete:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: task,
      entity_id: id,
      before_state: before,
      after_state: task,
    };
  },

  "note.append": async (action, ctx) => {
    if (action.type !== "note.append") throw new Error("Invalid action type");

    const payload = action.payload;

    const note = await prisma.note.create({
      data: {
        userId: ctx.user_id,
        body: payload.body,
        contactId: payload.contactId,
        dealId: payload.dealId,
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Note",
      note.id,
      "create",
      null,
      note
    );

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: "Added note",
          description: note.body.slice(0, 100),
          contactId: note.contactId,
          dealId: note.dealId,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for note.append:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: note,
      entity_id: note.id,
      after_state: note,
    };
  },

  "lead.delete": async (action, ctx) => {
    if (action.type !== "lead.delete") throw new Error("Invalid action type");

    const { id, name } = action.payload as { id?: string; name?: string };
    let contactId = id;

    if (!contactId && name) {
      const found = await prisma.contact.findFirst({
        where: {
          userId: ctx.user_id,
          name: { contains: name, mode: "insensitive" },
        },
      });
      if (found) contactId = found.id;
    }

    if (!contactId) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Could not find contact "${name || id}" to delete`,
      };
    }

    const before = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!before || before.userId !== ctx.user_id) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Contact not found or belongs to a different user",
      };
    }

    await prisma.contact.delete({ where: { id: contactId } });

    await recordChange(ctx.run_id, action.action_id, "Contact", contactId, "delete", before, null);

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: `Deleted contact: ${before.name}`,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for lead.delete:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { deleted: true, name: before.name },
      entity_id: contactId,
      before_state: before,
    };
  },

  "lead.deleteAll": async (action, ctx) => {
    if (action.type !== "lead.deleteAll") throw new Error("Invalid action type");

    const contacts = await prisma.contact.findMany({
      where: { userId: ctx.user_id },
      select: { id: true, name: true },
    });

    const count = contacts.length;
    if (count === 0) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success",
        data: { deleted: 0, message: "No contacts to delete" },
      };
    }

    await prisma.contact.deleteMany({ where: { userId: ctx.user_id } });

    await recordChange(ctx.run_id, action.action_id, "Contact", "ALL", "delete", { count, ids: contacts.map(c => c.id) }, null);

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: `Deleted all contacts (${count})`,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for lead.deleteAll:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { deleted: count, message: `Deleted ${count} contact(s)` },
    };
  },

  "deal.delete": async (action, ctx) => {
    if (action.type !== "deal.delete") throw new Error("Invalid action type");

    const { id, title } = action.payload as { id?: string; title?: string };
    let dealId = id;

    if (!dealId && title) {
      const found = await prisma.deal.findFirst({
        where: {
          userId: ctx.user_id,
          title: { contains: title, mode: "insensitive" },
        },
      });
      if (found) dealId = found.id;
    }

    if (!dealId) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Could not find deal "${title || id}" to delete`,
      };
    }

    const before = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!before || before.userId !== ctx.user_id) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Deal not found or belongs to a different user",
      };
    }

    await prisma.deal.delete({ where: { id: dealId } });

    await recordChange(ctx.run_id, action.action_id, "Deal", dealId, "delete", before, null);

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "deal_update",
          title: `Deleted deal: ${before.title}`,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for deal.delete:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { deleted: true, title: before.title },
      entity_id: dealId,
      before_state: before,
    };
  },

  "deal.deleteAll": async (action, ctx) => {
    if (action.type !== "deal.deleteAll") throw new Error("Invalid action type");

    const deals = await prisma.deal.findMany({
      where: { userId: ctx.user_id },
      select: { id: true, title: true },
    });

    const count = deals.length;
    if (count === 0) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success",
        data: { deleted: 0, message: "No deals to delete" },
      };
    }

    await prisma.deal.deleteMany({ where: { userId: ctx.user_id } });

    await recordChange(ctx.run_id, action.action_id, "Deal", "ALL", "delete", { count, ids: deals.map(d => d.id) }, null);

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "deal_update",
          title: `Deleted all deals (${count})`,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for deal.deleteAll:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { deleted: count, message: `Deleted ${count} deal(s)` },
    };
  },

  "task.delete": async (action, ctx) => {
    if (action.type !== "task.delete") throw new Error("Invalid action type");

    const { id, title } = action.payload as { id?: string; title?: string };
    let taskId = id;

    if (!taskId && title) {
      const found = await prisma.task.findFirst({
        where: {
          userId: ctx.user_id,
          title: { contains: title, mode: "insensitive" },
        },
      });
      if (found) taskId = found.id;
    }

    if (!taskId) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Could not find task "${title || id}" to delete`,
      };
    }

    const before = await prisma.task.findUnique({ where: { id: taskId } });
    if (!before || before.userId !== ctx.user_id) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Task not found or belongs to a different user",
      };
    }

    await prisma.task.delete({ where: { id: taskId } });

    await recordChange(ctx.run_id, action.action_id, "Task", taskId, "delete", before, null);

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: `Deleted task: ${before.title}`,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for task.delete:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { deleted: true, title: before.title },
      entity_id: taskId,
      before_state: before,
    };
  },

  "task.deleteAll": async (action, ctx) => {
    if (action.type !== "task.deleteAll") throw new Error("Invalid action type");

    const tasks = await prisma.task.findMany({
      where: { userId: ctx.user_id },
      select: { id: true, title: true },
    });

    const count = tasks.length;
    if (count === 0) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success",
        data: { deleted: 0, message: "No tasks to delete" },
      };
    }

    await prisma.task.deleteMany({ where: { userId: ctx.user_id } });

    await recordChange(ctx.run_id, action.action_id, "Task", "ALL", "delete", { count, ids: tasks.map(t => t.id) }, null);

    try {
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          type: "note",
          title: `Deleted all tasks (${count})`,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for task.deleteAll:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { deleted: count, message: `Deleted ${count} task(s)` },
    };
  },

  "note.delete": async (action, ctx) => {
    if (action.type !== "note.delete") throw new Error("Invalid action type");

    const { id } = action.payload;

    const before = await prisma.note.findUnique({ where: { id } });
    if (!before || before.userId !== ctx.user_id) {
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: "Note not found or belongs to a different user",
      };
    }

    await prisma.note.delete({ where: { id } });

    await recordChange(ctx.run_id, action.action_id, "Note", id, "delete", before, null);

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { deleted: true },
      entity_id: id,
      before_state: before,
    };
  },

  "crm.search": async (action, ctx) => {
    if (action.type !== "crm.search") throw new Error("Invalid action type");

    const { entity, query, filters, limit } = action.payload;
    const hasQuery = query && query.trim().length > 0;

    let results: unknown[] = [];

    switch (entity) {
      case "contact": {
        results = await prisma.contact.findMany({
          where: {
            userId: ctx.user_id,
            ...(hasQuery
              ? {
                  OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                    { phone: { contains: query, mode: "insensitive" } },
                  ],
                }
              : {}),
            ...(filters?.type ? { type: filters.type } : {}),
            ...(filters?.source ? { source: filters.source } : {}),
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            type: true,
            source: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
          },
          take: limit || 10,
          orderBy: { updatedAt: "desc" },
        });
        break;
      }
      case "deal": {
        results = await prisma.deal.findMany({
          where: {
            userId: ctx.user_id,
            ...(hasQuery
              ? { title: { contains: query, mode: "insensitive" } }
              : {}),
            ...(filters?.stage ? { stage: filters.stage } : {}),
          },
          select: {
            id: true,
            title: true,
            value: true,
            stage: true,
            notes: true,
            expectedCloseDate: true,
            createdAt: true,
            updatedAt: true,
            contact: { select: { name: true } },
          },
          take: limit || 10,
          orderBy: { updatedAt: "desc" },
        });
        break;
      }
      case "task": {
        results = await prisma.task.findMany({
          where: {
            userId: ctx.user_id,
            ...(hasQuery
              ? { title: { contains: query, mode: "insensitive" } }
              : {}),
            ...(filters?.status
              ? { completed: filters.status === "completed" }
              : {}),
          },
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            priority: true,
            completed: true,
            createdAt: true,
            contact: { select: { name: true } },
            deal: { select: { title: true } },
          },
          take: limit || 10,
          orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
        });
        break;
      }
      case "property": {
        results = await prisma.property.findMany({
          where: {
            userId: ctx.user_id,
            ...(hasQuery
              ? {
                  OR: [
                    { address: { contains: query, mode: "insensitive" } },
                    { city: { contains: query, mode: "insensitive" } },
                  ],
                }
              : {}),
            ...(filters?.status ? { status: filters.status } : {}),
          },
          select: {
            id: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            price: true,
            status: true,
            bedrooms: true,
            bathrooms: true,
            sqft: true,
            createdAt: true,
          },
          take: limit || 10,
          orderBy: { updatedAt: "desc" },
        });
        break;
      }
      case "referral": {
        results = await prisma.referral.findMany({
          where: {
            createdByUserId: ctx.user_id,
            ...(hasQuery
              ? {
                  OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { description: { contains: query, mode: "insensitive" } },
                    { category: { contains: query, mode: "insensitive" } },
                  ],
                }
              : {}),
            ...(filters?.status ? { status: filters.status } : {}),
            ...(filters?.category ? { category: filters.category } : {}),
          },
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            status: true,
            locationText: true,
            valueEstimate: true,
            currency: true,
            visibility: true,
            createdAt: true,
            claims: {
              select: {
                id: true,
                status: true,
                message: true,
                createdAt: true,
              },
            },
          },
          take: limit || 10,
          orderBy: { createdAt: "desc" },
        });
        break;
      }
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: { entity, query, total: results.length, records: results },
    };
  },

  "referral.create": async (action, ctx) => {
    if (action.type !== "referral.create") throw new Error("Invalid action type");

    const payload = action.payload as {
      title: string;
      category: string;
      description?: string;
      locationText?: string;
      valueEstimate?: number;
      visibility?: string;
    };

    const referral = await prisma.referral.create({
      data: {
        createdByUserId: ctx.user_id,
        title: payload.title,
        category: payload.category.toLowerCase().replace(/\s+/g, "_"),
        description: payload.description,
        locationText: payload.locationText,
        valueEstimate: payload.valueEstimate,
        visibility: payload.visibility || "public",
        status: "open",
      },
    });

    await prisma.referralParticipant.create({
      data: {
        referralId: referral.id,
        userId: ctx.user_id,
        role: "creator",
      },
    });

    await recordChange(
      ctx.run_id,
      action.action_id,
      "Referral",
      referral.id,
      "create",
      null,
      referral
    );

    try {
      const teamId = await getUserActiveTeamId(ctx.user_id);
      await prisma.activity.create({
        data: {
          userId: ctx.user_id,
          teamId,
          type: "note",
          title: `Posted referral: ${referral.title}`,
          description: `Category: ${referral.category}${referral.locationText ? `, Location: ${referral.locationText}` : ""}`,
        },
      });
    } catch (e) {
      console.error("[LAM Runtime] Failed to log activity for referral.create:", e);
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: referral,
      entity_id: referral.id,
      after_state: referral,
    };
  },

  "deal.addMilestones": async (action, ctx) => {
    if (action.type !== "deal.addMilestones") throw new Error("Invalid action type");
    const p = action.payload;

    // Resolve deal
    let dealId = p.dealId;
    if (!dealId && p.dealTitle) {
      const deal = await prisma.deal.findFirst({
        where: { userId: ctx.user_id, title: { contains: p.dealTitle, mode: "insensitive" } },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });
      dealId = deal?.id;
    }

    // Calculate anchor dates from closingDate when individual dates aren't provided
    const closingDate = p.closingDate ? new Date(p.closingDate) : null;

    function daysBeforeClose(days: number): Date | null {
      if (!closingDate) return null;
      const d = new Date(closingDate);
      d.setDate(d.getDate() - days);
      return d;
    }

    type MilestoneTask = {
      title: string;
      description: string;
      dueDate: Date | null;
      priority: "low" | "medium" | "high";
    };

    let milestones: MilestoneTask[] = [];

    if (p.milestoneType === "buyer_under_contract") {
      milestones = [
        {
          title: "Schedule home inspection",
          description: "Contact inspector and schedule within 5–7 days of acceptance.",
          dueDate: p.inspectionDate ? new Date(p.inspectionDate) : daysBeforeClose(28),
          priority: "high",
        },
        {
          title: "Inspection contingency deadline",
          description: "Review inspection report and submit any repair requests or cancel.",
          dueDate: daysBeforeClose(21),
          priority: "high",
        },
        {
          title: "Order appraisal",
          description: "Confirm lender has ordered the appraisal.",
          dueDate: p.appraisalDate ? new Date(p.appraisalDate) : daysBeforeClose(18),
          priority: "medium",
        },
        {
          title: "Loan contingency deadline",
          description: "Confirm loan approval in writing or request extension.",
          dueDate: p.loanContingencyDate ? new Date(p.loanContingencyDate) : daysBeforeClose(10),
          priority: "high",
        },
        {
          title: "Final walkthrough",
          description: "Walk the property with buyer 1–2 days before closing.",
          dueDate: p.walkThroughDate ? new Date(p.walkThroughDate) : daysBeforeClose(2),
          priority: "medium",
        },
        {
          title: "Closing day",
          description: "Attend closing, collect keys, confirm wire transfer completed.",
          dueDate: closingDate,
          priority: "high",
        },
        {
          title: "Post-close: request review & referral",
          description: "Follow up with buyer 2 weeks after close for a Google review and referral.",
          dueDate: closingDate ? new Date(closingDate.getTime() + 14 * 24 * 60 * 60 * 1000) : null,
          priority: "low",
        },
      ];
    } else if (p.milestoneType === "seller_listing") {
      milestones = [
        {
          title: "Sign listing agreement",
          description: "Get signed listing agreement from seller.",
          dueDate: null,
          priority: "high",
        },
        {
          title: "Order professional photos",
          description: "Schedule photographer for property photos.",
          dueDate: null,
          priority: "high",
        },
        {
          title: "Prepare seller disclosures",
          description: "Complete and send disclosure packet to seller.",
          dueDate: null,
          priority: "high",
        },
        {
          title: "Go live on MLS",
          description: "Upload listing to MLS and all syndication sites.",
          dueDate: null,
          priority: "medium",
        },
        {
          title: "Schedule first open house",
          description: "Plan open house for first or second weekend on market.",
          dueDate: null,
          priority: "medium",
        },
      ];
    } else if (p.milestoneType === "seller_under_contract") {
      milestones = [
        {
          title: "Open escrow",
          description: "Send contract to escrow and confirm earnest money deposit.",
          dueDate: daysBeforeClose(30),
          priority: "high",
        },
        {
          title: "Buyer inspection",
          description: "Coordinate buyer's inspection access.",
          dueDate: p.inspectionDate ? new Date(p.inspectionDate) : daysBeforeClose(25),
          priority: "high",
        },
        {
          title: "Respond to repair requests",
          description: "Review buyer's repair requests and negotiate response.",
          dueDate: daysBeforeClose(20),
          priority: "high",
        },
        {
          title: "Appraisal",
          description: "Ensure appraiser access and review appraisal result.",
          dueDate: p.appraisalDate ? new Date(p.appraisalDate) : daysBeforeClose(14),
          priority: "medium",
        },
        {
          title: "Final walkthrough",
          description: "Coordinate buyer's final walkthrough.",
          dueDate: daysBeforeClose(2),
          priority: "medium",
        },
        {
          title: "Closing day",
          description: "Confirm wire received, keys handed over.",
          dueDate: closingDate,
          priority: "high",
        },
        {
          title: "Post-close: referral follow-up",
          description: "Follow up with seller 2 weeks after close.",
          dueDate: closingDate ? new Date(closingDate.getTime() + 14 * 24 * 60 * 60 * 1000) : null,
          priority: "low",
        },
      ];
    }

    // Create all tasks
    const created = await Promise.all(
      milestones.map((m) =>
        prisma.task.create({
          data: {
            userId:      ctx.user_id,
            title:       m.title,
            description: m.description,
            dueDate:     m.dueDate ?? undefined,
            priority:    m.priority,
            ...(dealId && { dealId }),
          },
        })
      )
    );

    // Move deal to under_contract if applicable
    if (dealId && p.milestoneType === "buyer_under_contract") {
      await prisma.deal.update({
        where: { id: dealId },
        data: {
          stage: "negotiation", // closest stage to "under_contract" in the enum
          ...(closingDate && { expectedCloseDate: closingDate }),
        },
      });
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: {
        tasks_created: created.length,
        deal_id: dealId ?? null,
        milestone_type: p.milestoneType,
        tasks: created.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate })),
      },
    };
  },
};
