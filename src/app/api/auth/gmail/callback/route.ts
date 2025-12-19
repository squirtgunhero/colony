import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens, getGmailUserEmail } from "@/lib/gmail";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // This is the userId we passed
  const error = searchParams.get("error");

  // Handle errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings?error=Missing authorization code", request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Failed to get tokens");
    }

    // Get user's email from Google
    const email = await getGmailUserEmail(tokens.access_token);

    if (!email) {
      throw new Error("Failed to get email address");
    }

    // Calculate token expiry
    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date) 
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour

    // Check if this email is already connected for this user
    const existingAccount = await prisma.emailAccount.findFirst({
      where: { userId: state, email },
    });

    if (existingAccount) {
      // Update existing account
      await prisma.emailAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
        },
      });
    } else {
      // Check if user has any email accounts (for isDefault)
      const hasAccounts = await prisma.emailAccount.count({
        where: { userId: state },
      });

      // Create new account
      await prisma.emailAccount.create({
        data: {
          userId: state,
          provider: "gmail",
          email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          isDefault: hasAccounts === 0, // First account is default
        },
      });
    }

    // Redirect back to settings with success
    return NextResponse.redirect(
      new URL("/settings?tab=email&success=Gmail connected successfully", request.url)
    );
  } catch (error) {
    console.error("Gmail OAuth error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=Failed to connect Gmail", request.url)
    );
  }
}

