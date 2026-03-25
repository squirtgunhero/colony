import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { generateVoiceToken } from "@/lib/twilio-voice";

export async function GET() {
  try {
    const userId = await requireUserId();
    const identity = `user_${userId}`;
    const token = generateVoiceToken(identity);
    return NextResponse.json({ token, identity });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
