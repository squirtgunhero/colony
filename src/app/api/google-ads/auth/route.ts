// ============================================
// GOOGLE ADS OAUTH - Initiate Connection
// GET /api/google-ads/auth - Redirect to Google OAuth
// ============================================

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUserId } from "@/lib/supabase/auth";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET() {
  try {
    const userId = await requireUserId();

    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const redirectUri =
      process.env.GOOGLE_ADS_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/google-ads/callback`;

    if (!clientId) {
      throw new Error("GOOGLE_ADS_CLIENT_ID must be set");
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(
      JSON.stringify({ userId, timestamp: Date.now() })
    ).toString("base64url");

    // Store state in cookie for verification
    const cookieStore = await cookies();
    cookieStore.set("google_ads_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/adwords",
      access_type: "offline", // Request refresh token
      prompt: "consent", // Force consent to always get refresh token
      state,
    });

    return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`);
  } catch (error) {
    console.error("Google Ads OAuth init error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=google_auth_failed`
    );
  }
}
