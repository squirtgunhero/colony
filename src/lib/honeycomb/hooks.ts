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

