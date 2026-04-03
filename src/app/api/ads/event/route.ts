import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  // Rate limit: 120 events per minute per IP
  const clientIp = getClientIp(request);
  const rl = await rateLimit(`ads-event:${clientIp}`, { limit: 120, windowSeconds: 60 });
  if (!rl.allowed) {
    return new NextResponse("Too many requests", { status: 429, headers: CORS_HEADERS });
  }

  try {
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("z");
    const campaignId = searchParams.get("c");
    const creativeId = searchParams.get("cr");
    const eventType = searchParams.get("t");

    if (!zoneId || !campaignId || !creativeId || !eventType) {
      return new NextResponse("Missing parameters", { status: 400, headers: CORS_HEADERS });
    }

    if (eventType !== "impression" && eventType !== "click") {
      return new NextResponse("Invalid event type", { status: 400, headers: CORS_HEADERS });
    }

    const rawIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ip = hashIp(rawIp);
    const userAgent = request.headers.get("user-agent") || undefined;
    const referer = request.headers.get("referer") || undefined;

    const zone = await prisma.adZone.findUnique({ where: { id: zoneId } });
    const channel = zone ? "native" : "native";

    const campaign = await prisma.honeycombCampaign.findUnique({
      where: { id: campaignId },
      select: { channel: true },
    });

    await prisma.adEvent.create({
      data: {
        zoneId,
        campaignId,
        creativeId,
        eventType,
        channel: campaign?.channel || channel,
        ip,
        userAgent,
        referer,
      },
    });

    if (eventType === "impression") {
      await Promise.all([
        prisma.honeycombCampaign.update({
          where: { id: campaignId },
          data: { impressions: { increment: 1 } },
        }),
        prisma.honeycombCreative.update({
          where: { id: creativeId },
          data: { metadata: {} },
        }).catch(() => {}),
      ]);

      return new NextResponse(TRANSPARENT_GIF, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "image/gif",
          "Cache-Control": "no-store",
        },
      });
    }

    await prisma.honeycombCampaign.update({
      where: { id: campaignId },
      data: { clicks: { increment: 1 } },
    });

    const creative = await prisma.honeycombCreative.findUnique({
      where: { id: creativeId },
      select: { ctaUrl: true },
    });

    const redirectUrl = creative?.ctaUrl || "/";

    return NextResponse.redirect(redirectUrl, {
      status: 302,
      headers: CORS_HEADERS,
    });
  } catch (error) {
    console.error("Ad event error:", error);
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "image/gif",
      },
    });
  }
}
