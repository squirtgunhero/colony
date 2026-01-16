// ============================================
// META ADS API TYPES
// Types for Facebook/Instagram Marketing API
// ============================================

// ============================================
// OAuth Types
// ============================================

export interface MetaOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MetaLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // Usually ~60 days
}

export interface MetaUser {
  id: string;
  name: string;
  email?: string;
}

// ============================================
// Ad Account Types
// ============================================

export interface MetaAdAccountResponse {
  id: string; // Format: act_XXXXX
  account_id: string;
  name: string;
  account_status: number; // 1 = ACTIVE, 2 = DISABLED, etc.
  currency: string;
  timezone_name: string;
  amount_spent: string; // In cents
  balance: string;
  business?: {
    id: string;
    name: string;
  };
}

export interface MetaAdAccountsResponse {
  data: MetaAdAccountResponse[];
  paging?: MetaPaging;
}

// ============================================
// Campaign Types
// ============================================

export type MetaCampaignObjective =
  | "OUTCOME_AWARENESS"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_LEADS"
  | "OUTCOME_SALES"
  | "OUTCOME_TRAFFIC"
  | "OUTCOME_APP_PROMOTION";

export type MetaCampaignStatus =
  | "ACTIVE"
  | "PAUSED"
  | "DELETED"
  | "ARCHIVED";

export interface MetaCampaignResponse {
  id: string;
  name: string;
  objective: MetaCampaignObjective;
  status: MetaCampaignStatus;
  effective_status: string;
  daily_budget?: string; // In cents
  lifetime_budget?: string; // In cents
  start_time?: string;
  stop_time?: string;
  created_time: string;
  updated_time: string;
}

export interface MetaCampaignsResponse {
  data: MetaCampaignResponse[];
  paging?: MetaPaging;
}

// ============================================
// Ad Set Types
// ============================================

export interface MetaAdSetResponse {
  id: string;
  name: string;
  campaign_id: string;
  status: string;
  effective_status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  targeting?: MetaTargeting;
  start_time?: string;
  end_time?: string;
  created_time: string;
  updated_time: string;
}

export interface MetaAdSetsResponse {
  data: MetaAdSetResponse[];
  paging?: MetaPaging;
}

export interface MetaTargeting {
  age_min?: number;
  age_max?: number;
  genders?: number[];
  geo_locations?: {
    countries?: string[];
    regions?: Array<{ key: string; name: string }>;
    cities?: Array<{ key: string; name: string; radius?: number }>;
    zips?: Array<{ key: string }>;
  };
  interests?: Array<{ id: string; name: string }>;
  behaviors?: Array<{ id: string; name: string }>;
  custom_audiences?: Array<{ id: string; name: string }>;
  excluded_custom_audiences?: Array<{ id: string; name: string }>;
}

// ============================================
// Ad Types
// ============================================

export interface MetaAdResponse {
  id: string;
  name: string;
  adset_id: string;
  status: string;
  effective_status: string;
  creative?: {
    id: string;
  };
  preview_shareable_link?: string;
  created_time: string;
  updated_time: string;
}

export interface MetaAdsResponse {
  data: MetaAdResponse[];
  paging?: MetaPaging;
}

// ============================================
// Insights Types
// ============================================

export type MetaInsightsLevel = "account" | "campaign" | "adset" | "ad";

export type MetaInsightsDatePreset =
  | "today"
  | "yesterday"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "lifetime"
  | "last_3d"
  | "last_7d"
  | "last_14d"
  | "last_28d"
  | "last_30d"
  | "last_90d";

export interface MetaInsightsParams {
  level?: MetaInsightsLevel;
  date_preset?: MetaInsightsDatePreset;
  time_range?: {
    since: string; // YYYY-MM-DD
    until: string; // YYYY-MM-DD
  };
  time_increment?: number | "monthly" | "all_days";
  fields?: string[];
  filtering?: Array<{
    field: string;
    operator: "EQUAL" | "NOT_EQUAL" | "GREATER_THAN" | "LESS_THAN" | "IN" | "NOT_IN";
    value: string | number | string[];
  }>;
}

export interface MetaInsightsResponse {
  id?: string;
  date_start: string;
  date_stop: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  reach?: string;
  frequency?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: MetaAction[];
  cost_per_action_type?: MetaCostPerAction[];
  conversions?: MetaAction[];
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
}

export interface MetaInsightsListResponse {
  data: MetaInsightsResponse[];
  paging?: MetaPaging;
}

export interface MetaAction {
  action_type: string;
  value: string;
}

export interface MetaCostPerAction {
  action_type: string;
  value: string;
}

// ============================================
// Common Types
// ============================================

export interface MetaPaging {
  cursors?: {
    before: string;
    after: string;
  };
  next?: string;
  previous?: string;
}

export interface MetaError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  fbtrace_id?: string;
}

export interface MetaErrorResponse {
  error: MetaError;
}

// ============================================
// Sync Types
// ============================================

export interface SyncResult {
  success: boolean;
  syncedAt: Date;
  counts: {
    campaigns: number;
    adSets: number;
    ads: number;
    insights: number;
  };
  errors?: string[];
}

// ============================================
// Mapped Types for Database
// ============================================

export interface MappedCampaign {
  metaCampaignId: string;
  name: string;
  objective: string | null;
  status: string;
  effectiveStatus: string | null;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  startTime: Date | null;
  stopTime: Date | null;
}

export interface MappedAdSet {
  metaAdSetId: string;
  name: string;
  status: string;
  effectiveStatus: string | null;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  targetingJson?: object;
}

export interface MappedAd {
  metaAdId: string;
  name: string;
  status: string;
  effectiveStatus: string | null;
  creativeId: string | null;
  previewUrl: string | null;
}

export interface MappedInsight {
  date: Date;
  level: string;
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  frequency: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  costPerResult: number;
  actionsJson?: object;
}
