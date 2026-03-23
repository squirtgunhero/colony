import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeDocuSignCode, getDocuSignUserInfo } from "@/lib/docusign";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // userId
  const error = searchParams.get("error");

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
    const tokens = await exchangeDocuSignCode(code);
    const userInfo = await getDocuSignUserInfo(tokens.access_token);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Upsert DocuSign account
    await prisma.docuSignAccount.upsert({
      where: {
        userId_accountId: {
          userId: state,
          accountId: userInfo.accountId,
        },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        baseUri: userInfo.baseUri,
        email: userInfo.email,
      },
      create: {
        userId: state,
        accountId: userInfo.accountId,
        baseUri: userInfo.baseUri,
        email: userInfo.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      },
    });

    return NextResponse.redirect(
      new URL("/settings?tab=integrations&success=DocuSign connected successfully", request.url)
    );
  } catch (error) {
    console.error("DocuSign OAuth error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=Failed to connect DocuSign", request.url)
    );
  }
}
