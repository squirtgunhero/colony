// ============================================
// META ADS OAUTH CALLBACK
// GET /api/meta/callback - Handle Facebook OAuth callback
// ============================================

import { NextRequest, NextResponse } from "next/server";
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

  const redirectBase = `${process.env.NEXT_PUBLIC_APP_URL}/settings`;

  // Handle OAuth errors
  if (error) {
    console.error("Meta OAuth error:", error);
    return NextResponse.redirect(`${redirectBase}?error=oauth_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?error=missing_params`);
  }

  try {
    // Verify state parameter (read from request cookies — more reliable than cookies() in route handlers)
    const storedState = request.cookies.get("meta_oauth_state")?.value;

    console.log("[META CALLBACK] State check:", { hasStoredState: !!storedState, statesMatch: storedState === state });

    if (!storedState || storedState !== state) {
      console.error("[META CALLBACK] State mismatch — stored:", storedState?.slice(0, 20), "received:", state?.slice(0, 20));
      return NextResponse.redirect(`${redirectBase}?error=invalid_state`);
    }

    // Parse state to get user ID
    const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    const userId = stateData.userId as string;

    if (!userId) {
      console.error("[META CALLBACK] No userId in state data");
      return NextResponse.redirect(`${redirectBase}?error=invalid_state`);
    }

    console.log("[META CALLBACK] Exchanging code for token, userId:", userId);

    // Exchange code for short-lived token
    const tokenResponse = await exchangeCodeForToken(code);
    console.log("[META CALLBACK] Got short-lived token");

    // Exchange for long-lived token
    const longLivedToken = await getLongLivedToken(tokenResponse.access_token);
    console.log("[META CALLBACK] Got long-lived token, expires_in:", longLivedToken.expires_in);

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + longLivedToken.expires_in);

    // Get user info and ad accounts
    const client = createMetaClient(longLivedToken.access_token);
    const user = await client.getMe();
    console.log("[META CALLBACK] Meta user:", user.id, user.name);

    const adAccountsResponse = await client.getAdAccounts();
    console.log("[META CALLBACK] Found", adAccountsResponse.data?.length ?? 0, "ad accounts");

    if (!adAccountsResponse.data || adAccountsResponse.data.length === 0) {
      console.error("[META CALLBACK] No ad accounts found for this Meta user");
      return NextResponse.redirect(`${redirectBase}?error=no_ad_accounts`);
    }

    // Store ad accounts in database
    for (const account of adAccountsResponse.data) {
      console.log("[META CALLBACK] Upserting ad account:", account.id, account.name);
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

    // Redirect back to settings with success flag
    const accountCount = adAccountsResponse.data.length;
    console.log("[META CALLBACK] Success! Redirecting with", accountCount, "accounts");
    const response = NextResponse.redirect(`${redirectBase}?meta_connected=true&accounts=${accountCount}`);
    // Clear the OAuth state cookie on the response
    response.cookies.delete("meta_oauth_state");
    return response;
  } catch (error: unknown) {
    let msg = error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
    console.error("[META CALLBACK] Error:", msg);
    console.error("[META CALLBACK] Stack:", error instanceof Error ? error.stack : "no stack");
    // For Prisma errors, extract the meaningful part (after the invocation dump)
    if (msg.includes("invocation:")) {
      // Prisma errors show: "Invalid invocation:\n\n{ ...params... }\n\nActual error reason here"
      const parts = msg.split("\n\n");
      // The last part usually has the actual error reason
      msg = parts.length > 1 ? parts[parts.length - 1].trim() : msg;
    }
    const safeMsg = encodeURIComponent(msg.slice(0, 500));
    return NextResponse.redirect(`${redirectBase}?error=${safeMsg}`);
  }
}
