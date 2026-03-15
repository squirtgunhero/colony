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

  const baseUrl = `https://graph.facebook.com/v22.0/${metaAccount.adAccountId}/campaigns`;
  const results: Record<string, unknown> = {
    adAccountId: metaAccount.adAccountId,
    adAccountName: metaAccount.adAccountName,
    tokenExpires: metaAccount.tokenExpiresAt,
  };

  // Test: HOUSING campaign with is_adset_budget_sharing_enabled
  try {
    const jsonUrl = `${baseUrl}?access_token=${metaAccount.accessToken}`;
    const res = await fetch(jsonUrl, {
      method: "POST",
      body: JSON.stringify({
        name: "Test Housing Fixed - DELETE ME",
        objective: "OUTCOME_LEADS",
        status: "PAUSED",
        special_ad_categories: ["HOUSING"],
        special_ad_category_country: ["US"],
        is_adset_budget_sharing_enabled: true,
      }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    results.test_with_budget_sharing = { ok: res.ok, status: res.status, data };
  } catch (err) {
    results.test_with_budget_sharing = { error: String(err) };
  }

  return NextResponse.json(results, { status: 200 });
}
