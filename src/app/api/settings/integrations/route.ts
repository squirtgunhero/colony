// ============================================
// INTEGRATIONS API
// GET /api/settings/integrations - Get connected ad accounts
// DELETE /api/settings/integrations - Disconnect an ad account
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

export async function GET() {
  try {
    const userId = await requireUserId();

    const metaAccount = await prisma.metaAdAccount.findFirst({
      where: { userId, status: "active" },
      select: {
        adAccountName: true,
        status: true,
        tokenExpiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const googleAccount = await prisma.googleAdAccount.findFirst({
      where: { userId, isActive: true },
      select: {
        descriptiveName: true,
        customerId: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const docuSignAccount = await prisma.docuSignAccount.findFirst({
      where: { userId },
      select: {
        email: true,
        accountId: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      meta: metaAccount
        ? {
            connected: true,
            accountName: metaAccount.adAccountName || "Facebook Ads",
            status:
              metaAccount.tokenExpiresAt &&
              metaAccount.tokenExpiresAt < new Date()
                ? "expired"
                : metaAccount.status,
            expiresAt: metaAccount.tokenExpiresAt?.toISOString() ?? null,
          }
        : { connected: false },
      google: googleAccount
        ? {
            connected: true,
            accountName:
              googleAccount.descriptiveName || "Google Ads",
            customerId: googleAccount.customerId,
          }
        : { connected: false },
      docusign: docuSignAccount
        ? {
            connected: true,
            email: docuSignAccount.email,
            accountId: docuSignAccount.accountId,
            status:
              docuSignAccount.expiresAt < new Date()
                ? "expired"
                : "active",
          }
        : { connected: false },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { provider } = await request.json();

    if (provider === "meta") {
      await prisma.metaAdAccount.deleteMany({ where: { userId } });
    } else if (provider === "google") {
      await prisma.googleAdAccount.deleteMany({ where: { userId } });
    } else if (provider === "docusign") {
      await prisma.docuSignAccount.deleteMany({ where: { userId } });
    } else {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
