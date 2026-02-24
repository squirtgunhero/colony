import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { twilioClient } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phoneNumber } = await request.json();

  if (!phoneNumber || typeof phoneNumber !== "string") {
    return NextResponse.json(
      { error: "Phone number is required" },
      { status: 400 }
    );
  }

  // Normalize to E.164
  const normalized = phoneNumber.startsWith("+")
    ? phoneNumber.replace(/\s/g, "")
    : `+1${phoneNumber.replace(/\D/g, "")}`;

  try {
    const verifySid = process.env.TWILIO_VERIFY_SID;

    if (verifySid) {
      await twilioClient.verify.v2
        .services(verifySid)
        .verifications.create({ to: normalized, channel: "sms" });
    } else {
      // Fallback: send a simple code via SMS
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      // Store in a temporary way (cookie-based for simplicity)
      const response = NextResponse.json({ sent: true, fallback: true });
      response.cookies.set("onboarding_code", code, {
        httpOnly: true,
        secure: true,
        maxAge: 300,
        path: "/",
      });
      response.cookies.set("onboarding_phone", normalized, {
        httpOnly: true,
        secure: true,
        maxAge: 300,
        path: "/",
      });

      const { sendSMS } = await import("@/lib/twilio");
      await sendSMS(
        normalized,
        `Your Colony verification code is: ${code}`
      );
      return response;
    }

    return NextResponse.json({ sent: true });
  } catch (error: unknown) {
    console.error("Failed to send verification code:", error);
    return NextResponse.json(
      { error: "Failed to send code. Please try again later." },
      { status: 500 }
    );
  }
}
