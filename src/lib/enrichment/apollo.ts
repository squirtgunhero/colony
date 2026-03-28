// ============================================================================
// COLONY - Apollo.io Enrichment Provider
// Uses People Match API: POST /v1/people/match
// ============================================================================

import type { EnrichmentProvider, EnrichmentResult } from "./types";

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;
const BASE_URL = "https://api.apollo.io/v1";

function mapApolloResponse(data: Record<string, unknown>): EnrichmentResult | null {
  const person = data.person as Record<string, unknown> | undefined;
  if (!person) return null;

  const org = person.organization as Record<string, unknown> | undefined;

  return {
    email: (person.email as string) || "",
    firstName: (person.first_name as string) || null,
    lastName: (person.last_name as string) || null,
    jobTitle: (person.title as string) || null,
    company: (org?.name as string) || (person.organization_name as string) || null,
    companyDomain: (org?.primary_domain as string) || (person.organization_domain as string) || null,
    companySize: (org?.estimated_num_employees as string)?.toString() || null,
    industry: (org?.industry as string) || null,
    linkedinUrl: (person.linkedin_url as string) || null,
    twitterUrl: (person.twitter_url as string) || null,
    avatarUrl: (person.photo_url as string) || null,
    location: [person.city, person.state, person.country]
      .filter(Boolean)
      .join(", ") || null,
    confidence: person.email_status === "verified" ? 0.95 : 0.7,
    source: "apollo",
  };
}

export const apolloProvider: EnrichmentProvider = {
  name: "apollo",

  async enrich(email: string): Promise<EnrichmentResult | null> {
    if (!APOLLO_API_KEY) return null;

    const response = await fetch(`${BASE_URL}/people/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("Apollo rate limit exceeded");
      return null;
    }

    const data = await response.json();
    return mapApolloResponse(data);
  },

  async enrichBatch(emails: string[]): Promise<Map<string, EnrichmentResult>> {
    const results = new Map<string, EnrichmentResult>();
    if (!APOLLO_API_KEY) return results;

    // Apollo doesn't have a native batch endpoint — process sequentially with delay
    for (const email of emails) {
      try {
        const result = await this.enrich(email);
        if (result) results.set(email, result);
        // Rate limit: ~5 req/sec
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        // Skip on rate limit or error
      }
    }
    return results;
  },

  async getRemainingCredits(): Promise<number | null> {
    if (!APOLLO_API_KEY) return null;
    // Apollo doesn't expose credits via API — return null
    return null;
  },
};
