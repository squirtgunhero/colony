import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    for (const campaign of activeCampaigns) {
      if (campaign.channel === "local") {
        const pair = await prisma.localExchangePair.findFirst({
          where: {
            status: "active",
            OR: [
              { userAId: campaign.userId, userBId: zone.publisher.userId },
              { userAId: zone.publisher.userId, userBId: campaign.userId },
            ],
          },
        });
        if (!pair) continue;
      }

      if (campaign.dailyBudget) {
        const todayImpressions = await prisma.adEvent.count({
          where: {
            campaignId: campaign.id,
            eventType: "impression",
            createdAt: { gte: todayStart },
          },
        });
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
      }
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
