// ============================================
// HONEYCOMB API CLIENT
// Typed client-side API functions
// ============================================

import type {
  DashboardResponse,
  CampaignsResponse,
  Campaign,
  CreateCampaignInput,
  CampaignStatus,
  CreativesResponse,
  Creative,
  CreateCreativeInput,
  CreativeStatus,
  SegmentsResponse,
  Segment,
  CreateSegmentInput,
  KeywordsResponse,
  PublishersResponse,
  Publisher,
  CreatePublisherInput,
  AnalyticsSummaryResponse,
  BillingSummaryResponse,
  SettingsResponse,
  ChatBotsResponse,
  ChatBot,
  CreateChatBotInput,
  DateRange,
} from "./types";

// ============================================
// HTTP Client
// ============================================

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function honeycombFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Build URL with query params
  let url = `/api/honeycomb${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================
// Dashboard API
// ============================================

export async function getDashboard(dateRange?: DateRange): Promise<DashboardResponse> {
  return honeycombFetch<DashboardResponse>("/dashboard", {
    params: dateRange ? { from: dateRange.from, to: dateRange.to } : undefined,
  });
}

// ============================================
// Campaigns API
// ============================================

export async function getCampaigns(): Promise<CampaignsResponse> {
  return honeycombFetch<CampaignsResponse>("/campaigns");
}

export async function getCampaign(id: string): Promise<Campaign> {
  return honeycombFetch<Campaign>(`/campaigns/${id}`);
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  return honeycombFetch<Campaign>("/campaigns", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCampaignStatus(id: string, status: CampaignStatus): Promise<Campaign> {
  return honeycombFetch<Campaign>(`/campaigns/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

// ============================================
// Creatives API
// ============================================

export async function getCreatives(): Promise<CreativesResponse> {
  return honeycombFetch<CreativesResponse>("/creatives");
}

export async function createCreative(input: CreateCreativeInput): Promise<Creative> {
  return honeycombFetch<Creative>("/creatives", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCreativeStatus(id: string, status: CreativeStatus): Promise<Creative> {
  return honeycombFetch<Creative>(`/creatives/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

// ============================================
// Segments API (Targeting)
// ============================================

export async function getSegments(): Promise<SegmentsResponse> {
  return honeycombFetch<SegmentsResponse>("/segments");
}

export async function createSegment(input: CreateSegmentInput): Promise<Segment> {
  return honeycombFetch<Segment>("/segments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteSegment(id: string): Promise<{ success: boolean }> {
  return honeycombFetch<{ success: boolean }>(`/segments/${id}`, {
    method: "DELETE",
  });
}

// ============================================
// Keywords API
// ============================================

export interface KeywordsParams {
  query?: string;
  category?: string;
}

export async function getKeywords(params?: KeywordsParams): Promise<KeywordsResponse> {
  return honeycombFetch<KeywordsResponse>("/keywords", {
    params: params as Record<string, string | undefined>,
  });
}

// ============================================
// Publishers API
// ============================================

export async function getPublishers(): Promise<PublishersResponse> {
  return honeycombFetch<PublishersResponse>("/publishers");
}

export async function createPublisher(input: CreatePublisherInput): Promise<Publisher> {
  return honeycombFetch<Publisher>("/publishers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deletePublisher(id: string): Promise<{ success: boolean }> {
  return honeycombFetch<{ success: boolean }>(`/publishers/${id}`, {
    method: "DELETE",
  });
}

// ============================================
// Analytics API
// ============================================

export async function getAnalyticsSummary(dateRange?: DateRange): Promise<AnalyticsSummaryResponse> {
  return honeycombFetch<AnalyticsSummaryResponse>("/analytics/summary", {
    params: dateRange ? { from: dateRange.from, to: dateRange.to } : undefined,
  });
}

// ============================================
// Billing API
// ============================================

export async function getBillingSummary(): Promise<BillingSummaryResponse> {
  return honeycombFetch<BillingSummaryResponse>("/billing/summary");
}

// ============================================
// Settings API
// ============================================

export async function getSettings(): Promise<SettingsResponse> {
  return honeycombFetch<SettingsResponse>("/settings");
}

export async function updateSettings(
  updates: Partial<import("./types").HoneycombSettings>
): Promise<SettingsResponse> {
  return honeycombFetch<SettingsResponse>("/settings", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

// ============================================
// Chat Studio API
// ============================================

export async function getChatBots(): Promise<ChatBotsResponse> {
  return honeycombFetch<ChatBotsResponse>("/chat-studio");
}

export async function createChatBot(input: CreateChatBotInput): Promise<ChatBot> {
  return honeycombFetch<ChatBot>("/chat-studio", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteChatBot(id: string): Promise<{ success: boolean }> {
  return honeycombFetch<{ success: boolean }>(`/chat-studio/${id}`, {
    method: "DELETE",
  });
}

