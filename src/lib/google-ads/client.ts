// ============================================
// GOOGLE ADS API CLIENT
// Google Ads API integration via google-ads-api package
// ============================================
//
// PREREQUISITES:
// 1. Google Ads developer token — apply at https://ads.google.com/aw/apicenter
// 2. Google Cloud OAuth 2.0 credentials (client_id, client_secret)
//    Create at https://console.cloud.google.com/apis/credentials
// 3. A Google Ads Manager Account (MCC) to act on behalf of users
// 4. Environment variables:
//    - GOOGLE_ADS_DEVELOPER_TOKEN: Your developer token
//    - GOOGLE_ADS_CLIENT_ID: OAuth 2.0 client ID
//    - GOOGLE_ADS_CLIENT_SECRET: OAuth 2.0 client secret
//    - GOOGLE_ADS_LOGIN_CUSTOMER_ID: Your MCC ID (no dashes, e.g., "1234567890")
// ============================================

import { GoogleAdsApi, enums } from "google-ads-api";

// ============================================
// Configuration
// ============================================

function getGoogleAdsConfig() {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

  if (!developerToken || !clientId || !clientSecret || !loginCustomerId) {
    throw new Error(
      "GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, and GOOGLE_ADS_LOGIN_CUSTOMER_ID must be set"
    );
  }

  return { developerToken, clientId, clientSecret, loginCustomerId };
}

// ============================================
// Types
// ============================================

export interface GoogleCampaignInfo {
  id: string; // campaign resource name ID
  name: string;
  status: string; // ENABLED, PAUSED, REMOVED
  advertisingChannelType: string;
  budgetAmountMicros: string | null;
  budgetResourceName: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface GoogleCampaignPerformance {
  campaignId: string;
  campaignName: string;
  status: string;
  date: string;
  impressions: number;
  clicks: number;
  costMicros: number;
  conversions: number;
  allConversions: number;
  averageCpc: number;
  ctr: number;
}

export interface GoogleKeywordPerformance {
  keyword: string;
  matchType: string;
  impressions: number;
  clicks: number;
  costMicros: number;
  conversions: number;
  ctr: number;
}

export interface GoogleAdGroupInfo {
  id: string;
  campaignId: string;
  name: string;
  status: string;
  type: string;
  cpcBidMicros: string | null;
}

export interface GoogleAdInfo {
  id: string;
  adGroupId: string;
  name: string;
  type: string;
  status: string;
  headlines: string[];
  descriptions: string[];
  finalUrls: string[];
}

export interface GoogleAdGroupPerformance {
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  date: string;
  impressions: number;
  clicks: number;
  costMicros: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
}

export interface CreateCampaignParams {
  name: string;
  advertisingChannelType?: "SEARCH" | "DISPLAY" | "SHOPPING" | "VIDEO";
  budgetAmountMicros: number; // daily budget in micros
  status?: "ENABLED" | "PAUSED";
  startDate?: string; // YYYY-MM-DD
  targetLocations?: string[]; // geo target constant resource names
}

export interface CreateCampaignResult {
  campaignId: string;
  budgetResourceName: string;
}

export interface CreateAdGroupParams {
  campaignId: string;
  name: string;
  cpcBidMicros?: number;
  status?: "ENABLED" | "PAUSED";
}

export interface CreateResponsiveSearchAdParams {
  adGroupId: string;
  headlines: string[]; // 3-15 headlines (max 30 chars each)
  descriptions: string[]; // 2-4 descriptions (max 90 chars each)
  finalUrls: string[];
  status?: "ENABLED" | "PAUSED";
}

export interface AddKeywordsParams {
  adGroupId: string;
  keywords: Array<{
    text: string;
    matchType: "EXACT" | "PHRASE" | "BROAD";
  }>;
}

// ============================================
// Date range mapping
// ============================================

const DATE_RANGE_MAP: Record<string, string> = {
  "7d": "LAST_7_DAYS",
  "14d": "LAST_14_DAYS",
  "30d": "LAST_30_DAYS",
};

// ============================================
// Client
// ============================================

export class GoogleAdsClient {
  private api: GoogleAdsApi;
  private refreshToken: string;
  private loginCustomerId: string;

  constructor(refreshToken: string) {
    const config = getGoogleAdsConfig();
    this.api = new GoogleAdsApi({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      developer_token: config.developerToken,
    });
    this.refreshToken = refreshToken;
    this.loginCustomerId = config.loginCustomerId;
  }

  private getCustomer(customerId: string) {
    return this.api.Customer({
      customer_id: customerId,
      login_customer_id: this.loginCustomerId,
      refresh_token: this.refreshToken,
    });
  }

  // ============================================
  // Campaign Methods
  // ============================================

  /**
   * List all campaigns with name, status, budget
   */
  async getCampaigns(customerId: string): Promise<GoogleCampaignInfo[]> {
    const customer = this.getCustomer(customerId);

    const results = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.start_date,
        campaign.end_date,
        campaign_budget.amount_micros,
        campaign.campaign_budget
      FROM campaign
      WHERE campaign.status != '${enums.CampaignStatus.REMOVED}'
      ORDER BY campaign.name
    `);

    return results.map((row) => ({
      id: String(row.campaign?.id || ""),
      name: (row.campaign?.name as string) || "Unknown",
      status: statusToString(row.campaign?.status as number),
      advertisingChannelType: channelTypeToString(row.campaign?.advertising_channel_type as number),
      budgetAmountMicros: row.campaign_budget?.amount_micros
        ? String(row.campaign_budget.amount_micros)
        : null,
      budgetResourceName: (row.campaign?.campaign_budget as string) || null,
      startDate: (row.campaign?.start_date_time as string) || null,
      endDate: (row.campaign?.end_date_time as string) || null,
    }));
  }

  /**
   * Get performance metrics for all campaigns
   */
  async getCampaignPerformance(
    customerId: string,
    dateRange: string = "7d"
  ): Promise<GoogleCampaignPerformance[]> {
    const customer = this.getCustomer(customerId);
    const range = DATE_RANGE_MAP[dateRange] || "LAST_7_DAYS";

    const results = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.all_conversions,
        metrics.average_cpc,
        metrics.ctr
      FROM campaign
      WHERE campaign.status != '${enums.CampaignStatus.REMOVED}'
        AND segments.date DURING ${range}
      ORDER BY segments.date DESC
    `);

    return results.map((row) => ({
      campaignId: String(row.campaign?.id || ""),
      campaignName: (row.campaign?.name as string) || "Unknown",
      status: statusToString(row.campaign?.status as number),
      date: (row.segments?.date as string) || "",
      impressions: Number(row.metrics?.impressions || 0),
      clicks: Number(row.metrics?.clicks || 0),
      costMicros: Number(row.metrics?.cost_micros || 0),
      conversions: Number(row.metrics?.conversions || 0),
      allConversions: Number(row.metrics?.all_conversions || 0),
      averageCpc: Number(row.metrics?.average_cpc || 0),
      ctr: Number(row.metrics?.ctr || 0),
    }));
  }

  /**
   * Get per-keyword performance metrics
   */
  async getKeywordPerformance(
    customerId: string,
    dateRange: string = "7d"
  ): Promise<GoogleKeywordPerformance[]> {
    const customer = this.getCustomer(customerId);
    const range = DATE_RANGE_MAP[dateRange] || "LAST_7_DAYS";

    const results = await customer.query(`
      SELECT
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr
      FROM keyword_view
      WHERE segments.date DURING ${range}
        AND ad_group_criterion.status != '${enums.AdGroupCriterionStatus.REMOVED}'
      ORDER BY metrics.impressions DESC
      LIMIT 100
    `);

    return results.map((row) => ({
      keyword: (row.ad_group_criterion?.keyword?.text as string) || "",
      matchType: matchTypeToString(
        row.ad_group_criterion?.keyword?.match_type as number
      ),
      impressions: Number(row.metrics?.impressions || 0),
      clicks: Number(row.metrics?.clicks || 0),
      costMicros: Number(row.metrics?.cost_micros || 0),
      conversions: Number(row.metrics?.conversions || 0),
      ctr: Number(row.metrics?.ctr || 0),
    }));
  }

  // ============================================
  // Campaign Creation
  // ============================================

  /**
   * Create a new campaign with budget
   */
  async createCampaign(
    customerId: string,
    params: CreateCampaignParams
  ): Promise<CreateCampaignResult> {
    const customer = this.getCustomer(customerId);

    // Step 1: Create the campaign budget
    const budgetResult = await customer.campaignBudgets.create([{
      name: `${params.name} Budget`,
      amount_micros: params.budgetAmountMicros,
      delivery_method: enums.BudgetDeliveryMethod.STANDARD,
    }]);

    const budgetResourceName = budgetResult.results[0]?.resource_name;
    if (!budgetResourceName) {
      throw new Error("Failed to create campaign budget");
    }

    // Step 2: Create the campaign
    const channelType = params.advertisingChannelType || "SEARCH";
    const channelTypeEnum =
      channelType === "DISPLAY" ? enums.AdvertisingChannelType.DISPLAY :
      channelType === "SHOPPING" ? enums.AdvertisingChannelType.SHOPPING :
      channelType === "VIDEO" ? enums.AdvertisingChannelType.VIDEO :
      enums.AdvertisingChannelType.SEARCH;

    const campaignData: Record<string, unknown> = {
      name: params.name,
      advertising_channel_type: channelTypeEnum,
      status: params.status === "ENABLED"
        ? enums.CampaignStatus.ENABLED
        : enums.CampaignStatus.PAUSED,
      campaign_budget: budgetResourceName,
      // Default to manual CPC for simplicity
      manual_cpc: { enhanced_cpc_enabled: false },
      // Network settings for search campaigns
      ...(channelType === "SEARCH" && {
        network_settings: {
          target_google_search: true,
          target_search_network: true,
          target_content_network: false,
        },
      }),
    };

    if (params.startDate) {
      campaignData.start_date = params.startDate;
    }

    const campaignResult = await customer.campaigns.create([campaignData]);

    const campaignResourceName = campaignResult.results[0]?.resource_name;
    if (!campaignResourceName) {
      throw new Error("Failed to create campaign");
    }

    // Extract campaign ID from resource name (customers/123/campaigns/456 → 456)
    const campaignId = campaignResourceName.split("/").pop() || "";

    // Step 3: Set geo targeting if locations provided
    if (params.targetLocations && params.targetLocations.length > 0) {
      const locationCriteria = params.targetLocations.map((location) => ({
        campaign: campaignResourceName,
        location: { geo_target_constant: location },
      }));
      await customer.campaignCriteria.create(locationCriteria);
    }

    return { campaignId, budgetResourceName };
  }

  // ============================================
  // Ad Group Methods
  // ============================================

  /**
   * List all ad groups for a campaign
   */
  async getAdGroups(
    customerId: string,
    campaignId?: string
  ): Promise<GoogleAdGroupInfo[]> {
    const customer = this.getCustomer(customerId);

    let whereClause = `ad_group.status != '${enums.AdGroupStatus.REMOVED}'`;
    if (campaignId) {
      whereClause += ` AND campaign.id = ${campaignId}`;
    }

    const results = await customer.query(`
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.type,
        ad_group.cpc_bid_micros,
        campaign.id
      FROM ad_group
      WHERE ${whereClause}
      ORDER BY ad_group.name
    `);

    return results.map((row) => ({
      id: String(row.ad_group?.id || ""),
      campaignId: String(row.campaign?.id || ""),
      name: (row.ad_group?.name as string) || "Unknown",
      status: adGroupStatusToString(row.ad_group?.status as number),
      type: adGroupTypeToString(row.ad_group?.type as number),
      cpcBidMicros: row.ad_group?.cpc_bid_micros
        ? String(row.ad_group.cpc_bid_micros)
        : null,
    }));
  }

  /**
   * Create a new ad group within a campaign
   */
  async createAdGroup(
    customerId: string,
    params: CreateAdGroupParams
  ): Promise<string> {
    const customer = this.getCustomer(customerId);

    const adGroupData: Record<string, unknown> = {
      name: params.name,
      campaign: `customers/${customerId}/campaigns/${params.campaignId}`,
      type: enums.AdGroupType.SEARCH_STANDARD,
      status: params.status === "PAUSED"
        ? enums.AdGroupStatus.PAUSED
        : enums.AdGroupStatus.ENABLED,
    };

    if (params.cpcBidMicros) {
      adGroupData.cpc_bid_micros = params.cpcBidMicros;
    }

    const result = await customer.adGroups.create([adGroupData]);
    const resourceName = result.results[0]?.resource_name;
    if (!resourceName) {
      throw new Error("Failed to create ad group");
    }

    return resourceName.split("/").pop() || "";
  }

  /**
   * Get performance metrics for ad groups
   */
  async getAdGroupPerformance(
    customerId: string,
    dateRange: string = "7d",
    campaignId?: string
  ): Promise<GoogleAdGroupPerformance[]> {
    const customer = this.getCustomer(customerId);
    const range = DATE_RANGE_MAP[dateRange] || "LAST_7_DAYS";

    let whereClause = `ad_group.status != '${enums.AdGroupStatus.REMOVED}'
        AND segments.date DURING ${range}`;
    if (campaignId) {
      whereClause += ` AND campaign.id = ${campaignId}`;
    }

    const results = await customer.query(`
      SELECT
        ad_group.id,
        ad_group.name,
        campaign.id,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc
      FROM ad_group
      WHERE ${whereClause}
      ORDER BY segments.date DESC
    `);

    return results.map((row) => ({
      adGroupId: String(row.ad_group?.id || ""),
      adGroupName: (row.ad_group?.name as string) || "Unknown",
      campaignId: String(row.campaign?.id || ""),
      date: (row.segments?.date as string) || "",
      impressions: Number(row.metrics?.impressions || 0),
      clicks: Number(row.metrics?.clicks || 0),
      costMicros: Number(row.metrics?.cost_micros || 0),
      conversions: Number(row.metrics?.conversions || 0),
      ctr: Number(row.metrics?.ctr || 0),
      averageCpc: Number(row.metrics?.average_cpc || 0),
    }));
  }

  // ============================================
  // Ad Methods
  // ============================================

  /**
   * List all ads for an ad group or entire account
   */
  async getAds(
    customerId: string,
    adGroupId?: string
  ): Promise<GoogleAdInfo[]> {
    const customer = this.getCustomer(customerId);

    let whereClause = `ad_group_ad.status != '${enums.AdGroupAdStatus.REMOVED}'`;
    if (adGroupId) {
      whereClause += ` AND ad_group.id = ${adGroupId}`;
    }

    const results = await customer.query(`
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.name,
        ad_group_ad.ad.type,
        ad_group_ad.status,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.final_urls,
        ad_group.id
      FROM ad_group_ad
      WHERE ${whereClause}
      ORDER BY ad_group_ad.ad.id
    `);

    return results.map((row) => {
      const ad = row.ad_group_ad?.ad;
      const rsa = ad?.responsive_search_ad;

      return {
        id: String(ad?.id || ""),
        adGroupId: String(row.ad_group?.id || ""),
        name: (ad?.name as string) || "",
        type: adTypeToString(ad?.type as number),
        status: adGroupAdStatusToString(row.ad_group_ad?.status as number),
        headlines: ((rsa?.headlines as Array<{ text?: string }>) || []).map(
          (h) => (h.text as string) || ""
        ),
        descriptions: ((rsa?.descriptions as Array<{ text?: string }>) || []).map(
          (d) => (d.text as string) || ""
        ),
        finalUrls: ((ad?.final_urls as string[]) || []),
      };
    });
  }

  /**
   * Create a responsive search ad
   */
  async createResponsiveSearchAd(
    customerId: string,
    params: CreateResponsiveSearchAdParams
  ): Promise<string> {
    const customer = this.getCustomer(customerId);

    const adData = {
      ad_group: `customers/${customerId}/adGroups/${params.adGroupId}`,
      status: params.status === "PAUSED"
        ? enums.AdGroupAdStatus.PAUSED
        : enums.AdGroupAdStatus.ENABLED,
      ad: {
        responsive_search_ad: {
          headlines: params.headlines.map((text) => ({ text })),
          descriptions: params.descriptions.map((text) => ({ text })),
        },
        final_urls: params.finalUrls,
      },
    };

    const result = await customer.adGroupAds.create([adData]);
    const resourceName = result.results[0]?.resource_name;
    if (!resourceName) {
      throw new Error("Failed to create responsive search ad");
    }

    // Extract ad ID from resource name
    return resourceName.split("~").pop() || "";
  }

  // ============================================
  // Keyword Methods
  // ============================================

  /**
   * Add keywords to an ad group
   */
  async addKeywords(
    customerId: string,
    params: AddKeywordsParams
  ): Promise<{ added: number }> {
    const customer = this.getCustomer(customerId);

    const criteria = params.keywords.map((kw) => ({
      ad_group: `customers/${customerId}/adGroups/${params.adGroupId}`,
      keyword: {
        text: kw.text,
        match_type:
          kw.matchType === "EXACT" ? enums.KeywordMatchType.EXACT :
          kw.matchType === "PHRASE" ? enums.KeywordMatchType.PHRASE :
          enums.KeywordMatchType.BROAD,
      },
      status: enums.AdGroupCriterionStatus.ENABLED,
    }));

    await customer.adGroupCriteria.create(criteria);
    return { added: params.keywords.length };
  }

  // ============================================
  // Campaign Control Methods
  // ============================================

  /**
   * Pause a campaign
   */
  async pauseCampaign(
    customerId: string,
    campaignId: string
  ): Promise<void> {
    const customer = this.getCustomer(customerId);

    await customer.campaigns.update([{
      resource_name: `customers/${customerId}/campaigns/${campaignId}`,
      status: enums.CampaignStatus.PAUSED,
    }]);
  }

  /**
   * Resume (enable) a campaign
   */
  async resumeCampaign(
    customerId: string,
    campaignId: string
  ): Promise<void> {
    const customer = this.getCustomer(customerId);

    await customer.campaigns.update([{
      resource_name: `customers/${customerId}/campaigns/${campaignId}`,
      status: enums.CampaignStatus.ENABLED,
    }]);
  }

  /**
   * Add negative keywords to a campaign (campaign-level)
   */
  async addNegativeKeywords(
    customerId: string,
    campaignId: string,
    keywords: string[]
  ): Promise<{ added: number }> {
    const customer = this.getCustomer(customerId);

    const criteria = keywords.map((keyword) => ({
      campaign: `customers/${customerId}/campaigns/${campaignId}`,
      keyword: {
        text: keyword,
        match_type: enums.KeywordMatchType.BROAD,
      },
      negative: true,
    }));

    await customer.campaignCriteria.create(criteria);

    return { added: keywords.length };
  }

  /**
   * Update campaign budget
   */
  async updateBudget(
    customerId: string,
    campaignId: string,
    newBudgetMicros: number
  ): Promise<void> {
    const customer = this.getCustomer(customerId);

    // First get the campaign's budget resource name
    const [campaign] = await customer.query(`
      SELECT campaign.campaign_budget
      FROM campaign
      WHERE campaign.id = ${campaignId}
      LIMIT 1
    `);

    const budgetResourceName = campaign?.campaign?.campaign_budget as string;

    if (!budgetResourceName) {
      throw new Error(`No budget found for campaign ${campaignId}`);
    }

    await customer.campaignBudgets.update([{
      resource_name: budgetResourceName,
      amount_micros: newBudgetMicros,
    }]);
  }

  // ============================================
  // Account-Level Insights
  // ============================================

  /**
   * Get account-level daily performance metrics
   */
  async getAccountInsights(
    customerId: string,
    dateRange: string = "30d"
  ): Promise<Array<{
    date: string;
    impressions: number;
    clicks: number;
    costMicros: number;
    conversions: number;
    allConversions: number;
    ctr: number;
    averageCpcMicros: number;
  }>> {
    const customer = this.getCustomer(customerId);
    const range = DATE_RANGE_MAP[dateRange] || "LAST_30_DAYS";

    const results = await customer.query(`
      SELECT
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.all_conversions,
        metrics.ctr,
        metrics.average_cpc
      FROM customer
      WHERE segments.date DURING ${range}
      ORDER BY segments.date ASC
    `);

    return results.map((row) => ({
      date: (row.segments?.date as string) || "",
      impressions: Number(row.metrics?.impressions || 0),
      clicks: Number(row.metrics?.clicks || 0),
      costMicros: Number(row.metrics?.cost_micros || 0),
      conversions: Number(row.metrics?.conversions || 0),
      allConversions: Number(row.metrics?.all_conversions || 0),
      ctr: Number(row.metrics?.ctr || 0),
      averageCpcMicros: Number(row.metrics?.average_cpc || 0),
    }));
  }
}

// ============================================
// Helpers
// ============================================

function statusToString(status: number | undefined): string {
  switch (status) {
    case enums.CampaignStatus.ENABLED:
      return "ENABLED";
    case enums.CampaignStatus.PAUSED:
      return "PAUSED";
    case enums.CampaignStatus.REMOVED:
      return "REMOVED";
    default:
      return "UNKNOWN";
  }
}

function channelTypeToString(channelType: number | undefined): string {
  switch (channelType) {
    case enums.AdvertisingChannelType.SEARCH:
      return "SEARCH";
    case enums.AdvertisingChannelType.DISPLAY:
      return "DISPLAY";
    case enums.AdvertisingChannelType.SHOPPING:
      return "SHOPPING";
    case enums.AdvertisingChannelType.VIDEO:
      return "VIDEO";
    default:
      return "SEARCH";
  }
}

function adGroupStatusToString(status: number | undefined): string {
  switch (status) {
    case enums.AdGroupStatus.ENABLED:
      return "ENABLED";
    case enums.AdGroupStatus.PAUSED:
      return "PAUSED";
    case enums.AdGroupStatus.REMOVED:
      return "REMOVED";
    default:
      return "UNKNOWN";
  }
}

function adGroupTypeToString(type: number | undefined): string {
  switch (type) {
    case enums.AdGroupType.SEARCH_STANDARD:
      return "SEARCH_STANDARD";
    case enums.AdGroupType.DISPLAY_STANDARD:
      return "DISPLAY_STANDARD";
    case enums.AdGroupType.SHOPPING_PRODUCT_ADS:
      return "SHOPPING_PRODUCT_ADS";
    case enums.AdGroupType.VIDEO_TRUE_VIEW_IN_STREAM:
      return "VIDEO_TRUE_VIEW_IN_STREAM";
    default:
      return "UNKNOWN";
  }
}

function adGroupAdStatusToString(status: number | undefined): string {
  switch (status) {
    case enums.AdGroupAdStatus.ENABLED:
      return "ENABLED";
    case enums.AdGroupAdStatus.PAUSED:
      return "PAUSED";
    case enums.AdGroupAdStatus.REMOVED:
      return "REMOVED";
    default:
      return "UNKNOWN";
  }
}

function adTypeToString(type: number | undefined): string {
  switch (type) {
    case enums.AdType.RESPONSIVE_SEARCH_AD:
      return "RESPONSIVE_SEARCH_AD";
    case enums.AdType.EXPANDED_TEXT_AD:
      return "EXPANDED_TEXT_AD";
    case enums.AdType.RESPONSIVE_DISPLAY_AD:
      return "RESPONSIVE_DISPLAY_AD";
    default:
      return "UNKNOWN";
  }
}

function matchTypeToString(matchType: number | undefined): string {
  switch (matchType) {
    case enums.KeywordMatchType.EXACT:
      return "EXACT";
    case enums.KeywordMatchType.PHRASE:
      return "PHRASE";
    case enums.KeywordMatchType.BROAD:
      return "BROAD";
    default:
      return "UNKNOWN";
  }
}

/**
 * Create a Google Ads client instance
 */
export function createGoogleAdsClient(refreshToken: string): GoogleAdsClient {
  return new GoogleAdsClient(refreshToken);
}
