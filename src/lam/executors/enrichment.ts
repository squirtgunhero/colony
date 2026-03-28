// Data Enrichment Executors
import { prisma } from "@/lib/prisma";
import type { ActionExecutor } from "../types";
import { enrichContact } from "@/lib/enrichment";
import { eventBus } from "@/lib/events";

export const enrichmentExecutors: Record<string, ActionExecutor> = {
  "contact.enrich": async (action, ctx) => {
    const payload = action.payload as { contactId?: string; contactName?: string };

    let contactId = payload.contactId;
    if (!contactId && payload.contactName) {
      const contact = await prisma.contact.findFirst({
        where: { userId: ctx.user_id, name: { contains: payload.contactName, mode: "insensitive" } },
      });
      if (!contact) {
        return { action_id: action.action_id, action_type: action.type, status: "failed", error: `Contact "${payload.contactName}" not found` };
      }
      contactId = contact.id;
    }

    if (!contactId) {
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: "No contact specified" };
    }

    // Create job and process immediately
    const job = await prisma.enrichmentJob.create({
      data: { contactId },
    });

    try {
      const { result, provider } = await enrichContact(contactId);

      await prisma.enrichmentJob.update({
        where: { id: job.id },
        data: {
          status: result ? "complete" : "failed",
          provider,
          result: JSON.parse(JSON.stringify(result)),
          processedAt: new Date(),
          attempts: 1,
          error: result ? null : "No enrichment data found",
        },
      });

      if (result) {
        // Re-compute AI attributes now that enrichment data is available
        import("@/lib/ai-attributes/engine").then(({ computeForEntity }) =>
          computeForEntity(contactId!, "contact", ctx.user_id)
        ).catch((e) => console.error("[Enrichment] Failed to recompute AI attributes:", e));

        // Emit enrichment event for workflows
        eventBus.emit({
          type: "enrichment.completed",
          entityType: "contact",
          entityId: contactId!,
          userId: ctx.user_id,
          metadata: { provider, jobTitle: result.jobTitle, company: result.company },
        }).catch(() => {});

        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success",
          data: {
            enriched: true,
            provider,
            jobTitle: result.jobTitle,
            company: result.company,
            industry: result.industry,
            linkedinUrl: result.linkedinUrl,
            avatarUrl: result.avatarUrl,
            location: result.location,
            confidence: result.confidence,
          },
        };
      }

      return { action_id: action.action_id, action_type: action.type, status: "success", data: { enriched: false, message: "No enrichment data found for this contact" } };
    } catch (error) {
      await prisma.enrichmentJob.update({
        where: { id: job.id },
        data: { status: "failed", error: error instanceof Error ? error.message : "Unknown error", attempts: 1 },
      });
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: error instanceof Error ? error.message : "Enrichment failed" };
    }
  },

  "contact.enrichAll": async (action, ctx) => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const contacts = await prisma.contact.findMany({
      where: {
        userId: ctx.user_id,
        email: { not: null },
        OR: [
          { enrichedAt: null },
          { enrichedAt: { lt: ninetyDaysAgo } },
        ],
      },
      select: { id: true },
    });

    // Filter out contacts with pending jobs
    const existing = await prisma.enrichmentJob.findMany({
      where: {
        contactId: { in: contacts.map((c) => c.id) },
        status: { in: ["pending", "processing"] },
      },
      select: { contactId: true },
    });

    const existingSet = new Set(existing.map((j) => j.contactId));
    const toCreate = contacts.filter((c) => !existingSet.has(c.id));

    if (toCreate.length > 0) {
      await prisma.enrichmentJob.createMany({
        data: toCreate.map((c) => ({ contactId: c.id })),
      });
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: {
        jobsCreated: toCreate.length,
        totalUnenriched: contacts.length,
        message: toCreate.length > 0
          ? `Queued ${toCreate.length} contacts for enrichment. They will be processed in batches.`
          : "All contacts are already enriched or queued.",
      },
    };
  },

  "contact.getEnriched": async (action, ctx) => {
    const payload = action.payload as { contactId?: string; contactName?: string };

    let contactId = payload.contactId;
    if (!contactId && payload.contactName) {
      const contact = await prisma.contact.findFirst({
        where: { userId: ctx.user_id, name: { contains: payload.contactName, mode: "insensitive" } },
      });
      if (!contact) {
        return { action_id: action.action_id, action_type: action.type, status: "failed", error: `Contact "${payload.contactName}" not found` };
      }
      contactId = contact.id;
    }

    if (!contactId) {
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: "No contact specified" };
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: {
        name: true,
        email: true,
        phone: true,
        jobTitle: true,
        companyName: true,
        companyDomain: true,
        industry: true,
        linkedinUrl: true,
        avatarUrl: true,
        enrichedAt: true,
        enrichmentSource: true,
      },
    });

    if (!contact) {
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: "Contact not found" };
    }

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: {
        ...contact,
        isEnriched: !!contact.enrichedAt,
      },
    };
  },
};
