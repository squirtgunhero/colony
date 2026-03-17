import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/valuation
 * Public endpoint — creates a new Contact (lead) from a home valuation request.
 * Accepts an optional `?agent=USER_ID` query param to assign the lead to a specific agent.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, city, state, zip, name, email, phone } = body;

    if (!name || !email || !address || !city || !state || !zip) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, address, city, state, and zip are required." },
        { status: 400 }
      );
    }

    const agentId = request.nextUrl.searchParams.get("agent") || undefined;

    const fullAddress = `${address}, ${city}, ${state} ${zip}`;

    const contact = await prisma.contact.create({
      data: {
        name,
        email,
        phone: phone || undefined,
        source: "valuation_landing_page",
        type: "lead",
        userId: agentId,
        tags: ["valuation_request"],
        notes: `Home valuation request for: ${fullAddress}`,
      },
    });

    return NextResponse.json({ success: true, contactId: contact.id }, { status: 201 });
  } catch (error) {
    console.error("[valuation] Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to submit valuation request. Please try again." },
      { status: 500 }
    );
  }
}
