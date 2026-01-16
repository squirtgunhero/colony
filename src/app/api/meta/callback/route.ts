// ============================================
// META ADS OAUTH CALLBACK
// GET /api/meta/callback - Handle Facebook OAuth callback
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  createMetaClient,
} from "@/lib/meta/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const redirectBase = `${process.env.NEXT_PUBLIC_APP_URL}/honeycomb/settings`;

  // Handle OAuth errors
  if (error) {
    console.error("Meta OAuth error:", error);
    return NextResponse.redirect(`${redirectBase}?error=oauth_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?error=missing_params`);
  }

  try {
    // Verify state parameter
    const cookieStore = await cookies();
    const storedState = cookieStore.get("meta_oauth_state")?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${redirectBase}?error=invalid_state`);
    }

    // Parse state to get user ID
    const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    const userId = stateData.userId as string;

    if (!userId) {
      return NextResponse.redirect(`${redirectBase}?error=invalid_state`);
    }

    // Exchange code for short-lived token
    const tokenResponse = await exchangeCodeForToken(code);

    // Exchange for long-lived token
    const longLivedToken = await getLongLivedToken(tokenResponse.access_token);

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + longLivedToken.expires_in);

    // Get user info and ad accounts
    const client = createMetaClient(longLivedToken.access_token);
    const user = await client.getMe();
    const adAccountsResponse = await client.getAdAccounts();

    // Store ad accounts in database
    for (const account of adAccountsResponse.data) {
      await prisma.metaAdAccount.upsert({
        where: {
          userId_adAccountId: {
            userId,
            adAccountId: account.id,
          },
        },
        create: {
          userId,
          metaUserId: user.id,
          adAccountId: account.id,
          adAccountName: account.name,
          accessToken: longLivedToken.access_token,
          tokenExpiresAt: expiresAt,
          currency: account.currency || "USD",
          timezone: account.timezone_name || "America/New_York",
          status: "active",
        },
        update: {
          metaUserId: user.id,
          adAccountName: account.name,
          accessToken: longLivedToken.access_token,
          tokenExpiresAt: expiresAt,
          currency: account.currency || "USD",
          timezone: account.timezone_name || "America/New_York",
          status: "active",
        },
      });
    }

    // Clear the OAuth state cookie
    cookieStore.delete("meta_oauth_state");

    // Redirect back to settings with success message
    const accountCount = adAccountsResponse.data.length;
    return NextResponse.redirect(
      `${redirectBase}?success=meta_connected&accounts=${accountCount}`
    );
  } catch (error) {
    console.error("Meta OAuth callback error:", error);
    return NextResponse.redirect(`${redirectBase}?error=connection_failed`);
  }
}
