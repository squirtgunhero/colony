// ============================================================================
// COLONY - Enrichment Engine
// Tries Apollo first, falls back to PDL
// ============================================================================

import { prisma } from "@/lib/prisma";
import { apolloProvider } from "./apollo";
import { pdlProvider } from "./pdl";
import type { EnrichmentResult } from "./types";

export type { EnrichmentResult, EnrichmentProvider } from "./types";

const providers = [apolloProvider, pdlProvider];

/**
 * Enrich a single contact by ID.
 * Tries Apollo first, falls back to PDL.
 * Only fills empty fields — never overwrites user-entered data.
 */
export async function enrichContact(
  contactId: string
): Promise<{ result: EnrichmentResult | null; provider: string | null }> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      email: true,
      name: true,
      jobTitle: true,
      companyName: true,
      companyDomain: true,
      industry: true,
      linkedinUrl: true,
      avatarUrl: true,
    },
  });

  if (!contact?.email) {
    return { result: null, provider: null };
  }

  let enrichmentResult: EnrichmentResult | null = null;
  let usedProvider: string | null = null;

  for (const provider of providers) {
    try {
      enrichmentResult = await provider.enrich(contact.email);
      if (enrichmentResult) {
        usedProvider = provider.name;
        break;
      }
    } catch (error) {
      console.error(`[Enrichment] ${provider.name} failed for ${contact.email}:`, error);
    }
  }

  if (!enrichmentResult) {
    return { result: null, provider: null };
  }

  // Only fill empty fields — never overwrite user-entered data
  const updates: Record<string, unknown> = {};

  if (!contact.jobTitle && enrichmentResult.jobTitle) {
    updates.jobTitle = enrichmentResult.jobTitle;
  }
  if (!contact.companyName && enrichmentResult.company) {
    updates.companyName = enrichmentResult.company;
  }
  if (!contact.companyDomain && enrichmentResult.companyDomain) {
    updates.companyDomain = enrichmentResult.companyDomain;
  }
  if (!contact.industry && enrichmentResult.industry) {
    updates.industry = enrichmentResult.industry;
  }
  if (!contact.linkedinUrl && enrichmentResult.linkedinUrl) {
    updates.linkedinUrl = enrichmentResult.linkedinUrl;
  }
  if (!contact.avatarUrl && enrichmentResult.avatarUrl) {
    updates.avatarUrl = enrichmentResult.avatarUrl;
  }

  // Update name if contact was auto-created with email as name
  if (contact.name === contact.email && enrichmentResult.firstName) {
    const fullName = [enrichmentResult.firstName, enrichmentResult.lastName]
      .filter(Boolean)
      .join(" ");
    if (fullName) updates.name = fullName;
  }

  // Always set enrichment metadata
  updates.enrichedAt = new Date();
  updates.enrichmentSource = usedProvider;
  updates.enrichmentRaw = JSON.parse(JSON.stringify(enrichmentResult));

  await prisma.contact.update({
    where: { id: contactId },
    data: updates,
  });

  return { result: enrichmentResult, provider: usedProvider };
}

/**
 * Batch enrich contacts by IDs with rate limiting.
 */
export async function enrichBatch(
  contactIds: string[]
): Promise<{ enriched: number; failed: number }> {
  let enriched = 0;
  let failed = 0;

  for (const contactId of contactIds) {
    try {
      const { result } = await enrichContact(contactId);
      if (result) {
        enriched++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
    // Rate limit between contacts
    await new Promise((r) => setTimeout(r, 300));
  }

  return { enriched, failed };
}
