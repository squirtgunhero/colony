import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateVoiceToken } from "@/lib/twilio-voice";

async function handleTokenRequest() {
  // Check Twilio env vars are configured
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_API_KEY_SID ||
    !process.env.TWILIO_API_KEY_SECRET ||
    !process.env.TWILIO_TWIML_APP_SID
  ) {
    return NextResponse.json(
      { error: "Twilio not configured" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = generateVoiceToken(user.id);
    return NextResponse.json({ token });
  } catch (error) {
    console.error("Failed to generate voice token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return handleTokenRequest();
}

export async function POST() {
  return handleTokenRequest();
}
