"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ReferralCard } from "./referral-card";
import { Button } from "@/components/ui/button";
import { Loader2, Share2 } from "lucide-react";
import type { ReferralListItem } from "@/lib/db/referrals";

export function ReferralFeed() {
  const searchParams = useSearchParams();
  const [referrals, setReferrals] = useState<ReferralListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReferrals = useCallback(async (cursor?: string) => {
    try {
      const params = new URLSearchParams(searchParams.toString());
      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await fetch(`/api/referrals?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch referrals");
      }

      const data = await response.json();
      return data;
    } catch (err) {
      throw err;
    }
  }, [searchParams]);

  // Initial load and filter changes
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchReferrals();
        if (!cancelled) {
          setReferrals(data.referrals);
          setNextCursor(data.nextCursor);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load referrals");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchReferrals]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const data = await fetchReferrals(nextCursor);
      setReferrals((prev) => [...prev, ...data.referrals]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more referrals");
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (referrals.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <Share2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No referrals yet</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Be the first to post a referral opportunity. Share leads and grow your network.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {referrals.map((referral) => (
          <ReferralCard key={referral.id} referral={referral} />
        ))}
      </div>

      {nextCursor && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

