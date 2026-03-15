import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Get Meta account
  const metaAccount = await prisma.metaAdAccount.findFirst({
    where: { userId: user.id, status: "active" },
  });

  if (!metaAccount) {
    return NextResponse.json({ error: "No Meta account connected" });
  }

  // Try creating a test campaign directly
  const url = `https://graph.facebook.com/v21.0/${metaAccount.adAccountId}/campaigns`;

  const body = new URLSearchParams();
  body.set("access_token", metaAccount.accessToken);
  body.set("name", "Colony Test Campaign - DELETE ME");
  body.set("objective", "OUTCOME_LEADS");
  body.set("status", "PAUSED");
  body.set("buying_type", "AUCTION");
  body.set("special_ad_categories", JSON.stringify(["HOUSING"]));
  body.set("special_ad_category_country", JSON.stringify(["US"]));

  console.log("[TEST] Creating campaign:", {
    adAccountId: metaAccount.adAccountId,
    adAccountName: metaAccount.adAccountName,
    url,
    params: Object.fromEntries(body.entries()),
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const data = await response.json();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      adAccountId: metaAccount.adAccountId,
      adAccountName: metaAccount.adAccountName,
      tokenExpires: metaAccount.tokenExpiresAt,
      response: data,
    });
  } catch (err) {
    return NextResponse.json({
      error: String(err),
      adAccountId: metaAccount.adAccountId,
    });
  }
}
