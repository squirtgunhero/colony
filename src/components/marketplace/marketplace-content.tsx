"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MarketplaceHero, type MarketplaceStats } from "./marketplace-hero";
import { MarketplaceFilters } from "./marketplace-filters";
import {
  MarketplaceReferralCard,
  type MarketplaceReferral,
} from "./marketplace-referral-card";
import { SignUpPrompt } from "./sign-up-prompt";
import { withAlpha } from "@/lib/themes";
import { BRAND } from "./marketplace-theme";
import { Loader2 } from "lucide-react";

interface MarketplaceContentProps {
  isLoggedIn: boolean;
}

export function MarketplaceContent({ isLoggedIn }: MarketplaceContentProps) {
  const theme = BRAND;
  const router = useRouter();

  const [referrals, setReferrals] = useState<MarketplaceReferral[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [location, setLocation] = useState("");
  const [activeLocation, setActiveLocation] = useState("");

  const [signUpPromptOpen, setSignUpPromptOpen] = useState(false);
  const [signUpReferralTitle, setSignUpReferralTitle] = useState("");

  const fetchReferrals = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams();
      if (activeSearch) params.set("search", activeSearch);
      if (category !== "all") params.set("category", category);
      if (sort !== "newest") params.set("sort", sort);
      if (activeLocation) params.set("location", activeLocation);
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/marketplace?${params.toString()}`);
      if (!res.ok) return null;
      return res.json();
    },
    [activeSearch, category, sort, activeLocation]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchReferrals().then((data) => {
      if (cancelled || !data) return;
      setReferrals(data.referrals);
      setStats(data.stats);
      setNextCursor(data.nextCursor);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [fetchReferrals]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchReferrals(nextCursor);
    if (data) {
      setReferrals((prev) => [...prev, ...data.referrals]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  };

  const handleSearchSubmit = () => setActiveSearch(search);
  const handleLocationSubmit = () => setActiveLocation(location);

  const handleClaim = (referral: MarketplaceReferral) => {
    if (!isLoggedIn) {
      setSignUpReferralTitle(referral.title);
      setSignUpPromptOpen(true);
      return;
    }
    router.push(`/marketplace/${referral.id}?claim=true`);
  };

  return (
    <>
      <MarketplaceHero
        stats={stats}
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MarketplaceFilters
          category={category}
          sort={sort}
          location={location}
          onCategoryChange={setCategory}
          onSortChange={setSort}
          onLocationChange={setLocation}
          onLocationSubmit={handleLocationSubmit}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2
              className="h-8 w-8 animate-spin"
              style={{ color: theme.textMuted }}
            />
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg" style={{ color: theme.textMuted }}>
              No referrals found
            </p>
            <p
              className="text-sm mt-2"
              style={{ color: withAlpha(theme.text, 0.35) }}
            >
              Try adjusting your filters or search terms
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {referrals.map((referral) => (
                <MarketplaceReferralCard
                  key={referral.id}
                  referral={referral}
                  onClaim={() => handleClaim(referral)}
                />
              ))}
            </div>

            {nextCursor && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
                  style={{
                    backgroundColor: withAlpha(theme.text, 0.06),
                    color: theme.textMuted,
                    border: `1px solid ${withAlpha(theme.text, 0.1)}`,
                  }}
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load More
                </button>
              </div>
            )}
          </>
        )}

        {!isLoggedIn && referrals.length > 0 && (
          <div
            className="fixed bottom-0 left-0 right-0 z-40 p-4 pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${theme.bg}, transparent)`,
            }}
          >
            <div
              className="pointer-events-auto max-w-2xl mx-auto rounded-xl px-6 py-3 flex items-center justify-between gap-4"
              style={{
                backgroundColor: theme.bgGlow,
                boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
                border: `1px solid ${withAlpha(theme.text, 0.08)}`,
              }}
            >
              <p className="text-sm" style={{ color: theme.textMuted }}>
                Sign up for Colony to post your own referrals and claim
                opportunities
              </p>
              <a
                href="/sign-up"
                className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: theme.accent, color: "#fff" }}
              >
                Sign Up Free
              </a>
            </div>
          </div>
        )}
      </div>

      <SignUpPrompt
        open={signUpPromptOpen}
        onOpenChange={setSignUpPromptOpen}
        referralTitle={signUpReferralTitle}
      />
    </>
  );
}
