import { NextResponse } from "next/server";
import { getUserId } from "@/lib/supabase/auth";
import { getGmailAuthUrl } from "@/lib/gmail";

export async function GET() {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authUrl = getGmailAuthUrl(userId);
  
  return NextResponse.redirect(authUrl);
}
