// ============================================
// META AD LIBRARY API CLIENT
// Public Ad Library API for competitor research
// Uses app-level access tokens (no user auth needed)
// ============================================

import type { AdLibraryAd, AdLibraryResponse } from "./types";

const META_GRAPH_API_VERSION = "v22.0";
const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

// ============================================
// App-Level Access Token
// ============================================

function getAppAccessToken(): string {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET must be set for Ad Library access");
  }

  return `${appId}|${appSecret}`;
}

// ============================================
// Ad Library Client
// ============================================

export class MetaAdLibraryClient {
  private accessToken: string;

  constructor() {
    this.accessToken = getAppAccessToken();
  }

  /**
   * Search the Meta Ad Library by keyword, advertiser name, or page
   */
  async searchAds(params: {
    search_terms?: string;
    search_page_ids?: string[];
    ad_type?: "ALL" | "POLITICAL_AND_ISSUE_ADS";
    ad_reached_countries: string[];
    ad_active_status?: "ALL" | "ACTIVE" | "INACTIVE";
    limit?: number;
    fields?: string[];
  }): Promise<AdLibraryResponse> {
    const defaultFields = [
      "id",
      "ad_creation_time",
      "ad_creative_bodies",
      "ad_creative_link_captions",
      "ad_creative_link_descriptions",
      "ad_creative_link_titles",
      "ad_delivery_start_time",
      "ad_delivery_stop_time",
      "ad_snapshot_url",
      "bylines",
      "currency",
      "delivery_by_region",
      "demographic_distribution",
      "estimated_audience_size",
      "impressions",
      "page_id",
      "page_name",
      "publisher_platforms",
      "spend",
      "languages",
    ];

    const queryParams = new URLSearchParams();
    queryParams.set("access_token", this.accessToken);
    queryParams.set("fields", (params.fields || defaultFields).join(","));
    queryParams.set("ad_reached_countries", JSON.stringify(params.ad_reached_countries));
    queryParams.set("ad_type", params.ad_type || "ALL");
    queryParams.set("limit", String(params.limit || 25));

    if (params.search_terms) {
      queryParams.set("search_terms", params.search_terms);
    }
    if (params.search_page_ids && params.search_page_ids.length > 0) {
      queryParams.set("search_page_ids", JSON.stringify(params.search_page_ids));
    }
    if (params.ad_active_status) {
      queryParams.set("ad_active_status", params.ad_active_status);
    }

    const response = await fetch(
      `${META_GRAPH_API_BASE}/ads_archive?${queryParams}`,
      { method: "GET" }
    );

    const data = await response.json();

    if (!response.ok) {
      const error = data as { error?: { message?: string } };
      throw new Error(error.error?.message || `Ad Library API error: ${response.status}`);
    }

    return data as AdLibraryResponse;
  }

  /**
   * Search ads by a specific Facebook Page ID
   */
  async searchByPage(
    pageId: string,
    options: {
      ad_reached_countries?: string[];
      ad_active_status?: "ALL" | "ACTIVE" | "INACTIVE";
      limit?: number;
    } = {}
  ): Promise<AdLibraryAd[]> {
    const result = await this.searchAds({
      search_page_ids: [pageId],
      ad_reached_countries: options.ad_reached_countries || ["US"],
      ad_active_status: options.ad_active_status || "ACTIVE",
      limit: options.limit || 25,
    });

    return result.data;
  }

  /**
   * Search ads by keyword/competitor name
   */
  async searchByKeyword(
    searchTerms: string,
    options: {
      ad_reached_countries?: string[];
      ad_active_status?: "ALL" | "ACTIVE" | "INACTIVE";
      limit?: number;
    } = {}
  ): Promise<AdLibraryAd[]> {
    const result = await this.searchAds({
      search_terms: searchTerms,
      ad_reached_countries: options.ad_reached_countries || ["US"],
      ad_active_status: options.ad_active_status || "ACTIVE",
      limit: options.limit || 25,
    });

    return result.data;
  }
}

/**
 * Create an Ad Library client instance (no user auth needed)
 */
export function createAdLibraryClient(): MetaAdLibraryClient {
  return new MetaAdLibraryClient();
}
