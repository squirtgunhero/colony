// ============================================================================
// COLONY - AI Attribute Presets
// Default attributes seeded on team creation / onboarding
// ============================================================================

import { prisma } from "@/lib/prisma";

export interface PresetAttribute {
  name: string;
  slug: string;
  entityType: string;
  outputType: string;
  options: string[] | null;
  prompt: string;
  contextFields: string[];
  autoRun: boolean;
}

export const PRESET_ATTRIBUTES: PresetAttribute[] = [
  {
    name: "Lead Quality",
    slug: "lead-quality",
    entityType: "contact",
    outputType: "select",
    options: ["Hot", "Warm", "Cold"],
    prompt:
      "Evaluate this contact's lead quality based on their engagement level, deal activity, interaction recency, and enrichment data. Hot = highly engaged with active deals or recent interactions. Warm = some engagement or stale deals. Cold = minimal engagement, no deals, no recent activity.",
    contextFields: ["relationship", "deals", "activities", "interactions", "enrichment"],
    autoRun: true,
  },
  {
    name: "ICP Fit",
    slug: "icp-fit",
    entityType: "contact",
    outputType: "select",
    options: ["Tier 1", "Tier 2", "Tier 3"],
    prompt:
      "Assess how well this contact fits the ideal customer profile. Tier 1 = strong fit (decision maker at a relevant company, clear budget signals, active engagement). Tier 2 = moderate fit (some relevant signals but missing key indicators). Tier 3 = weak fit (few or no matching indicators).",
    contextFields: ["enrichment", "deals", "relationship"],
    autoRun: true,
  },
  {
    name: "Summary",
    slug: "summary",
    entityType: "contact",
    outputType: "text",
    options: null,
    prompt:
      "Write a concise 2-sentence summary of this contact. Include their role, company, relationship strength, and any notable deal or interaction activity. Focus on what a salesperson would need to know before reaching out.",
    contextFields: ["enrichment", "deals", "activities", "interactions", "relationship"],
    autoRun: true,
  },
  {
    name: "Follow-up Priority",
    slug: "follow-up-priority",
    entityType: "contact",
    outputType: "number",
    options: null,
    prompt:
      "Rate the urgency of following up with this contact on a scale of 1-10. Consider: days since last contact (longer = more urgent if engaged), open deal stages (near closing = high priority), overdue tasks, recent inbound emails without reply. 10 = follow up immediately, 1 = no action needed.",
    contextFields: ["relationship", "deals", "tasks", "activities", "interactions"],
    autoRun: true,
  },
];

/**
 * Seed preset attributes for a user. Skips any that already exist.
 */
export async function seedPresetAttributes(userId: string): Promise<number> {
  let seeded = 0;

  for (const preset of PRESET_ATTRIBUTES) {
    const existing = await prisma.aiAttribute.findUnique({
      where: { userId_slug: { userId, slug: preset.slug } },
    });

    if (!existing) {
      await prisma.aiAttribute.create({
        data: {
          userId,
          name: preset.name,
          slug: preset.slug,
          entityType: preset.entityType,
          outputType: preset.outputType,
          options: preset.options ?? undefined,
          prompt: preset.prompt,
          contextFields: preset.contextFields,
          autoRun: preset.autoRun,
          isPreset: true,
        },
      });
      seeded++;
    }
  }

  return seeded;
}
