// ============================================
// GOOGLE ADS SYNC API
// POST /api/google-ads/sync - Trigger manual sync
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import {
  syncGoogleAdAccount,
  syncAllUserGoogleAccounts,
} from "@/lib/google-ads/sync";

/**
 * POST /api/google-ads/sync
 * Trigger sync for one account or all accounts
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => ({}));
    const { accountId } = body as { accountId?: string };

    if (accountId) {
      // Sync a specific account
      const result = await syncGoogleAdAccount(accountId);
      return NextResponse.json({ results: [result] });
    } else {
      // Sync all user accounts
      const results = await syncAllUserGoogleAccounts(userId);
      return NextResponse.json({ results });
    }
  } catch (error) {
    console.error("Error syncing Google Ads:", error);
    return NextResponse.json(
      { error: "Failed to sync Google Ads data" },
      { status: 500 }
    );
  }
}
