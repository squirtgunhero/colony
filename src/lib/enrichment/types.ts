// ============================================================================
// COLONY - Data Enrichment Types
// ============================================================================

export interface EnrichmentResult {
  email: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  company: string | null;
  companyDomain: string | null;
  companySize: string | null;
  industry: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  avatarUrl: string | null;
  location: string | null;
  confidence: number; // 0-1
  source: string; // provider name
}

export interface EnrichmentProvider {
  name: string;
  enrich(email: string): Promise<EnrichmentResult | null>;
  enrichBatch(emails: string[]): Promise<Map<string, EnrichmentResult>>;
  getRemainingCredits(): Promise<number | null>;
}
