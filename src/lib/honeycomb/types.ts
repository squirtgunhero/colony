// ============================================
// HONEYCOMB API TYPES
// Typed interfaces for all Honeycomb endpoints
// ============================================

// ============================================
// Common Types
// ============================================

export interface DateRange {
  from: string; // ISO date string
  to: string;   // ISO date string
}

export interface PaginatedResponse<T> {
  data: T[];
  cursor?: string;
  hasMore: boolean;
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardKpis {
  activeCampaigns: number | null;
  totalImpressions: number | null;
  clickThroughRate: number | null;
  totalSpend: number | null;
}

export interface DashboardActivity {
  id: string;
  type: "campaign_created" | "creative_uploaded" | "campaign_paused" | "campaign_completed";
  title: string;
  description: string;
  timestamp: string;
}

export interface DashboardResponse {
  kpis: DashboardKpis;
  recentActivity: DashboardActivity[];
}

// ============================================
// Campaign Types
// ============================================

export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignsResponse {
  campaigns: Campaign[];
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  objective?: "awareness" | "traffic" | "engagement" | "leads" | "sales";
  budget?: number;
  dailyBudget?: number;
  startDate?: string;
  endDate?: string;
}

// ============================================
// Creative Types
// ============================================

export type CreativeType = "image" | "video" | "carousel" | "html";
export type CreativeSize = "1080x1080" | "1200x628" | "1080x1920" | "300x250" | "728x90";

export type CreativeStatus = "draft" | "approved" | "rejected" | "archived";

export interface Creative {
  id: string;
  name: string;
  type: CreativeType;
  format?: string;
  thumbnailUrl?: string;
  fileUrl?: string;
  status: CreativeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreativesResponse {
  creatives: Creative[];
}

export interface CreateCreativeInput {
  name: string;
  description?: string;
  type?: CreativeType;
  format?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  headline?: string;
  bodyText?: string;
  ctaText?: string;
  ctaUrl?: string;
}

// ============================================
// Segment/Targeting Types
// ============================================

export type SegmentType = "saved" | "custom" | "lookalike";

export interface Segment {
  id: string;
  name: string;
  type: SegmentType;
  size?: number; // Audience size estimate
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentsResponse {
  segments: Segment[];
}

export interface CreateSegmentInput {
  name: string;
  description?: string;
  type?: SegmentType;
  criteria?: Record<string, unknown>;
}

// ============================================
// Keyword Types
// ============================================

export interface Keyword {
  id: string;
  keyword: string;
  searchVolume: number | null;
  competition: "low" | "medium" | "high" | null;
  cpcEstimate: number | null;
  category?: string;
  saved: boolean;
  createdAt: string;
}

export interface KeywordsResponse {
  keywords: Keyword[];
  suggestions: Keyword[];
}

// ============================================
// Publisher Types
// ============================================

export type PublisherStatus = "connected" | "pending" | "disconnected";

export interface Publisher {
  id: string;
  name: string;
  type: "ad_network" | "direct" | "programmatic";
  status: PublisherStatus;
  logoUrl?: string;
  placements: number;
  impressions: number;
  revenue: number;
  createdAt: string;
}

export interface Placement {
  id: string;
  publisherId: string;
  publisherName: string;
  name: string;
  format: string;
  impressions: number;
  clicks: number;
  revenue: number;
}

export interface PublishersResponse {
  publishers: Publisher[];
  placements: Placement[];
}

// ============================================
// Analytics Types
// ============================================

export interface AnalyticsSummary {
  totalImpressions: number | null;
  totalClicks: number | null;
  conversions: number | null;
  costPerConversion: number | null;
  performanceOverTime: PerformanceDataPoint[];
  channelBreakdown: ChannelBreakdown[];
  topCampaigns: TopPerformer[];
  topCreatives: TopPerformer[];
}

export interface PerformanceDataPoint {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
}

export interface ChannelBreakdown {
  channel: string;
  impressions: number;
  clicks: number;
  spend: number;
  percentage: number;
}

export interface TopPerformer {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface AnalyticsSummaryResponse {
  summary: AnalyticsSummary;
}

// ============================================
// Billing Types
// ============================================

export type PlanType = "free" | "starter" | "professional" | "enterprise";

export interface BillingSummary {
  plan: PlanType;
  monthlySpend: number | null;
  campaignsUsed: number;
  campaignsLimit: number | null;
  creditsRemaining: number | null;
  nextBillingDate: string | null;
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
}

export interface PaymentMethod {
  id: string;
  type: "card" | "bank";
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  downloadUrl?: string;
}

export interface BillingSummaryResponse {
  billing: BillingSummary;
}

// ============================================
// Settings Types
// ============================================

export interface HoneycombSettings {
  profile: ProfileSettings;
  notifications: NotificationSettings;
  integrations: IntegrationSettings[];
  timezone: string;
  currency: string;
}

export interface ProfileSettings {
  displayName: string;
  email: string;
  company: string;
  avatarUrl?: string;
}

export interface NotificationSettings {
  emailAlerts: boolean;
  campaignUpdates: boolean;
  weeklyReports: boolean;
  budgetAlerts: boolean;
}

export interface IntegrationSettings {
  id: string;
  name: string;
  type: string;
  connected: boolean;
  lastSyncedAt?: string;
}

export interface SettingsResponse {
  settings: HoneycombSettings;
}

// ============================================
// Chat Studio Types
// ============================================

export interface ChatBot {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "paused";
  conversationCount: number;
  welcomeMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatBotsResponse {
  chatBots: ChatBot[];
}

export interface CreateChatBotInput {
  name: string;
  description?: string;
  welcomeMessage?: string;
  systemPrompt?: string;
}

export interface CreatePublisherInput {
  name: string;
  type?: "ad_network" | "direct" | "programmatic";
  logoUrl?: string;
}

