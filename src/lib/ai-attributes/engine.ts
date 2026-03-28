// ============================================================================
// COLONY - AI Attribute Engine
// Computes per-field AI inference on CRM records
// ============================================================================

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getDefaultProvider } from "@/lam/llm";
import type { LLMMessage } from "@/lam/llm";

// ---------------------------------------------------------------------------
// Context assembly — gathers data from the record + related tables
// ---------------------------------------------------------------------------
async function assembleContext(
  entityId: string,
  entityType: string,
  contextFields: string[]
): Promise<Record<string, unknown>> {
  const ctx: Record<string, unknown> = {};

  if (entityType === "contact") {
    const contact = await prisma.contact.findUnique({
      where: { id: entityId },
      include: {
        deals: { take: 5, orderBy: { createdAt: "desc" } },
        tasks: { take: 5, where: { completed: false }, orderBy: { dueDate: "asc" } },
        activities: { take: 10, orderBy: { createdAt: "desc" } },
        emailInteractions: { take: 10, orderBy: { occurredAt: "desc" } },
        meetingInteractions: { take: 5, orderBy: { startTime: "desc" } },
      },
    });
    if (!contact) return ctx;

    // Always include base fields
    ctx.name = contact.name;
    ctx.email = contact.email;
    ctx.phone = contact.phone;
    ctx.type = contact.type;
    ctx.tags = contact.tags;
    ctx.source = contact.source;
    ctx.notes = contact.notes;
    ctx.createdAt = contact.createdAt;

    // Enrichment data
    if (contextFields.includes("enrichment") || contextFields.length === 0) {
      ctx.jobTitle = contact.jobTitle;
      ctx.companyName = contact.companyName;
      ctx.companyDomain = contact.companyDomain;
      ctx.industry = contact.industry;
      ctx.linkedinUrl = contact.linkedinUrl;
    }

    // Relationship score
    if (contextFields.includes("relationship") || contextFields.length === 0) {
      ctx.relationshipScore = contact.relationshipScore;
      ctx.interactionCount = contact.interactionCount;
      ctx.lastExternalContact = contact.lastExternalContact;
      ctx.lastContactedAt = contact.lastContactedAt;
    }

    // Deals
    if (contextFields.includes("deals") || contextFields.length === 0) {
      ctx.deals = contact.deals.map((d) => ({
        title: d.title,
        stage: d.stage,
        value: d.value,
      }));
    }

    // Tasks
    if (contextFields.includes("tasks") || contextFields.length === 0) {
      ctx.openTasks = contact.tasks.map((t) => ({
        title: t.title,
        dueDate: t.dueDate,
        priority: t.priority,
      }));
    }

    // Activity summary
    if (contextFields.includes("activities") || contextFields.length === 0) {
      ctx.recentActivities = contact.activities.map((a) => ({
        type: a.type,
        title: a.title,
        date: a.createdAt,
      }));
    }

    // Interaction history
    if (contextFields.includes("interactions") || contextFields.length === 0) {
      ctx.recentEmails = contact.emailInteractions.map((e) => ({
        direction: e.direction,
        subject: e.subject,
        date: e.occurredAt,
      }));
      ctx.recentMeetings = contact.meetingInteractions.map((m) => ({
        title: m.title,
        date: m.startTime,
      }));
    }
  } else if (entityType === "deal") {
    const deal = await prisma.deal.findUnique({
      where: { id: entityId },
      include: {
        contact: true,
        property: true,
        tasks: { take: 5, where: { completed: false } },
      },
    });
    if (!deal) return ctx;

    ctx.title = deal.title;
    ctx.stage = deal.stage;
    ctx.value = deal.value;
    ctx.probability = deal.probability;
    ctx.expectedCloseDate = deal.expectedCloseDate;
    ctx.notes = deal.notes;
    ctx.contactName = deal.contact?.name;
    ctx.contactEmail = deal.contact?.email;
    ctx.propertyAddress = deal.property?.address;
    ctx.openTasks = deal.tasks.map((t) => ({ title: t.title, dueDate: t.dueDate }));
  } else if (entityType === "property") {
    const property = await prisma.property.findUnique({
      where: { id: entityId },
    });
    if (!property) return ctx;

    ctx.address = property.address;
    ctx.city = property.city;
    ctx.state = property.state;
    ctx.price = property.price;
    ctx.status = property.status;
    ctx.bedrooms = property.bedrooms;
    ctx.bathrooms = property.bathrooms;
    ctx.sqft = property.sqft;
    ctx.description = property.description;
  }

  return ctx;
}

// ---------------------------------------------------------------------------
// Build the LLM prompt for a given attribute + context
// ---------------------------------------------------------------------------
function buildPrompt(
  attribute: { name: string; prompt: string; outputType: string; options: unknown },
  context: Record<string, unknown>
): LLMMessage[] {
  let outputInstruction = "";

  switch (attribute.outputType) {
    case "select": {
      const opts = (attribute.options as string[]) || [];
      outputInstruction = `You MUST respond with ONLY one of these exact values: ${opts.map((o) => `"${o}"`).join(", ")}. No other text.`;
      break;
    }
    case "number":
      outputInstruction = "Respond with a single number only. No text, no units.";
      break;
    case "boolean":
      outputInstruction = 'Respond with exactly "true" or "false". No other text.';
      break;
    case "text":
      outputInstruction = "Respond with a concise text value (1-3 sentences max). No preamble.";
      break;
  }

  return [
    {
      role: "system",
      content: `You are an AI attribute engine for a CRM. You analyze record data and produce a single value for the attribute "${attribute.name}".

${outputInstruction}

Also provide a confidence score (0.0-1.0) indicating how certain you are.

Respond with JSON: { "value": <your answer>, "confidence": <0.0-1.0> }`,
    },
    {
      role: "user",
      content: `Attribute prompt: ${attribute.prompt}

Record data:
${JSON.stringify(context, null, 2)}`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Compute a single attribute for a single entity
// ---------------------------------------------------------------------------
export async function computeAttribute(
  attributeId: string,
  entityId: string
): Promise<{ value: string; confidence: number | null }> {
  const attribute = await prisma.aiAttribute.findUnique({
    where: { id: attributeId },
  });

  if (!attribute) throw new Error(`AI Attribute ${attributeId} not found`);

  const context = await assembleContext(entityId, attribute.entityType, attribute.contextFields);

  if (Object.keys(context).length === 0) {
    throw new Error(`Entity ${entityId} not found for type ${attribute.entityType}`);
  }

  const messages = buildPrompt(attribute, context);
  const llm = getDefaultProvider();

  const responseSchema = z.object({
    value: z.union([z.string(), z.number(), z.boolean()]),
    confidence: z.number().min(0).max(1),
  });

  const { data } = await llm.completeJSON(messages, responseSchema, {
    temperature: 0.1,
    maxTokens: 256,
  });

  const valueStr = String(data.value);

  // Upsert the value
  await prisma.aiAttributeValue.upsert({
    where: {
      attributeId_entityId: { attributeId, entityId },
    },
    create: {
      attributeId,
      entityId,
      value: valueStr,
      confidence: data.confidence,
      computedAt: new Date(),
    },
    update: {
      value: valueStr,
      confidence: data.confidence,
      computedAt: new Date(),
    },
  });

  return { value: valueStr, confidence: data.confidence };
}

// ---------------------------------------------------------------------------
// Compute ALL auto-run attributes for an entity in a single batched call
// ---------------------------------------------------------------------------
export async function computeForEntity(
  entityId: string,
  entityType: string,
  userId?: string
): Promise<{ computed: number }> {
  const where: Record<string, unknown> = {
    entityType,
    autoRun: true,
  };
  if (userId) where.userId = userId;

  const attributes = await prisma.aiAttribute.findMany({ where });

  if (attributes.length === 0) return { computed: 0 };

  const context = await assembleContext(entityId, entityType, []);
  if (Object.keys(context).length === 0) return { computed: 0 };

  const llm = getDefaultProvider();
  let computed = 0;

  // Batch: compute all attributes in one LLM call
  if (attributes.length <= 5) {
    const batchPrompt: LLMMessage[] = [
      {
        role: "system",
        content: `You are an AI attribute engine for a CRM. Analyze the record data and produce values for multiple attributes.

Respond with JSON: { "results": [ { "slug": "<attribute_slug>", "value": <answer>, "confidence": <0.0-1.0> }, ... ] }`,
      },
      {
        role: "user",
        content: `Attributes to compute:
${attributes.map((a) => {
  let typeHint = "";
  if (a.outputType === "select") typeHint = ` (choose one of: ${(a.options as string[])?.join(", ")})`;
  else if (a.outputType === "number") typeHint = " (respond with a number)";
  else if (a.outputType === "boolean") typeHint = " (respond true or false)";
  else typeHint = " (1-3 sentences)";
  return `- ${a.slug}: ${a.prompt}${typeHint}`;
}).join("\n")}

Record data:
${JSON.stringify(context, null, 2)}`,
      },
    ];

    const batchSchema = z.object({
      results: z.array(z.object({
        slug: z.string(),
        value: z.union([z.string(), z.number(), z.boolean()]),
        confidence: z.number().min(0).max(1),
      })),
    });

    try {
      const { data } = await llm.completeJSON(batchPrompt, batchSchema, {
        temperature: 0.1,
        maxTokens: 1024,
      });

      for (const result of data.results) {
        const attr = attributes.find((a) => a.slug === result.slug);
        if (!attr) continue;

        await prisma.aiAttributeValue.upsert({
          where: { attributeId_entityId: { attributeId: attr.id, entityId } },
          create: {
            attributeId: attr.id,
            entityId,
            value: String(result.value),
            confidence: result.confidence,
          },
          update: {
            value: String(result.value),
            confidence: result.confidence,
            computedAt: new Date(),
          },
        });
        computed++;
      }
    } catch (error) {
      console.error("[AI Attributes] Batch compute failed, falling back to individual:", error);
      // Fall back to individual computation
      for (const attr of attributes) {
        try {
          await computeAttribute(attr.id, entityId);
          computed++;
        } catch {
          // Skip failed individual attributes
        }
      }
    }
  } else {
    // Too many attributes for one call — compute individually
    for (const attr of attributes) {
      try {
        await computeAttribute(attr.id, entityId);
        computed++;
      } catch {
        // Skip failures
      }
    }
  }

  return { computed };
}

// ---------------------------------------------------------------------------
// Compute an attribute across ALL entities of its type (batch with rate limiting)
// ---------------------------------------------------------------------------
export async function computeForAll(
  attributeId: string
): Promise<{ total: number; computed: number; failed: number }> {
  const attribute = await prisma.aiAttribute.findUnique({
    where: { id: attributeId },
  });

  if (!attribute) throw new Error(`AI Attribute ${attributeId} not found`);

  let entityIds: string[] = [];

  if (attribute.entityType === "contact") {
    const entities = await prisma.contact.findMany({
      where: attribute.userId ? { userId: attribute.userId } : {},
      select: { id: true },
    });
    entityIds = entities.map((e) => e.id);
  } else if (attribute.entityType === "deal") {
    const entities = await prisma.deal.findMany({
      where: attribute.userId ? { userId: attribute.userId } : {},
      select: { id: true },
    });
    entityIds = entities.map((e) => e.id);
  } else if (attribute.entityType === "property") {
    const entities = await prisma.property.findMany({
      where: attribute.userId ? { userId: attribute.userId } : {},
      select: { id: true },
    });
    entityIds = entities.map((e) => e.id);
  }

  let computed = 0;
  let failed = 0;

  for (const entityId of entityIds) {
    try {
      await computeAttribute(attributeId, entityId);
      computed++;
    } catch {
      failed++;
    }
    // Rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  return { total: entityIds.length, computed, failed };
}
