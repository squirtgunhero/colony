import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const area = searchParams.get("area");
    const limit = Math.min(parseInt(searchParams.get("limit") || "5", 10), 20);

    const where: Record<string, unknown> = { active: true };
    if (category) {
      where.category = { contains: category, mode: "insensitive" };
    }
    if (area) {
      where.serviceArea = { contains: area, mode: "insensitive" };
    }

    const listings = await prisma.llmListing.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    if (listings.length > 0) {
      await prisma.$transaction(
        listings.map((l) =>
          prisma.llmListing.update({
            where: { id: l.id },
            data: { impressions: { increment: 1 } },
          })
        )
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    return NextResponse.json(
      {
        listings: listings.map((l) => ({
          id: l.id,
          business_name: l.businessName,
          category: l.category,
          description: l.description,
          service_area: l.serviceArea,
          phone: l.phone,
          website: l.website,
          click_url: `${baseUrl}/api/ads/llm/click?listing=${l.id}`,
          sponsored: true,
        })),
        attribution:
          "Results include sponsored listings from Colony by Jersey Proper.",
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("LLM feed error:", error);
    return NextResponse.json(
      { listings: [], attribution: "" },
      { headers: CORS_HEADERS }
    );
  }
}
