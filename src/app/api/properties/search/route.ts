// ============================================================================
// POST /api/properties/search
// Search for property data via Melissa Data API
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";
import { lookupProperty, getUsage } from "@/lib/melissa";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { address, save } = await request.json();

    if (!address || address.trim().length < 5) {
      return NextResponse.json(
        { error: "Valid address required" },
        { status: 400 }
      );
    }

    const result = await lookupProperty(address.trim(), userId);
    const usage = await getUsage(userId);

    // If save=true, create a Property record from the search result
    if (save && result) {
      const property = await prisma.property.create({
        data: {
          userId,
          address: result.address || address.trim(),
          city: result.city || "",
          state: result.state,
          zipCode: result.zipCode,
          price: result.assessedValue || result.marketValue || 0,
          status: "off_market",
          bedrooms: result.bedrooms,
          bathrooms: result.bathrooms,
          sqft: result.sqft,
          parcelId: result.parcelId,
          fips: result.fips,
          yearBuilt: result.yearBuilt,
          lotSizeSqft: result.lotSizeSqft,
          lotSizeAcres: result.lotSizeAcres,
          zoning: result.zoning,
          propertyType: result.propertyType,
          stories: result.stories,
          assessedValue: result.assessedValue,
          marketValue: result.marketValue,
          taxAmount: result.taxAmount,
          taxYear: result.taxYear,
          ownerName: result.ownerName,
          ownerOccupied: result.ownerOccupied,
          lastSaleDate: result.lastSaleDate ? new Date(result.lastSaleDate) : null,
          lastSalePrice: result.lastSalePrice,
          county: result.county,
          subdivision: result.subdivision,
          latitude: result.latitude,
          longitude: result.longitude,
          melissaEnrichedAt: new Date(),
          importSource: "melissa_search",
        },
      });
      return NextResponse.json({ property: result, saved: property, usage });
    }

    return NextResponse.json({ property: result, usage });
  } catch (error: any) {
    if (error.message?.includes("limit")) {
      try {
        const userId = await requireUserId();
        const usage = await getUsage(userId);
        return NextResponse.json(
          { error: error.message, usage },
          { status: 429 }
        );
      } catch {
        return NextResponse.json(
          { error: error.message },
          { status: 429 }
        );
      }
    }
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
