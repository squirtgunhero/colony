import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";
import type { AnalyticsSummaryResponse, AnalyticsSummary, ChannelBreakdown, TopPerformer } from "@/lib/honeycomb/types";

const CPM_RATE = 5;

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaigns = await prisma.honeycombCampaign.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        channel: true,
        impressions: true,
        clicks: true,
        conversions: true,
        spend: true,
      },
    });

    const campaignIds = campaigns.map((c) => c.id);

    const [nativeEvents, llmListings] = await Promise.all([
      campaignIds.length > 0
        ? prisma.adEvent.groupBy({
            by: ["campaignId", "eventType", "channel"],
            where: { campaignId: { in: campaignIds } },
            _count: true,
          })
        : Promise.resolve([]),
      prisma.llmListing.findMany({
        where: { userId: user.id },
        select: {
          campaignId: true,
          impressions: true,
          clicks: true,
        },
      }),
    ]);

    const channelMetrics: Record<string, { impressions: number; clicks: number; spend: number }> = {};

    for (const c of campaigns) {
      const ch = c.channel || "native";
      if (!channelMetrics[ch]) channelMetrics[ch] = { impressions: 0, clicks: 0, spend: 0 };

      if (ch === "meta") {
        channelMetrics[ch].impressions += c.impressions;
        channelMetrics[ch].clicks += c.clicks;
        channelMetrics[ch].spend += c.spend;
      }
    }

    for (const ev of nativeEvents) {
      const ch = ev.channel || "native";
      if (!channelMetrics[ch]) channelMetrics[ch] = { impressions: 0, clicks: 0, spend: 0 };
      if (ev.eventType === "impression") {
        channelMetrics[ch].impressions += ev._count;
        channelMetrics[ch].spend += (ev._count / 1000) * CPM_RATE;
      } else if (ev.eventType === "click") {
        channelMetrics[ch].clicks += ev._count;
      }
    }

    for (const listing of llmListings) {
      if (!channelMetrics["llm"]) channelMetrics["llm"] = { impressions: 0, clicks: 0, spend: 0 };
      channelMetrics["llm"].impressions += listing.impressions;
      channelMetrics["llm"].clicks += listing.clicks;
      channelMetrics["llm"].spend += (listing.impressions / 1000) * CPM_RATE;
    }

    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);

    for (const m of Object.values(channelMetrics)) {
      totalImpressions += m.impressions;
      totalClicks += m.clicks;
      totalSpend += m.spend;
    }

    const channelBreakdown: ChannelBreakdown[] = Object.entries(channelMetrics).map(([channel, m]) => ({
      channel,
      impressions: m.impressions,
      clicks: m.clicks,
      spend: Math.round(m.spend * 100) / 100,
      percentage: totalImpressions > 0 ? Math.round((m.impressions / totalImpressions) * 100) : 0,
    }));

    const topCampaigns: TopPerformer[] = campaigns
      .filter((c) => c.impressions > 0)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        name: c.name,
        impressions: c.impressions,
        clicks: c.clicks,
        ctr: c.impressions > 0 ? Math.round((c.clicks / c.impressions) * 10000) / 100 : 0,
      }));

    const publishers = await prisma.honeycombPublisher.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const publisherIds = publishers.map((p) => p.id);

    let topZones: TopPerformer[] = [];
    if (publisherIds.length > 0) {
      const zones = await prisma.adZone.findMany({
        where: { publisherId: { in: publisherIds } },
        select: { id: true, name: true },
      });

      const zoneIds = zones.map((z) => z.id);
      if (zoneIds.length > 0) {
        const zoneEvents = await prisma.adEvent.groupBy({
          by: ["zoneId", "eventType"],
          where: { zoneId: { in: zoneIds } },
          _count: true,
        });

        const zoneMetrics: Record<string, { impressions: number; clicks: number }> = {};
        for (const ev of zoneEvents) {
          if (!zoneMetrics[ev.zoneId]) zoneMetrics[ev.zoneId] = { impressions: 0, clicks: 0 };
          if (ev.eventType === "impression") zoneMetrics[ev.zoneId].impressions += ev._count;
          else if (ev.eventType === "click") zoneMetrics[ev.zoneId].clicks += ev._count;
        }

        const zoneMap = new Map(zones.map((z) => [z.id, z.name]));
        topZones = Object.entries(zoneMetrics)
          .sort(([, a], [, b]) => b.impressions - a.impressions)
          .slice(0, 5)
          .map(([zoneId, m]) => ({
            id: zoneId,
            name: zoneMap.get(zoneId) || "Zone",
            impressions: m.impressions,
            clicks: m.clicks,
            ctr: m.impressions > 0 ? Math.round((m.clicks / m.impressions) * 10000) / 100 : 0,
          }));
      }
    }

    const summary: AnalyticsSummary = {
      totalImpressions: totalImpressions || null,
      totalClicks: totalClicks || null,
      conversions: totalConversions || null,
      costPerConversion: totalConversions > 0 ? Math.round((totalSpend / totalConversions) * 100) / 100 : null,
      performanceOverTime: [],
      channelBreakdown,
      topCampaigns,
      topCreatives: topZones,
    };

    const response: AnalyticsSummaryResponse = { summary };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get honeycomb analytics:", error);
    return NextResponse.json(
      { error: "Failed to get analytics" },
      { status: 500 }
    );
  }
}
