import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { syncEmail } from "@/lib/sync/email-sync";

export async function POST() {
  try {
    const userId = await requireUserId();
    const result = await syncEmail(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Email Sync API]", error);
    const message = error instanceof Error ? error.message : "Failed to sync email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
