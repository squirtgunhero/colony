// Google Ads Domain Executors
import { prisma } from "@/lib/prisma";
import type { ActionExecutor } from "../types";
import { recordChange } from "../helpers";

export const googleExecutors: Record<string, ActionExecutor> = {
  "google.analyze_keywords": async (action, ctx) => {
    if (action.type !== "google.analyze_keywords") throw new Error("Invalid action type");

    try {
      const payload = action.payload;
      const dateRange = payload.date_range || "7d";

      const googleAccount = await prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      });

      if (!googleAccount) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "No Google Ads account connected. Go to Settings to connect one.",
        };
      }

      const { createGoogleAdsClient } = await import("@/lib/google-ads/client");
      const client = createGoogleAdsClient(googleAccount.refreshToken);

      const [keywords, campaigns] = await Promise.all([
        client.getKeywordPerformance(googleAccount.customerId, dateRange),
        client.getCampaignPerformance(googleAccount.customerId, dateRange),
      ]);

      // Aggregate campaign-level metrics
      const campaignAgg: Record<string, { name: string; spend: number; clicks: number; impressions: number; conversions: number }> = {};
      for (const row of campaigns) {
        if (!campaignAgg[row.campaignId]) {
          campaignAgg[row.campaignId] = { name: row.campaignName, spend: 0, clicks: 0, impressions: 0, conversions: 0 };
        }
        const c = campaignAgg[row.campaignId];
        c.spend += row.costMicros / 1_000_000;
        c.clicks += row.clicks;
        c.impressions += row.impressions;
        c.conversions += row.conversions;
      }

      // Identify waste keywords (high spend, no conversions)
      const wasteKeywords = keywords
        .filter((k) => k.costMicros > 5_000_000 && k.conversions === 0)
        .sort((a, b) => b.costMicros - a.costMicros)
        .slice(0, 10)
        .map((k) => ({
          keyword: k.keyword,
          match_type: k.matchType,
          spend: `$${(k.costMicros / 1_000_000).toFixed(2)}`,
          clicks: k.clicks,
          conversions: k.conversions,
        }));

      // Top performing keywords
      const topKeywords = keywords
        .filter((k) => k.conversions > 0)
        .sort((a, b) => {
          const aCPConv = a.costMicros / a.conversions;
          const bCPConv = b.costMicros / b.conversions;
          return aCPConv - bCPConv;
        })
        .slice(0, 10)
        .map((k) => ({
          keyword: k.keyword,
          match_type: k.matchType,
          spend: `$${(k.costMicros / 1_000_000).toFixed(2)}`,
          clicks: k.clicks,
          conversions: k.conversions,
          cost_per_conversion: `$${(k.costMicros / k.conversions / 1_000_000).toFixed(2)}`,
        }));

      const totalSpend = Object.values(campaignAgg).reduce((s, c) => s + c.spend, 0);
      const totalConversions = Object.values(campaignAgg).reduce((s, c) => s + c.conversions, 0);

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          platform: "google",
          date_range: dateRange,
          total_spend: Math.round(totalSpend * 100) / 100,
          total_conversions: totalConversions,
          total_keywords_analyzed: keywords.length,
          waste_keywords: wasteKeywords,
          top_keywords: topKeywords,
          campaigns: Object.values(campaignAgg).map((c) => ({
            name: c.name,
            spend: Math.round(c.spend * 100) / 100,
            clicks: c.clicks,
            impressions: c.impressions,
            conversions: c.conversions,
          })),
          suggested_negatives: wasteKeywords.map((k) => k.keyword),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Google keyword analysis failed: ${message}`,
      };
    }
  },

  "google.pause_campaign": async (action, ctx) => {
    if (action.type !== "google.pause_campaign") throw new Error("Invalid action type");

    try {
      const payload = action.payload;

      const googleAccount = await prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      });

      if (!googleAccount) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: "No Google Ads account connected." };
      }

      const campaign = await prisma.googleCampaign.findFirst({
        where: { accountId: googleAccount.id, name: { contains: payload.campaign_name, mode: "insensitive" }, status: { not: "REMOVED" } },
      });

      if (!campaign) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `No Google campaign found matching "${payload.campaign_name}".` };
      }

      const { createGoogleAdsClient } = await import("@/lib/google-ads/client");
      const client = createGoogleAdsClient(googleAccount.refreshToken);

      const before = { status: campaign.status };
      await client.pauseCampaign(googleAccount.customerId, campaign.campaignId);

      await prisma.googleCampaign.update({ where: { id: campaign.id }, data: { status: "PAUSED" } });
      await recordChange(ctx.run_id, action.action_id, "GoogleCampaign", campaign.id, "update", before, { status: "PAUSED" });

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: { campaign_name: campaign.name, previous_status: before.status, new_status: "PAUSED", note: `Paused Google campaign "${campaign.name}".` },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `Failed to pause Google campaign: ${message}` };
    }
  },

  "google.resume_campaign": async (action, ctx) => {
    if (action.type !== "google.resume_campaign") throw new Error("Invalid action type");

    try {
      const payload = action.payload;

      const googleAccount = await prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      });

      if (!googleAccount) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: "No Google Ads account connected." };
      }

      const campaign = await prisma.googleCampaign.findFirst({
        where: { accountId: googleAccount.id, name: { contains: payload.campaign_name, mode: "insensitive" }, status: "PAUSED" },
      });

      if (!campaign) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `No paused Google campaign found matching "${payload.campaign_name}".` };
      }

      const { createGoogleAdsClient } = await import("@/lib/google-ads/client");
      const client = createGoogleAdsClient(googleAccount.refreshToken);

      const before = { status: campaign.status };
      await client.resumeCampaign(googleAccount.customerId, campaign.campaignId);

      await prisma.googleCampaign.update({ where: { id: campaign.id }, data: { status: "ENABLED" } });
      await recordChange(ctx.run_id, action.action_id, "GoogleCampaign", campaign.id, "update", before, { status: "ENABLED" });

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: { campaign_name: campaign.name, previous_status: before.status, new_status: "ENABLED", note: `Resumed Google campaign "${campaign.name}".` },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `Failed to resume Google campaign: ${message}` };
    }
  },

  "google.add_negatives": async (action, ctx) => {
    if (action.type !== "google.add_negatives") throw new Error("Invalid action type");

    try {
      const payload = action.payload;

      const googleAccount = await prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      });

      if (!googleAccount) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: "No Google Ads account connected." };
      }

      const campaign = await prisma.googleCampaign.findFirst({
        where: { accountId: googleAccount.id, name: { contains: payload.campaign_name, mode: "insensitive" }, status: { not: "REMOVED" } },
      });

      if (!campaign) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `No Google campaign found matching "${payload.campaign_name}".` };
      }

      const { createGoogleAdsClient } = await import("@/lib/google-ads/client");
      const client = createGoogleAdsClient(googleAccount.refreshToken);

      const result = await client.addNegativeKeywords(googleAccount.customerId, campaign.campaignId, payload.keywords);

      await recordChange(ctx.run_id, action.action_id, "GoogleCampaign", campaign.id, "update", { negatives_before: "unknown" }, { negatives_added: payload.keywords });

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          campaign_name: campaign.name,
          keywords_added: result.added,
          keywords: payload.keywords,
          note: `Added ${result.added} negative keyword(s) to "${campaign.name}": ${payload.keywords.join(", ")}`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `Failed to add negative keywords: ${message}` };
    }
  },

  "google.adjust_bid": async (action, ctx) => {
    if (action.type !== "google.adjust_bid") throw new Error("Invalid action type");

    try {
      const payload = action.payload;

      const googleAccount = await prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      });

      if (!googleAccount) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: "No Google Ads account connected." };
      }

      const campaign = await prisma.googleCampaign.findFirst({
        where: { accountId: googleAccount.id, name: { contains: payload.campaign_name, mode: "insensitive" }, status: { not: "REMOVED" } },
      });

      if (!campaign) {
        return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `No Google campaign found matching "${payload.campaign_name}".` };
      }

      const { createGoogleAdsClient } = await import("@/lib/google-ads/client");
      const client = createGoogleAdsClient(googleAccount.refreshToken);

      const newBudgetMicros = Math.round(payload.new_daily_budget * 1_000_000);
      const previousBudgetMicros = campaign.budgetAmountMicros;

      const before = { budgetAmountMicros: previousBudgetMicros };
      await client.updateBudget(googleAccount.customerId, campaign.campaignId, newBudgetMicros);

      await prisma.googleCampaign.update({ where: { id: campaign.id }, data: { budgetAmountMicros: String(newBudgetMicros) } });
      await recordChange(ctx.run_id, action.action_id, "GoogleCampaign", campaign.id, "update", before, { budgetAmountMicros: String(newBudgetMicros) });

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          campaign_name: campaign.name,
          previous_budget: previousBudgetMicros ? `$${(parseInt(previousBudgetMicros) / 1_000_000).toFixed(2)}/day` : "unknown",
          new_budget: `$${payload.new_daily_budget}/day`,
          note: `Updated "${campaign.name}" budget to $${payload.new_daily_budget}/day.`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { action_id: action.action_id, action_type: action.type, status: "failed" as const, error: `Failed to adjust Google campaign budget: ${message}` };
    }
  },

  // ============================================================================
  // google.create_campaign — Create a Google Ads search campaign
  // Creates: budget → campaign → ad group → responsive search ad → keywords
  // ============================================================================
  "google.create_campaign": async (action, ctx) => {
    if (action.type !== "google.create_campaign") throw new Error("Invalid action type");

    try {
      const payload = action.payload;

      const googleAccount = await prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      });

      if (!googleAccount) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "No Google Ads account connected. Go to Settings > Integrations to connect your Google Ads account.",
        };
      }

      const { createGoogleAdsClient } = await import("@/lib/google-ads/client");
      const client = createGoogleAdsClient(googleAccount.refreshToken);

      // Generate campaign name if not provided
      const campaignName = payload.name || `Colony Campaign ${new Date().toLocaleDateString()}`;
      const dailyBudget = payload.daily_budget || 10;
      const budgetMicros = Math.round(dailyBudget * 1_000_000);

      // Step 1: Create campaign with budget
      const { campaignId, budgetResourceName } = await client.createCampaign(
        googleAccount.customerId,
        {
          name: campaignName,
          advertisingChannelType: (payload.advertising_channel_type as "SEARCH" | "DISPLAY") || "SEARCH",
          budgetAmountMicros: budgetMicros,
          status: "PAUSED", // Always start paused for safety
        }
      );

      // Save to database
      const dbCampaign = await prisma.googleCampaign.create({
        data: {
          accountId: googleAccount.id,
          campaignId,
          name: campaignName,
          status: "PAUSED",
          advertisingChannelType: payload.advertising_channel_type || "SEARCH",
          budgetAmountMicros: String(budgetMicros),
          startDate: new Date().toISOString().split("T")[0],
        },
      });

      await recordChange(ctx.run_id, action.action_id, "GoogleCampaign", dbCampaign.id, "create", null, {
        name: campaignName,
        status: "PAUSED",
        budgetAmountMicros: String(budgetMicros),
      });

      // Step 2: Create ad group
      let adGroupId: string | null = null;
      try {
        const adGroupName = `${campaignName} - Ad Group`;
        adGroupId = await client.createAdGroup(googleAccount.customerId, {
          campaignId,
          name: adGroupName,
          cpcBidMicros: Math.round(2 * 1_000_000), // $2 default CPC bid
          status: "ENABLED",
        });

        await prisma.googleAdGroup.create({
          data: {
            campaignId: dbCampaign.id,
            adGroupId,
            name: adGroupName,
            status: "ENABLED",
            type: "SEARCH_STANDARD",
            cpcBidMicros: String(2_000_000),
          },
        });
      } catch (e) {
        console.error("[Google Ads] Ad group creation failed:", e);
      }

      // Step 3: Create responsive search ad if we have headlines/descriptions
      if (adGroupId) {
        const headlines = payload.headlines && payload.headlines.length >= 3
          ? payload.headlines.slice(0, 15)
          : [
              `${payload.business_name || "Professional"} Services`,
              `Serving ${payload.service_area || "Your Area"}`,
              "Contact Us Today",
            ];

        const descriptions = payload.descriptions && payload.descriptions.length >= 2
          ? payload.descriptions.slice(0, 4)
          : [
              `Trusted ${payload.business_name || "local"} professionals ready to help. Get a free consultation today.`,
              "Contact us now for expert service. Satisfaction guaranteed.",
            ];

        const finalUrls = payload.final_url ? [payload.final_url] : ["https://mycolonyhq.com"];

        try {
          await client.createResponsiveSearchAd(googleAccount.customerId, {
            adGroupId,
            headlines: headlines.map((h) => h.slice(0, 30)), // Enforce 30-char limit
            descriptions: descriptions.map((d) => d.slice(0, 90)), // Enforce 90-char limit
            finalUrls,
            status: "ENABLED",
          });
        } catch (e) {
          console.error("[Google Ads] Ad creation failed:", e);
        }

        // Step 4: Add keywords if provided
        if (payload.keywords && payload.keywords.length > 0) {
          try {
            await client.addKeywords(googleAccount.customerId, {
              adGroupId,
              keywords: payload.keywords.map((kw) => ({
                text: kw,
                matchType: "BROAD" as const,
              })),
            });
          } catch (e) {
            console.error("[Google Ads] Keyword addition failed:", e);
          }
        }
      }

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          campaign_name: campaignName,
          campaign_id: campaignId,
          daily_budget: `$${dailyBudget}/day`,
          channel_type: payload.advertising_channel_type || "SEARCH",
          status: "PAUSED",
          ad_group_created: !!adGroupId,
          note: `Created Google Ads campaign "${campaignName}" with $${dailyBudget}/day budget. The campaign is PAUSED — use "launch my Google campaign" to activate it.`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to create Google Ads campaign: ${message}`,
      };
    }
  },

  // ============================================================================
  // google.check_performance — Check Google Ads campaign performance
  // ============================================================================
  "google.check_performance": async (action, ctx) => {
    if (action.type !== "google.check_performance") throw new Error("Invalid action type");

    try {
      const payload = action.payload;
      const dateRange = payload.date_range || "7d";

      const googleAccount = await prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      });

      if (!googleAccount) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "No Google Ads account connected.",
        };
      }

      const { createGoogleAdsClient } = await import("@/lib/google-ads/client");
      const client = createGoogleAdsClient(googleAccount.refreshToken);

      // Get campaign performance data
      const performance = await client.getCampaignPerformance(
        googleAccount.customerId,
        dateRange
      );

      if (performance.length === 0) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success" as const,
          data: {
            campaigns: [],
            note: `No Google Ads performance data found for the last ${dateRange}.`,
          },
        };
      }

      // Aggregate by campaign
      const campaignMap = new Map<string, {
        name: string;
        status: string;
        impressions: number;
        clicks: number;
        costMicros: number;
        conversions: number;
      }>();

      for (const perf of performance) {
        const existing = campaignMap.get(perf.campaignId) || {
          name: perf.campaignName,
          status: perf.status,
          impressions: 0,
          clicks: 0,
          costMicros: 0,
          conversions: 0,
        };

        existing.impressions += perf.impressions;
        existing.clicks += perf.clicks;
        existing.costMicros += perf.costMicros;
        existing.conversions += perf.conversions;
        campaignMap.set(perf.campaignId, existing);
      }

      // Filter by campaign name if specified
      let campaigns = Array.from(campaignMap.entries()).map(([id, data]) => ({
        campaign_id: id,
        name: data.name,
        status: data.status,
        impressions: data.impressions,
        clicks: data.clicks,
        spend: `$${(data.costMicros / 1_000_000).toFixed(2)}`,
        conversions: data.conversions,
        ctr: data.impressions > 0
          ? `${((data.clicks / data.impressions) * 100).toFixed(2)}%`
          : "0.00%",
        cpc: data.clicks > 0
          ? `$${(data.costMicros / data.clicks / 1_000_000).toFixed(2)}`
          : "$0.00",
        cost_per_conversion: data.conversions > 0
          ? `$${(data.costMicros / data.conversions / 1_000_000).toFixed(2)}`
          : "N/A",
      }));

      if (payload.campaign_name) {
        campaigns = campaigns.filter((c) =>
          c.name.toLowerCase().includes(payload.campaign_name!.toLowerCase())
        );
      }

      // Totals
      const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
      const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
      const totalCostMicros = Array.from(campaignMap.values()).reduce((sum, c) => sum + c.costMicros, 0);
      const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          date_range: dateRange,
          campaigns,
          totals: {
            campaigns: campaigns.length,
            impressions: totalImpressions,
            clicks: totalClicks,
            spend: `$${(totalCostMicros / 1_000_000).toFixed(2)}`,
            conversions: totalConversions,
          },
          note: `Google Ads performance for the last ${dateRange}: ${campaigns.length} campaign(s), ${totalImpressions} impressions, ${totalClicks} clicks, $${(totalCostMicros / 1_000_000).toFixed(2)} spent, ${totalConversions} conversions.`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to check Google Ads performance: ${message}`,
      };
    }
  },

  // ============================================================================
  // google.launch_campaign — Activate a paused Google Ads campaign
  // ============================================================================
  "google.launch_campaign": async (action, ctx) => {
    if (action.type !== "google.launch_campaign") throw new Error("Invalid action type");

    try {
      const payload = action.payload;

      const googleAccount = await prisma.googleAdAccount.findFirst({
        where: { userId: ctx.user_id, isActive: true },
      });

      if (!googleAccount) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: "No Google Ads account connected.",
        };
      }

      const campaign = await prisma.googleCampaign.findFirst({
        where: {
          accountId: googleAccount.id,
          name: { contains: payload.campaign_name, mode: "insensitive" },
          status: { not: "REMOVED" },
        },
      });

      if (!campaign) {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "failed" as const,
          error: `No Google campaign found matching "${payload.campaign_name}".`,
        };
      }

      if (campaign.status === "ENABLED") {
        return {
          action_id: action.action_id,
          action_type: action.type,
          status: "success" as const,
          data: {
            campaign_name: campaign.name,
            note: `Campaign "${campaign.name}" is already active.`,
          },
        };
      }

      const { createGoogleAdsClient } = await import("@/lib/google-ads/client");
      const client = createGoogleAdsClient(googleAccount.refreshToken);

      const before = { status: campaign.status };
      await client.resumeCampaign(googleAccount.customerId, campaign.campaignId);

      await prisma.googleCampaign.update({
        where: { id: campaign.id },
        data: { status: "ENABLED" },
      });

      await recordChange(ctx.run_id, action.action_id, "GoogleCampaign", campaign.id, "update", before, { status: "ENABLED" });

      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "success" as const,
        data: {
          campaign_name: campaign.name,
          previous_status: before.status,
          new_status: "ENABLED",
          daily_budget: campaign.budgetAmountMicros
            ? `$${(parseInt(campaign.budgetAmountMicros) / 1_000_000).toFixed(2)}/day`
            : "unknown",
          note: `Launched "${campaign.name}" — it is now ACTIVE and will begin spending.`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        action_id: action.action_id,
        action_type: action.type,
        status: "failed" as const,
        error: `Failed to launch Google campaign: ${message}`,
      };
    }
  },
};
