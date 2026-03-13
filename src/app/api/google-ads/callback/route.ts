// ============================================
// GOOGLE ADS OAUTH CALLBACK
// GET /api/google-ads/callback - Handle Google OAuth callback
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { GoogleAdsApi } from "google-ads-api";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const redirectBase = `${process.env.NEXT_PUBLIC_APP_URL}/honeycomb/settings`;

  if (error) {
    console.error("Google Ads OAuth error:", error);
    return NextResponse.redirect(`${redirectBase}?error=google_oauth_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?error=missing_params`);
  }

  try {
    // Verify state parameter
    const cookieStore = await cookies();
    const storedState = cookieStore.get("google_ads_oauth_state")?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${redirectBase}?error=invalid_state`);
    }

    const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    const userId = stateData.userId as string;

    if (!userId) {
      return NextResponse.redirect(`${redirectBase}?error=invalid_state`);
    }

    const clientId = process.env.GOOGLE_ADS_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET!;
    const redirectUri =
      process.env.GOOGLE_ADS_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/google-ads/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.refresh_token) {
      console.error("Google token exchange failed:", tokenData);
      return NextResponse.redirect(`${redirectBase}?error=token_exchange_failed`);
    }

    const refreshToken = tokenData.refresh_token as string;

    // Use google-ads-api to list accessible customer accounts
    const googleAdsApi = new GoogleAdsApi({
      client_id: clientId,
      client_secret: clientSecret,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    // List accessible customers (listAccessibleCustomers is on the client, not Customer)
    const accessibleCustomers = await googleAdsApi.listAccessibleCustomers(refreshToken);
    const customerResourceNames = accessibleCustomers.resource_names || [];

    let accountCount = 0;

    for (const resourceName of customerResourceNames) {
      // Extract customer ID from resource name (format: customers/1234567890)
      const customerId = resourceName.replace("customers/", "");

      // Try to get the customer's descriptive name
      let descriptiveName: string | null = null;
      try {
        const customerClient = googleAdsApi.Customer({
          customer_id: customerId,
          login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
          refresh_token: refreshToken,
        });

        const [result] = await customerClient.query(`
          SELECT customer.descriptive_name, customer.id
          FROM customer
          LIMIT 1
        `);
        descriptiveName = (result?.customer?.descriptive_name as string) || null;
      } catch {
        // Some accounts may not be queryable (e.g., manager accounts)
        // Still store the account with just the ID
      }

      await prisma.googleAdAccount.upsert({
        where: {
          userId_customerId: { userId, customerId },
        },
        create: {
          userId,
          customerId,
          descriptiveName,
          refreshToken,
          isActive: true,
        },
        update: {
          descriptiveName,
          refreshToken,
          isActive: true,
        },
      });

      accountCount++;
    }

    // Clear the OAuth state cookie
    cookieStore.delete("google_ads_oauth_state");

    // Redirect to chat page with google_connected flag so Tara can greet the user
    const chatUrl = `${process.env.NEXT_PUBLIC_APP_URL}/chat?google_connected=true&accounts=${accountCount}`;
    return NextResponse.redirect(chatUrl);
  } catch (error) {
    console.error("Google Ads OAuth callback error:", error);
    return NextResponse.redirect(`${redirectBase}?error=google_connection_failed`);
  }
}
