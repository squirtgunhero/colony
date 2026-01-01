import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/auth";
import { getPublishers, createPublisher } from "@/lib/db/honeycomb";
import type { PublishersResponse, CreatePublisherInput } from "@/lib/honeycomb/types";

/**
 * GET /api/honeycomb/publishers
 * Returns list of connected publishers and placements
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const publishers = await getPublishers();

    const response: PublishersResponse = {
      publishers: publishers.map((pub) => ({
        id: pub.id,
        name: pub.name,
        type: pub.type,
        status: pub.status,
        logoUrl: pub.logoUrl ?? undefined,
        placements: pub.placements,
        impressions: pub.impressions,
        revenue: pub.revenue,
        createdAt: pub.createdAt.toISOString(),
      })),
      placements: [], // Placements would come from a separate table if needed
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get honeycomb publishers:", error);
    return NextResponse.json(
      { error: "Failed to get publishers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/honeycomb/publishers
 * Creates a new publisher
 */
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input: CreatePublisherInput = await request.json();
    const publisher = await createPublisher(input);

    return NextResponse.json({
      id: publisher.id,
      name: publisher.name,
      type: publisher.type,
      status: publisher.status,
      logoUrl: publisher.logoUrl ?? undefined,
      placements: publisher.placements,
      impressions: publisher.impressions,
      revenue: publisher.revenue,
      createdAt: publisher.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create honeycomb publisher:", error);
    return NextResponse.json(
      { error: "Failed to create publisher" },
      { status: 500 }
    );
  }
}
