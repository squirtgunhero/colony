"use client";

import { useState, useEffect, useCallback } from "react";
import * as api from "./api";
import type {
  DashboardResponse,
  CampaignsResponse,
  CreativesResponse,
  SegmentsResponse,
  KeywordsResponse,
  PublishersResponse,
  AnalyticsSummaryResponse,
  BillingSummaryResponse,
  SettingsResponse,
  ChatBotsResponse,
  DateRange,
} from "./types";

// ============================================
// Meta Ads Types
// ============================================

interface MetaAdAccount {
  id: string;
  adAccountId: string;
  adAccountName: string | null;
  currency: string;
  timezone: string;
  status: string;
  lastSyncedAt: string | null;
  createdAt: string;
  _count: { campaigns: number };
}

interface MetaCampaign {
  id: string;
  metaCampaignId: string;
  name: string;
  objective: string | null;
  status: string;
  effectiveStatus: string | null;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  startTime: string | null;
  stopTime: string | null;
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  conversions: number;
  ctr: string;
  cpc: string;
  cpm: string;
  adSetCount: number;
  accountName: string | null;
  currency: string;
  updatedAt: string;
}

interface MetaInsights {
  totals: {
    impressions: number;
    clicks: number;
    spend: string;
    reach: number;
    conversions: number;
  };
  averages: {
    ctr: string;
    cpc: string;
    cpm: string;
    costPerConversion: string;
  };
  chartData: Array<{
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
    reach: number;
    conversions: number;
  }>;
  dateRange: {
    start: string;
    end: string;
  };
}

// ============================================
// Generic Hook State
// ============================================

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================
// Dashboard Hook
// ============================================

export function useDashboard(dateRange?: DateRange): UseApiState<DashboardResponse> {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getDashboard(dateRange);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch dashboard"));
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// Campaigns Hook
// ============================================

export function useCampaigns(): UseApiState<CampaignsResponse> {
  const [data, setData] = useState<CampaignsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCampaigns();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch campaigns"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// Creatives Hook
// ============================================

export function useCreatives(): UseApiState<CreativesResponse> {
  const [data, setData] = useState<CreativesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCreatives();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch creatives"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// Segments Hook (Targeting)
// ============================================

export function useSegments(): UseApiState<SegmentsResponse> {
  const [data, setData] = useState<SegmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getSegments();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch segments"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// Keywords Hook
// ============================================

interface UseKeywordsParams {
  query?: string;
  category?: string;
}

export function useKeywords(params?: UseKeywordsParams): UseApiState<KeywordsResponse> {
  const [data, setData] = useState<KeywordsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getKeywords(params);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch keywords"));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// Publishers Hook
// ============================================

export function usePublishers(): UseApiState<PublishersResponse> {
  const [data, setData] = useState<PublishersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getPublishers();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch publishers"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// Analytics Hook
// ============================================

export function useAnalytics(dateRange?: DateRange): UseApiState<AnalyticsSummaryResponse> {
  const [data, setData] = useState<AnalyticsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getAnalyticsSummary(dateRange);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch analytics"));
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// Billing Hook
// ============================================

export function useBilling(): UseApiState<BillingSummaryResponse> {
  const [data, setData] = useState<BillingSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getBillingSummary();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch billing"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// Settings Hook
// ============================================

export function useSettings(): UseApiState<SettingsResponse> {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getSettings();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch settings"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// Chat Studio Hook
// ============================================

export function useChatBots(): UseApiState<ChatBotsResponse> {
  const [data, setData] = useState<ChatBotsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getChatBots();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch chat bots"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================
// META ADS HOOKS
// ============================================

/**
 * Hook to fetch connected Meta ad accounts
 */
export function useMetaAccounts(): UseApiState<{ accounts: MetaAdAccount[] }> {
  const [data, setData] = useState<{ accounts: MetaAdAccount[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/meta/accounts");
      if (!response.ok) throw new Error("Failed to fetch Meta accounts");
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch Meta accounts"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch Meta campaigns
 */
export function useMetaCampaigns(accountId?: string): UseApiState<{ campaigns: MetaCampaign[] }> {
  const [data, setData] = useState<{ campaigns: MetaCampaign[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (accountId) params.set("accountId", accountId);
      const response = await fetch(`/api/meta/campaigns?${params}`);
      if (!response.ok) throw new Error("Failed to fetch Meta campaigns");
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch Meta campaigns"));
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch Meta insights/analytics
 */
export function useMetaInsights(
  options?: { accountId?: string; campaignId?: string; range?: string }
): UseApiState<MetaInsights> {
  const [data, setData] = useState<MetaInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (options?.accountId) params.set("accountId", options.accountId);
      if (options?.campaignId) params.set("campaignId", options.campaignId);
      if (options?.range) params.set("range", options.range);
      const response = await fetch(`/api/meta/insights?${params}`);
      if (!response.ok) throw new Error("Failed to fetch Meta insights");
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch Meta insights"));
    } finally {
      setLoading(false);
    }
  }, [options?.accountId, options?.campaignId, options?.range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to sync Meta data
 */
export function useMetaSync() {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sync = useCallback(async (accountId?: string) => {
    try {
      setSyncing(true);
      setError(null);
      const response = await fetch("/api/meta/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (!response.ok) throw new Error("Failed to sync Meta data");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to sync Meta data"));
      throw err;
    } finally {
      setSyncing(false);
    }
  }, []);

  return { sync, syncing, error };
}

/**
 * Hook to disconnect a Meta account
 */
export function useMetaDisconnect() {
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const disconnect = useCallback(async (accountId: string) => {
    try {
      setDisconnecting(true);
      setError(null);
      const response = await fetch("/api/meta/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (!response.ok) throw new Error("Failed to disconnect account");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to disconnect account"));
      throw err;
    } finally {
      setDisconnecting(false);
    }
  }, []);

  return { disconnect, disconnecting, error };
}
