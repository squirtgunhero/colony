// ============================================
// META ADS SYNC API
// POST /api/meta/sync - Trigger sync for connected accounts
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { syncMetaAdAccount, syncAllUserMetaAccounts } from "@/lib/meta/sync";

/**
 * POST /api/meta/sync
 * Trigger a sync for one or all connected Meta ad accounts
 * Body: { accountId?: string } - If not provided, syncs all accounts
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => ({}));
    const { accountId } = body as { accountId?: string };

    if (accountId) {
      // Sync specific account
      const account = await prisma.metaAdAccount.findFirst({
        where: { id: accountId, userId },
      });

      if (!account) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 }
        );
      }

      const result = await syncMetaAdAccount(accountId);
      return NextResponse.json({ results: [result] });
    } else {
      // Sync all accounts
      const results = await syncAllUserMetaAccounts(userId);
      return NextResponse.json({ results });
    }
  } catch (error) {
    console.error("Error syncing Meta accounts:", error);
    return NextResponse.json(
      { error: "Failed to sync accounts" },
      { status: 500 }
    );
  }
}
