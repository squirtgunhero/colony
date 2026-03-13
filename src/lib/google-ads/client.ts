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
  budgetAmountMicros: string | null;
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
        campaign.start_date,
        campaign.end_date,
        campaign_budget.amount_micros
      FROM campaign
      WHERE campaign.status != '${enums.CampaignStatus.REMOVED}'
      ORDER BY campaign.name
    `);

    return results.map((row) => ({
      id: String(row.campaign?.id || ""),
      name: (row.campaign?.name as string) || "Unknown",
      status: statusToString(row.campaign?.status as number),
      budgetAmountMicros: row.campaign_budget?.amount_micros
        ? String(row.campaign_budget.amount_micros)
        : null,
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
