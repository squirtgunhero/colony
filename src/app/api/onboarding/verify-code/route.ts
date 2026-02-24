import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const { phoneNumber, code } = await request.json();

  if (!phoneNumber || !code) {
    return NextResponse.json(
      { error: "Phone number and code are required" },
      { status: 400 }
    );
  }

  const normalized = phoneNumber.startsWith("+")
    ? phoneNumber.replace(/\s/g, "")
    : `+1${phoneNumber.replace(/\D/g, "")}`;

  try {
    const verifySid = process.env.TWILIO_VERIFY_SID;
    let verified = false;

    if (verifySid) {
      const check = await twilioClient.verify.v2
        .services(verifySid)
        .verificationChecks.create({ to: normalized, code });
      verified = check.status === "approved";
    } else {
      // Fallback: check against cookie
      const storedCode = request.cookies.get("onboarding_code")?.value;
      const storedPhone = request.cookies.get("onboarding_phone")?.value;
      verified = storedCode === code && storedPhone === normalized;
    }

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Upsert UserPhone record
    await prisma.userPhone.upsert({
      where: { profileId: user.id },
      create: {
        profileId: user.id,
        phoneNumber: normalized,
        verified: true,
        autopilotEnabled: true,
      },
      update: {
        phoneNumber: normalized,
        verified: true,
        autopilotEnabled: true,
      },
    });

    const response = NextResponse.json({ verified: true });
    // Clear fallback cookies
    response.cookies.delete("onboarding_code");
    response.cookies.delete("onboarding_phone");
    return response;
  } catch (error: unknown) {
    console.error("Verification failed:", error);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
