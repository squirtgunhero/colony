// AI Attribute Executors
import { prisma } from "@/lib/prisma";
import type { ActionExecutor } from "../types";
import { computeAttribute, computeForEntity } from "@/lib/ai-attributes/engine";
import { seedPresetAttributes } from "@/lib/ai-attributes/presets";

export const aiAttributeExecutors: Record<string, ActionExecutor> = {
  "ai.computeAttribute": async (action, ctx) => {
    const payload = action.payload as {
      attributeId?: string;
      attributeSlug?: string;
      contactId?: string;
      contactName?: string;
      entityId?: string;
    };

    // Resolve entity
    let entityId = payload.entityId || payload.contactId;
    if (!entityId && payload.contactName) {
      const contact = await prisma.contact.findFirst({
        where: { userId: ctx.user_id, name: { contains: payload.contactName, mode: "insensitive" } },
      });
      if (!contact) {
        return { action_id: action.action_id, action_type: action.type, status: "failed", error: `Contact "${payload.contactName}" not found` };
      }
      entityId = contact.id;
    }

    // Resolve attribute
    let attributeId = payload.attributeId;
    if (!attributeId && payload.attributeSlug) {
      const attr = await prisma.aiAttribute.findFirst({
        where: { userId: ctx.user_id, slug: payload.attributeSlug },
      });
      if (!attr) {
        return { action_id: action.action_id, action_type: action.type, status: "failed", error: `Attribute "${payload.attributeSlug}" not found` };
      }
      attributeId = attr.id;
    }

    if (!entityId) {
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: "No contact/entity specified" };
    }

    try {
      if (attributeId) {
        // Compute a single attribute
        const result = await computeAttribute(attributeId, entityId);
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success",
          data: { attributeId, entityId, ...result },
        };
      } else {
        // Compute all auto-run attributes for the entity
        const attr = await prisma.aiAttribute.findFirst({
          where: { userId: ctx.user_id },
          select: { entityType: true },
        });
        const entityType = attr?.entityType || "contact";
        const result = await computeForEntity(entityId, entityType, ctx.user_id);
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success",
          data: { entityId, ...result },
        };
      }
    } catch (error) {
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: error instanceof Error ? error.message : "Computation failed" };
    }
  },

  "ai.createAttribute": async (action, ctx) => {
    const payload = action.payload as {
      name: string;
      slug?: string;
      entityType: string;
      outputType: string;
      options?: string[];
      prompt: string;
      contextFields?: string[];
      autoRun?: boolean;
    };

    const slug = payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    try {
      const attribute = await prisma.aiAttribute.create({
        data: {
          userId: ctx.user_id,
          name: payload.name,
          slug,
          entityType: payload.entityType,
          outputType: payload.outputType,
          options: payload.options || undefined,
          prompt: payload.prompt,
          contextFields: payload.contextFields || [],
          autoRun: payload.autoRun ?? false,
        },
      });

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success",
        data: { id: attribute.id, name: attribute.name, slug: attribute.slug },
      };
    } catch (error) {
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: error instanceof Error ? error.message : "Failed to create attribute" };
    }
  },

  "ai.getAttributeValue": async (action, ctx) => {
    const payload = action.payload as {
      contactId?: string;
      contactName?: string;
      entityId?: string;
      attributeSlug?: string;
    };

    // Resolve entity
    let entityId = payload.entityId || payload.contactId;
    if (!entityId && payload.contactName) {
      const contact = await prisma.contact.findFirst({
        where: { userId: ctx.user_id, name: { contains: payload.contactName, mode: "insensitive" } },
      });
      if (!contact) {
        return { action_id: action.action_id, action_type: action.type, status: "failed", error: `Contact "${payload.contactName}" not found` };
      }
      entityId = contact.id;
    }

    if (!entityId) {
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: "No contact/entity specified" };
    }

    // Get attribute values
    const where: Record<string, unknown> = { entityId };
    if (payload.attributeSlug) {
      const attr = await prisma.aiAttribute.findFirst({
        where: { userId: ctx.user_id, slug: payload.attributeSlug },
      });
      if (attr) {
        where.attributeId = attr.id;
      }
    }

    const values = await prisma.aiAttributeValue.findMany({
      where,
      include: { attribute: { select: { name: true, slug: true, outputType: true } } },
      orderBy: { computedAt: "desc" },
    });

    return {
      action_id: action.action_id,
      action_type: action.type,
      status: "success",
      data: {
        entityId,
        attributes: values.map((v) => ({
          name: v.attribute.name,
          slug: v.attribute.slug,
          value: v.value,
          confidence: v.confidence,
          outputType: v.attribute.outputType,
          computedAt: v.computedAt,
        })),
      },
    };
  },

  "ai.seedPresets": async (action, ctx) => {
    try {
      const seeded = await seedPresetAttributes(ctx.user_id);
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success",
        data: { seeded, message: seeded > 0 ? `Created ${seeded} preset AI attributes` : "All presets already exist" },
      };
    } catch (error) {
      return { action_id: action.action_id, action_type: action.type, status: "failed", error: error instanceof Error ? error.message : "Failed to seed presets" };
    }
  },
};
