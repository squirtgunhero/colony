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
  CreateAdSetParams,
  CreateAdSetResponse,
  CreateAdCreativeParams,
  CreateAdCreativeResponse,
  CreateAdParams,
  CreateAdResponse,
  UploadImageResponse,
} from "./types";

const META_GRAPH_API_VERSION = "v22.0";
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
      console.error("[META API] Full error response:", JSON.stringify(data, null, 2));
      const err = data as MetaErrorResponse;
      let detail: string;
      if (err.error) {
        const parts = [
          err.error.message,
          `(code: ${err.error.code}, type: ${err.error.type}, subcode: ${err.error.error_subcode || "none"}, fbtrace: ${err.error.fbtrace_id || "none"})`,
        ];
        if (err.error.error_user_msg) {
          parts.push(`Detail: ${err.error.error_user_msg}`);
        }
        if (err.error.error_user_title) {
          parts.push(`Title: ${err.error.error_user_title}`);
        }
        detail = parts.join(" ");
      } else {
        detail = `HTTP ${response.status}: ${JSON.stringify(data)}`;
      }
      console.error("[META API] Error:", detail);
      throw new Error(detail);
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
    const payload: Record<string, unknown> = {
      name: params.name,
      objective: params.objective,
      status: params.status || "PAUSED",
      special_ad_categories: params.special_ad_categories || [],
      is_adset_budget_sharing_enabled: false,
    };

    // For HOUSING category, Meta requires the country field
    if (params.special_ad_categories?.includes("HOUSING")) {
      payload.special_ad_category_country = ["US"];
    }

    console.log("[META API] createCampaign:", {
      endpoint: `/${adAccountId}/campaigns`,
      payload,
    });

    return this.request<{ id: string }>(`/${adAccountId}/campaigns`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Search for a city's targeting key (required for geo_locations)
   */
  async searchCity(cityName: string): Promise<{ key: string; name: string; region: string; country_code: string } | null> {
    const url = new URL(`${META_GRAPH_API_BASE}/search`);
    url.searchParams.set("access_token", this.accessToken);
    url.searchParams.set("type", "adgeolocation");
    url.searchParams.set("location_types", JSON.stringify(["city"]));
    url.searchParams.set("q", cityName);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok || !data.data?.length) {
      console.error("[META API] City search failed for:", cityName, data);
      return null;
    }

    // Prefer US results
    const usCity = data.data.find((c: { country_code: string }) => c.country_code === "US") || data.data[0];
    console.log("[META API] Found city:", usCity);
    return usCity;
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
  // Ad Set Creation
  // ============================================

  /**
   * Create a new ad set within a campaign
   */
  async createAdSet(
    adAccountId: string,
    params: CreateAdSetParams
  ): Promise<CreateAdSetResponse> {
    const body = new URLSearchParams();
    body.set("name", params.name);
    body.set("campaign_id", params.campaign_id);
    body.set("billing_event", params.billing_event);
    body.set("optimization_goal", params.optimization_goal);
    body.set("daily_budget", String(params.daily_budget));
    body.set("targeting", JSON.stringify(params.targeting));
    body.set("start_time", params.start_time);
    body.set("status", params.status);
    if (params.special_ad_categories) {
      body.set("special_ad_categories", JSON.stringify(params.special_ad_categories));
    }
    if (params.bid_strategy) {
      body.set("bid_strategy", params.bid_strategy);
    }
    if (params.bid_amount) {
      body.set("bid_amount", String(params.bid_amount));
    }

    return this.request<CreateAdSetResponse>(`/${adAccountId}/adsets`, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  }

  /**
   * Update an existing ad set (e.g., change daily_budget)
   */
  async updateAdSet(
    adSetId: string,
    params: { daily_budget?: number; status?: string }
  ): Promise<{ success: boolean }> {
    const body = new URLSearchParams();
    if (params.daily_budget !== undefined) {
      body.set("daily_budget", String(params.daily_budget));
    }
    if (params.status) {
      body.set("status", params.status);
    }

    return this.request<{ success: boolean }>(`/${adSetId}`, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  }

  // ============================================
  // Ad Creative Creation
  // ============================================

  /**
   * Create an ad creative (image + copy)
   */
  async createAdCreative(
    adAccountId: string,
    params: CreateAdCreativeParams
  ): Promise<CreateAdCreativeResponse> {
    const body = new URLSearchParams();
    body.set("name", params.name);

    if (params.object_story_spec) {
      body.set("object_story_spec", JSON.stringify(params.object_story_spec));
    }
    if (params.asset_feed_spec) {
      body.set("asset_feed_spec", JSON.stringify(params.asset_feed_spec));
    }
    if (params.degrees_of_freedom_spec) {
      body.set("degrees_of_freedom_spec", JSON.stringify(params.degrees_of_freedom_spec));
    }

    return this.request<CreateAdCreativeResponse>(`/${adAccountId}/adcreatives`, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  }

  // ============================================
  // Ad Creation
  // ============================================

  /**
   * Create an ad linking an ad set and creative
   */
  async createAd(
    adAccountId: string,
    params: CreateAdParams
  ): Promise<CreateAdResponse> {
    const body = new URLSearchParams();
    body.set("name", params.name);
    body.set("adset_id", params.adset_id);
    body.set("creative", JSON.stringify(params.creative));
    body.set("status", params.status);

    return this.request<CreateAdResponse>(`/${adAccountId}/ads`, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  }

  // ============================================
  // Image Upload
  // ============================================

  /**
   * Download an image from a URL and upload it to a Meta ad account.
   * Returns the image hash for use in ad creatives.
   */
  async uploadImage(
    adAccountId: string,
    imageUrl: string
  ): Promise<{ hash: string }> {
    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image from ${imageUrl}: ${imageResponse.status}`);
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Build multipart form data
    const boundary = `----FormBoundary${Date.now()}`;
    const filename = "ad_image.jpg";

    const preamble = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="filename"; filename="${filename}"`,
      `Content-Type: image/jpeg`,
      "",
      "",
    ].join("\r\n");

    const epilogue = `\r\n--${boundary}--\r\n`;

    const preambleBuffer = Buffer.from(preamble);
    const epilogueBuffer = Buffer.from(epilogue);
    const bodyBuffer = Buffer.concat([preambleBuffer, imageBuffer, epilogueBuffer]);

    const url = new URL(`${META_GRAPH_API_BASE}/${adAccountId}/adimages`);
    url.searchParams.set("access_token", this.accessToken);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as { error?: { message?: string } };
      throw new Error(error.error?.message || `Meta image upload error: ${response.status}`);
    }

    const uploadResult = data as UploadImageResponse;
    // The response has images keyed by filename
    const imageInfo = uploadResult.images?.[filename] || Object.values(uploadResult.images || {})[0];
    if (!imageInfo?.hash) {
      throw new Error("Image upload succeeded but no hash returned");
    }

    return { hash: imageInfo.hash };
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
