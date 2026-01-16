// ============================================
// META AD ACCOUNTS API
// GET /api/meta/accounts - List connected accounts
// DELETE /api/meta/accounts - Disconnect an account
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

/**
 * GET /api/meta/accounts
 * List all connected Meta ad accounts for the current user
 */
export async function GET() {
  try {
    const userId = await requireUserId();

    const accounts = await prisma.metaAdAccount.findMany({
      where: { userId },
      select: {
        id: true,
        adAccountId: true,
        adAccountName: true,
        currency: true,
        timezone: true,
        status: true,
        lastSyncedAt: true,
        createdAt: true,
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
    console.error("Error fetching Meta accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meta/accounts
 * Disconnect a Meta ad account
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
    const account = await prisma.metaAdAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Delete the account (cascades to campaigns, ad sets, ads, insights)
    await prisma.metaAdAccount.delete({
      where: { id: accountId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Meta account:", error);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 }
    );
  }
}
