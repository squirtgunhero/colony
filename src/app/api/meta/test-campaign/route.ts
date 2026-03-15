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

  // Test 1: Minimal campaign (no HOUSING) via form-encoded
  try {
    const body1 = new URLSearchParams();
    body1.set("access_token", metaAccount.accessToken);
    body1.set("name", "Test Minimal - DELETE ME");
    body1.set("objective", "OUTCOME_LEADS");
    body1.set("status", "PAUSED");
    body1.set("special_ad_categories", JSON.stringify([]));

    const res1 = await fetch(baseUrl, {
      method: "POST",
      body: body1,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data1 = await res1.json();
    results.test1_minimal_form = { ok: res1.ok, status: res1.status, data: data1 };
  } catch (err) {
    results.test1_minimal_form = { error: String(err) };
  }

  // Test 2: HOUSING campaign via form-encoded
  try {
    const body2 = new URLSearchParams();
    body2.set("access_token", metaAccount.accessToken);
    body2.set("name", "Test Housing Form - DELETE ME");
    body2.set("objective", "OUTCOME_LEADS");
    body2.set("status", "PAUSED");
    body2.set("special_ad_categories", JSON.stringify(["HOUSING"]));
    body2.set("special_ad_category_country", JSON.stringify(["US"]));

    const res2 = await fetch(baseUrl, {
      method: "POST",
      body: body2,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data2 = await res2.json();
    results.test2_housing_form = { ok: res2.ok, status: res2.status, data: data2 };
  } catch (err) {
    results.test2_housing_form = { error: String(err) };
  }

  // Test 3: HOUSING campaign via JSON body
  try {
    const jsonUrl = `${baseUrl}?access_token=${metaAccount.accessToken}`;
    const res3 = await fetch(jsonUrl, {
      method: "POST",
      body: JSON.stringify({
        name: "Test Housing JSON - DELETE ME",
        objective: "OUTCOME_LEADS",
        status: "PAUSED",
        special_ad_categories: ["HOUSING"],
        special_ad_category_country: ["US"],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const data3 = await res3.json();
    results.test3_housing_json = { ok: res3.ok, status: res3.status, data: data3 };
  } catch (err) {
    results.test3_housing_json = { error: String(err) };
  }

  return NextResponse.json(results, { status: 200 });
}
