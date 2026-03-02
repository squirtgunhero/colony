import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/auth";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const publishers = await prisma.honeycombPublisher.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const publisherIds = publishers.map((p) => p.id);

    const zones = await prisma.adZone.findMany({
      where: { publisherId: { in: publisherIds } },
      include: {
        publisher: { select: { name: true } },
        _count: { select: { events: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const zoneIds = zones.map((z) => z.id);

    const [impressionCounts, clickCounts] = await Promise.all([
      prisma.adEvent.groupBy({
        by: ["zoneId"],
        where: { zoneId: { in: zoneIds }, eventType: "impression" },
        _count: true,
      }),
      prisma.adEvent.groupBy({
        by: ["zoneId"],
        where: { zoneId: { in: zoneIds }, eventType: "click" },
        _count: true,
      }),
    ]);

    const impressionMap = new Map(impressionCounts.map((r) => [r.zoneId, r._count]));
    const clickMap = new Map(clickCounts.map((r) => [r.zoneId, r._count]));

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    return NextResponse.json({
      zones: zones.map((z) => ({
        id: z.id,
        publisherId: z.publisherId,
        publisherName: z.publisher.name,
        name: z.name,
        format: z.format,
        siteUrl: z.siteUrl,
        active: z.active,
        impressions: impressionMap.get(z.id) || 0,
        clicks: clickMap.get(z.id) || 0,
        embedCode: `<div id="colony-ad-${z.id}"></div>\n<script src="${baseUrl}/api/ads/embed/${z.id}"></script>`,
        createdAt: z.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get zones error:", error);
    return NextResponse.json(
      { error: "Failed to get zones" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { publisherId, name, format, siteUrl } = body as {
      publisherId: string;
      name: string;
      format: string;
      siteUrl: string;
    };

    if (!publisherId || !name || !format || !siteUrl) {
      return NextResponse.json(
        { error: "publisherId, name, format, and siteUrl are required" },
        { status: 400 }
      );
    }

    const publisher = await prisma.honeycombPublisher.findFirst({
      where: { id: publisherId, userId: user.id },
    });

    if (!publisher) {
      return NextResponse.json(
        { error: "Publisher not found or not owned by you" },
        { status: 404 }
      );
    }

    const zone = await prisma.adZone.create({
      data: {
        publisherId,
        name,
        format,
        siteUrl,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    return NextResponse.json(
      {
        id: zone.id,
        publisherId: zone.publisherId,
        name: zone.name,
        format: zone.format,
        siteUrl: zone.siteUrl,
        active: zone.active,
        embedCode: `<div id="colony-ad-${zone.id}"></div>\n<script src="${baseUrl}/api/ads/embed/${zone.id}"></script>`,
        createdAt: zone.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create zone error:", error);
    return NextResponse.json(
      { error: "Failed to create zone" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("id");

    if (!zoneId) {
      return NextResponse.json(
        { error: "Zone ID is required" },
        { status: 400 }
      );
    }

    const zone = await prisma.adZone.findUnique({
      where: { id: zoneId },
      include: { publisher: { select: { userId: true } } },
    });

    if (!zone || zone.publisher.userId !== user.id) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    await prisma.adZone.update({
      where: { id: zoneId },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete zone error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate zone" },
      { status: 500 }
    );
  }
}
