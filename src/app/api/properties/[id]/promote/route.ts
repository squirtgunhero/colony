// ============================================================================
// POST /api/properties/[id]/promote
// Create a Facebook ad campaign for a specific property listing
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { runLam } from "@/lam";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: propertyId } = await params;

    // Get the property
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const dailyBudget = Number(body.daily_budget) || 10;

    // Build a natural-language message for the LAM that describes the property promotion
    const locationParts = [property.city, property.state].filter(Boolean);
    const location = locationParts.join(", ");

    const detailParts: string[] = [];
    if (property.bedrooms) detailParts.push(`${property.bedrooms} bed`);
    if (property.bathrooms) detailParts.push(`${property.bathrooms} bath`);
    if (property.sqft) detailParts.push(`${property.sqft.toLocaleString()} sqft`);

    const priceFormatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(property.price));

    const detailStr = detailParts.length > 0 ? ` (${detailParts.join(", ")})` : "";

    const lamMessage = `Create a Facebook ad campaign to promote my listing at ${property.address} in ${location}. ${priceFormatted}${detailStr}. Daily budget $${dailyBudget}. Use listing_focus=true, target_city="${property.city}", channel="meta".`;

    console.log("[PROMOTE] Triggering LAM for property:", propertyId, lamMessage);

    // Run LAM
    const result = await runLam({
      message: lamMessage,
      user_id: user.id,
      dry_run: false,
    });

    const requiresApproval =
      result.execution_result?.actions_pending_approval &&
      result.execution_result.actions_pending_approval > 0;

    return NextResponse.json({
      success: true,
      run_id: result.run_id,
      requires_approval: requiresApproval,
      plan_summary: result.plan.user_summary,
      execution_summary: result.execution_result?.user_summary || null,
      response_message: result.response.message,
    });
  } catch (error) {
    console.error("[PROMOTE] Error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
