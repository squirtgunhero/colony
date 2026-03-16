// ============================================
// META ADS OAUTH - Initiate Connection
// GET /api/meta/auth - Redirect to Facebook OAuth
// ============================================

import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/meta/client";
import { requireUserId } from "@/lib/supabase/auth";

export async function GET() {
  try {
    // Ensure user is authenticated
    const userId = await requireUserId();

    // Generate state parameter for CSRF protection
    const state = Buffer.from(
      JSON.stringify({ userId, timestamp: Date.now() })
    ).toString("base64url");

    // Redirect to Facebook OAuth
    const authUrl = getAuthorizationUrl(state);
    const response = NextResponse.redirect(authUrl);

    // Set cookie directly on the redirect response (cookies() + redirect can lose cookies)
    response.cookies.set("meta_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Meta OAuth init error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=auth_failed`
    );
  }
}
