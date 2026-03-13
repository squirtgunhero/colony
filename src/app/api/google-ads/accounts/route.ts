// ============================================
// GOOGLE ADS ACCOUNTS API
// GET /api/google-ads/accounts - List connected accounts
// DELETE /api/google-ads/accounts - Disconnect an account
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

/**
 * GET /api/google-ads/accounts
 * List all connected Google ad accounts for the current user
 */
export async function GET() {
  try {
    const userId = await requireUserId();

    const accounts = await prisma.googleAdAccount.findMany({
      where: { userId },
      select: {
        id: true,
        customerId: true,
        descriptiveName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            campaigns: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Error fetching Google Ads accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/google-ads/accounts
 * Disconnect a Google ad account
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const account = await prisma.googleAdAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Delete the account (cascades to campaigns)
    await prisma.googleAdAccount.delete({
      where: { id: accountId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Google Ads account:", error);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 }
    );
  }
}
