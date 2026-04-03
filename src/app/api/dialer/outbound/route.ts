import { NextRequest, NextResponse } from "next/server";
import { outboundCallTwiml } from "@/lib/twilio-voice";

/**
 * TwiML endpoint called by Twilio when a browser call connects.
 * This is NOT called directly by the client — Twilio invokes it.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const to = formData.get("To") as string;
  const callerId = formData.get("From") as string || process.env.TWILIO_PHONE_NUMBER!;
  const callSid = formData.get("CallSid") as string;

  if (!to) {
    const VoiceResponse = (await import("twilio")).default.twiml.VoiceResponse;
    const response = new VoiceResponse();
    response.say("No destination number provided.");
    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const twiml = outboundCallTwiml({
    to,
    callerId: callerId || process.env.TWILIO_PHONE_NUMBER!,
    callSid,
  });

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
