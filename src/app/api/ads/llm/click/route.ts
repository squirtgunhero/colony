import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listing");

    if (!listingId) {
      return new NextResponse("Missing listing parameter", {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const listing = await prisma.llmListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return new NextResponse("Listing not found", {
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    await prisma.llmListing.update({
      where: { id: listingId },
      data: { clicks: { increment: 1 } },
    });

    const redirectUrl = listing.website || "/";

    return NextResponse.redirect(redirectUrl, {
      status: 302,
      headers: CORS_HEADERS,
    });
  } catch (error) {
    console.error("LLM click error:", error);
    return new NextResponse("Internal error", {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}
