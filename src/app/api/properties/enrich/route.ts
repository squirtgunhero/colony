// ============================================================================
// POST /api/properties/enrich
// Enrich an existing property with Melissa Data and optionally score it
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";
import { lookupProperty, getUsage } from "@/lib/melissa";
import { scoreProperty } from "@/lib/property-scoring";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { propertyId } = await request.json();

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    // Verify user owns this property
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Look up property data via Melissa
    const fullAddress = [property.address, property.city, property.state, property.zipCode]
      .filter(Boolean)
      .join(", ");

    const result = await lookupProperty(fullAddress, userId);

    if (!result) {
      const usage = await getUsage(userId);
      return NextResponse.json(
        { error: "No data found for this address", usage },
        { status: 404 }
      );
    }

    // Update the property with enrichment data
    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: {
        parcelId: result.parcelId ?? property.parcelId,
        fips: result.fips ?? property.fips,
        yearBuilt: result.yearBuilt ?? property.yearBuilt,
        lotSizeSqft: result.lotSizeSqft ?? property.lotSizeSqft,
        lotSizeAcres: result.lotSizeAcres ?? property.lotSizeAcres,
        zoning: result.zoning ?? property.zoning,
        propertyType: result.propertyType ?? property.propertyType,
        stories: result.stories ?? property.stories,
        assessedValue: result.assessedValue ?? property.assessedValue,
        marketValue: result.marketValue ?? property.marketValue,
        taxAmount: result.taxAmount ?? property.taxAmount,
        taxYear: result.taxYear ?? property.taxYear,
        ownerName: result.ownerName ?? property.ownerName,
        ownerOccupied: result.ownerOccupied ?? property.ownerOccupied,
        lastSaleDate: result.lastSaleDate ? new Date(result.lastSaleDate) : property.lastSaleDate,
        lastSalePrice: result.lastSalePrice ?? property.lastSalePrice,
        county: result.county ?? property.county,
        subdivision: result.subdivision ?? property.subdivision,
        latitude: result.latitude ?? property.latitude,
        longitude: result.longitude ?? property.longitude,
        bedrooms: result.bedrooms ?? property.bedrooms,
        bathrooms: result.bathrooms ?? property.bathrooms,
        sqft: result.sqft ?? property.sqft,
        melissaEnrichedAt: new Date(),
      },
    });

    // Optionally score the property after enrichment
    let scoring = null;
    try {
      scoring = await scoreProperty(propertyId);
    } catch {
      // Scoring is best-effort; don't fail the enrichment
    }

    const usage = await getUsage(userId);

    return NextResponse.json({
      property: updated,
      scoring,
      usage,
    });
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
      { error: error.message || "Enrichment failed" },
      { status: 500 }
    );
  }
}
