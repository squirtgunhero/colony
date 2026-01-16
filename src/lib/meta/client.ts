// ============================================
// META MARKETING API CLIENT
// Facebook/Instagram Ads API integration
// ============================================

import type {
  MetaOAuthConfig,
  MetaTokenResponse,
  MetaLongLivedTokenResponse,
  MetaUser,
  MetaAdAccountsResponse,
  MetaCampaignsResponse,
  MetaAdSetsResponse,
  MetaAdsResponse,
  MetaInsightsListResponse,
  MetaInsightsParams,
  MetaErrorResponse,
} from "./types";

const META_GRAPH_API_VERSION = "v21.0";
const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

// ============================================
// Configuration
// ============================================

export function getMetaConfig(): MetaOAuthConfig {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/callback`;

  if (!appId || !appSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET must be set in environment variables");
  }

  return { appId, appSecret, redirectUri };
}

// ============================================
// OAuth Flow
// ============================================

/**
 * Generate the Facebook OAuth authorization URL
 */
export function getAuthorizationUrl(state?: string): string {
  const config = getMetaConfig();
  
  const scopes = [
    "ads_management",
    "ads_read",
    "business_management",
    "pages_read_engagement",
  ].join(",");

  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    scope: scopes,
    response_type: "code",
    ...(state && { state }),
  });

  return `https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth?${params}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<MetaTokenResponse> {
  const config = getMetaConfig();

  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const response = await fetch(
    `${META_GRAPH_API_BASE}/oauth/access_token?${params}`,
    { method: "GET" }
  );

  const data = await response.json();

  if (!response.ok) {
    const error = data as MetaErrorResponse;
    throw new Error(error.error?.message || "Failed to exchange code for token");
  }

  return data as MetaTokenResponse;
}

/**
 * Exchange short-lived token for long-lived token (~60 days)
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<MetaLongLivedTokenResponse> {
  const config = getMetaConfig();

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `${META_GRAPH_API_BASE}/oauth/access_token?${params}`,
    { method: "GET" }
  );

  const data = await response.json();

  if (!response.ok) {
    const error = data as MetaErrorResponse;
    throw new Error(error.error?.message || "Failed to get long-lived token");
  }

  return data as MetaLongLivedTokenResponse;
}

// ============================================
// API Client
// ============================================

class MetaApiClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = new URL(`${META_GRAPH_API_BASE}${endpoint}`);
    url.searchParams.set("access_token", this.accessToken);

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as MetaErrorResponse;
      throw new Error(error.error?.message || `Meta API error: ${response.status}`);
    }

    return data as T;
  }

  // ============================================
  // User & Account Methods
  // ============================================

  /**
   * Get the authenticated user's profile
   */
  async getMe(): Promise<MetaUser> {
    return this.request<MetaUser>("/me?fields=id,name,email");
  }

  /**
   * Get ad accounts the user has access to
   */
  async getAdAccounts(): Promise<MetaAdAccountsResponse> {
    return this.request<MetaAdAccountsResponse>(
      "/me/adaccounts?fields=id,account_id,name,account_status,currency,timezone_name,amount_spent,balance,business{id,name}"
    );
  }

  // ============================================
  // Campaign Methods
  // ============================================

  /**
   * Get all campaigns for an ad account
   */
  async getCampaigns(adAccountId: string): Promise<MetaCampaignsResponse> {
    return this.request<MetaCampaignsResponse>(
      `/${adAccountId}/campaigns?fields=id,name,objective,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time&limit=500`
    );
  }

  /**
   * Create a new campaign
   */
  async createCampaign(
    adAccountId: string,
    params: {
      name: string;
      objective: string;
      status?: string;
      special_ad_categories?: string[];
    }
  ): Promise<{ id: string }> {
    const body = new URLSearchParams();
    body.set("name", params.name);
    body.set("objective", params.objective);
    body.set("status", params.status || "PAUSED");
    body.set("special_ad_categories", JSON.stringify(params.special_ad_categories || []));

    return this.request<{ id: string }>(`/${adAccountId}/campaigns`, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(campaignId: string, status: string): Promise<{ success: boolean }> {
    const body = new URLSearchParams();
    body.set("status", status);

    return this.request<{ success: boolean }>(`/${campaignId}`, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  }

  // ============================================
  // Ad Set Methods
  // ============================================

  /**
   * Get all ad sets for an ad account
   */
  async getAdSets(adAccountId: string): Promise<MetaAdSetsResponse> {
    return this.request<MetaAdSetsResponse>(
      `/${adAccountId}/adsets?fields=id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,targeting,start_time,end_time,created_time,updated_time&limit=500`
    );
  }

  /**
   * Get ad sets for a specific campaign
   */
  async getCampaignAdSets(campaignId: string): Promise<MetaAdSetsResponse> {
    return this.request<MetaAdSetsResponse>(
      `/${campaignId}/adsets?fields=id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,targeting,start_time,end_time,created_time,updated_time&limit=500`
    );
  }

  // ============================================
  // Ad Methods
  // ============================================

  /**
   * Get all ads for an ad account
   */
  async getAds(adAccountId: string): Promise<MetaAdsResponse> {
    return this.request<MetaAdsResponse>(
      `/${adAccountId}/ads?fields=id,name,adset_id,status,effective_status,creative{id},preview_shareable_link,created_time,updated_time&limit=500`
    );
  }

  /**
   * Get ads for a specific ad set
   */
  async getAdSetAds(adSetId: string): Promise<MetaAdsResponse> {
    return this.request<MetaAdsResponse>(
      `/${adSetId}/ads?fields=id,name,adset_id,status,effective_status,creative{id},preview_shareable_link,created_time,updated_time&limit=500`
    );
  }

  // ============================================
  // Insights Methods
  // ============================================

  /**
   * Get insights for an ad account
   */
  async getAccountInsights(
    adAccountId: string,
    params: MetaInsightsParams = {}
  ): Promise<MetaInsightsListResponse> {
    const fields = params.fields || [
      "impressions",
      "clicks",
      "spend",
      "reach",
      "frequency",
      "ctr",
      "cpc",
      "cpm",
      "actions",
      "cost_per_action_type",
    ];

    const queryParams = new URLSearchParams();
    queryParams.set("fields", fields.join(","));
    
    if (params.date_preset) {
      queryParams.set("date_preset", params.date_preset);
    }
    if (params.time_range) {
      queryParams.set("time_range", JSON.stringify(params.time_range));
    }
    if (params.time_increment) {
      queryParams.set("time_increment", String(params.time_increment));
    }
    if (params.level) {
      queryParams.set("level", params.level);
    }

    return this.request<MetaInsightsListResponse>(
      `/${adAccountId}/insights?${queryParams}`
    );
  }

  /**
   * Get insights for a specific campaign
   */
  async getCampaignInsights(
    campaignId: string,
    params: MetaInsightsParams = {}
  ): Promise<MetaInsightsListResponse> {
    const fields = params.fields || [
      "campaign_id",
      "campaign_name",
      "impressions",
      "clicks",
      "spend",
      "reach",
      "frequency",
      "ctr",
      "cpc",
      "cpm",
      "actions",
      "cost_per_action_type",
    ];

    const queryParams = new URLSearchParams();
    queryParams.set("fields", fields.join(","));
    
    if (params.date_preset) {
      queryParams.set("date_preset", params.date_preset);
    }
    if (params.time_range) {
      queryParams.set("time_range", JSON.stringify(params.time_range));
    }
    if (params.time_increment) {
      queryParams.set("time_increment", String(params.time_increment));
    }

    return this.request<MetaInsightsListResponse>(
      `/${campaignId}/insights?${queryParams}`
    );
  }

  /**
   * Get insights broken down by campaign
   */
  async getInsightsByCampaign(
    adAccountId: string,
    params: MetaInsightsParams = {}
  ): Promise<MetaInsightsListResponse> {
    return this.getAccountInsights(adAccountId, {
      ...params,
      level: "campaign",
      fields: [
        "campaign_id",
        "campaign_name",
        "impressions",
        "clicks",
        "spend",
        "reach",
        "frequency",
        "ctr",
        "cpc",
        "cpm",
        "actions",
        "cost_per_action_type",
      ],
    });
  }
}

/**
 * Create a Meta API client instance
 */
export function createMetaClient(accessToken: string): MetaApiClient {
  return new MetaApiClient(accessToken);
}

export { MetaApiClient };
