import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { getDocuSignAuthUrl } from "@/lib/docusign";

export async function GET() {
  const userId = await requireUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authUrl = getDocuSignAuthUrl(userId);
  return NextResponse.redirect(authUrl);
}
