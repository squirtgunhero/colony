import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

const CPM_RATE = 5;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  // Rate limit: 60 requests per minute per IP
  const ip = getClientIp(request);
  const rl = await rateLimit(`ads-serve:${ip}`, { limit: 60, windowSeconds: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, ad: null }, { status: 429, headers: CORS_HEADERS });
  }

  try {
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zone");
    const format = searchParams.get("format");

    if (!zoneId) {
      return NextResponse.json({ ok: false, ad: null }, { headers: CORS_HEADERS });
    }

    const zone = await prisma.adZone.findUnique({
      where: { id: zoneId },
      include: { publisher: true },
    });

    if (!zone || !zone.active) {
      return NextResponse.json({ ok: false, ad: null }, { headers: CORS_HEADERS });
    }

    const targetFormat = format || zone.format;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const activeCampaigns = await prisma.honeycombCampaign.findMany({
      where: {
        status: "active",
        channel: { in: ["native", "local"] },
        creatives: {
          some: {
            creative: {
              format: targetFormat,
              status: "approved",
            },
          },
        },
      },
      include: {
        creatives: {
          include: {
            creative: true,
          },
          where: {
            creative: {
              format: targetFormat,
              status: "approved",
            },
          },
        },
      },
    });

    const eligible: Array<{
      campaignId: string;
      channel: string;
      userId: string;
      dailyBudget: number | null;
      creative: {
        id: string;
        fileUrl: string | null;
        headline: string | null;
        bodyText: string | null;
        ctaText: string | null;
        ctaUrl: string | null;
      };
    }> = [];

    // Batch fetch: local exchange pairs for all local campaigns
    const localCampaigns = activeCampaigns.filter((c) => c.channel === "local");
    const localUserIds = localCampaigns.map((c) => c.userId);

    const activePairs = localUserIds.length > 0
      ? await prisma.localExchangePair.findMany({
          where: {
            status: "active",
            OR: [
              { userAId: { in: localUserIds }, userBId: zone.publisher.userId },
              { userAId: zone.publisher.userId, userBId: { in: localUserIds } },
            ],
          },
        })
      : [];

    const pairedUserIds = new Set(
      activePairs.flatMap((p) => [p.userAId, p.userBId])
    );

    // Batch fetch: today's impression counts for campaigns with daily budgets
    const budgetCampaignIds = activeCampaigns
      .filter((c) => c.dailyBudget)
      .map((c) => c.id);

    const impressionCounts = budgetCampaignIds.length > 0
      ? await prisma.adEvent.groupBy({
          by: ["campaignId"],
          where: {
            campaignId: { in: budgetCampaignIds },
            eventType: "impression",
            createdAt: { gte: todayStart },
          },
          _count: { _all: true },
        })
      : [];

    const impressionMap = new Map(
      impressionCounts.map((ic) => [ic.campaignId, ic._count._all])
    );

    for (const campaign of activeCampaigns) {
      if (campaign.channel === "local") {
        if (!pairedUserIds.has(campaign.userId)) continue;
      }

      if (campaign.dailyBudget) {
        const todayImpressions = impressionMap.get(campaign.id) || 0;
        const maxImpressions = (campaign.dailyBudget / CPM_RATE) * 1000;
        if (todayImpressions >= maxImpressions) continue;
      }

      for (const cc of campaign.creatives) {
        eligible.push({
          campaignId: campaign.id,
          channel: campaign.channel,
          userId: campaign.userId,
          dailyBudget: campaign.dailyBudget,
          creative: {
            id: cc.creative.id,
            fileUrl: cc.creative.fileUrl,
            headline: cc.creative.headline,
            bodyText: cc.creative.bodyText,
            ctaText: cc.creative.ctaText,
            ctaUrl: cc.creative.ctaUrl,
          },
        });
        if (eligible.length >= 100) break;
      }
      if (eligible.length >= 100) break;
    }

    if (eligible.length === 0) {
      return NextResponse.json({ ok: false, ad: null }, { headers: CORS_HEADERS });
    }

    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    return NextResponse.json(
      {
        ok: true,
        ad: {
          campaign_id: pick.campaignId,
          creative_id: pick.creative.id,
          image_url: pick.creative.fileUrl,
          headline: pick.creative.headline,
          body: pick.creative.bodyText,
          cta_text: pick.creative.ctaText,
          cta_url: pick.creative.ctaUrl,
          impression_url: `${baseUrl}/api/ads/event?z=${zoneId}&c=${pick.campaignId}&cr=${pick.creative.id}&t=impression`,
          click_url: `${baseUrl}/api/ads/event?z=${zoneId}&c=${pick.campaignId}&cr=${pick.creative.id}&t=click`,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Ad serve error:", error);
    return NextResponse.json({ ok: false, ad: null }, { headers: CORS_HEADERS });
  }
}
