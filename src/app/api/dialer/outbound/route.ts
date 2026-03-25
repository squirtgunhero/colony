import { NextRequest, NextResponse } from "next/server";
import { outboundCallTwiml } from "@/lib/twilio-voice";

/**
 * TwiML webhook — Twilio POSTs here when the browser SDK initiates an outbound call.
 * Returns TwiML that dials the target number.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const toNumber = formData.get("To") as string;

    if (!toNumber) {
      return new NextResponse("<Response><Say>No number provided</Say></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get("host")}`;
    const statusCallbackUrl = `${baseUrl}/api/dialer/status`;

    const twiml = outboundCallTwiml(toNumber, statusCallbackUrl);
    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch {
    return new NextResponse("<Response><Say>An error occurred</Say></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
