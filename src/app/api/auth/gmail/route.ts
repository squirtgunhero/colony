import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGmailAuthUrl } from "@/lib/gmail";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authUrl = getGmailAuthUrl(userId);
  
  return NextResponse.redirect(authUrl);
}

