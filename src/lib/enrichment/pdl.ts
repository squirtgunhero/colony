// ============================================================================
// COLONY - People Data Labs Enrichment Provider (Fallback)
// Uses Person Enrich API: POST /v5/person/enrich
// ============================================================================

import type { EnrichmentProvider, EnrichmentResult } from "./types";

const PDL_API_KEY = process.env.PDL_API_KEY;
const BASE_URL = "https://api.peopledatalabs.com/v5";

function mapPdlResponse(data: Record<string, unknown>): EnrichmentResult | null {
  if (!data || data.status === 404) return null;

  const likelihood = (data.likelihood as number) || 0;
  if (likelihood < 0.3) return null;

  const experience = (data.experience as Array<Record<string, unknown>>)?.[0];
  const profiles = data.profiles as Array<Record<string, unknown>> | undefined;
  const linkedin = profiles?.find((p) => (p.network as string) === "linkedin");
  const twitter = profiles?.find((p) => (p.network as string) === "twitter");
  const loc = data.location_name as string | undefined;

  return {
    email: (data.work_email as string) || (data.personal_emails as string[])?.[0] || "",
    firstName: (data.first_name as string) || null,
    lastName: (data.last_name as string) || null,
    jobTitle: (data.job_title as string) || (experience?.title as string) || null,
    company: (data.job_company_name as string) || ((experience?.company as Record<string, unknown>)?.name as string) || null,
    companyDomain: (data.job_company_website as string) || null,
    companySize: (data.job_company_size as string) || null,
    industry: (data.industry as string) || (data.job_company_industry as string) || null,
    linkedinUrl: (linkedin?.url as string) || (data.linkedin_url as string) || null,
    twitterUrl: (twitter?.url as string) || (data.twitter_url as string) || null,
    avatarUrl: (data.profile_pic_url as string) || null,
    location: loc || null,
    confidence: likelihood,
    source: "pdl",
  };
}

export const pdlProvider: EnrichmentProvider = {
  name: "pdl",

  async enrich(email: string): Promise<EnrichmentResult | null> {
    if (!PDL_API_KEY) return null;

    const response = await fetch(`${BASE_URL}/person/enrich`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": PDL_API_KEY,
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("PDL rate limit exceeded");
      return null;
    }

    const data = await response.json();
    return mapPdlResponse(data.data || data);
  },

  async enrichBatch(emails: string[]): Promise<Map<string, EnrichmentResult>> {
    const results = new Map<string, EnrichmentResult>();
    if (!PDL_API_KEY) return results;

    for (const email of emails) {
      try {
        const result = await this.enrich(email);
        if (result) results.set(email, result);
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        // Skip on error
      }
    }
    return results;
  },

  async getRemainingCredits(): Promise<number | null> {
    if (!PDL_API_KEY) return null;
    return null;
  },
};
