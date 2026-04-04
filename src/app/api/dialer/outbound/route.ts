import { NextRequest, NextResponse } from "next/server";
import { outboundCallTwiml } from "@/lib/twilio-voice";
import { prisma } from "@/lib/prisma";

/**
 * TwiML endpoint called by Twilio when a browser call connects.
 * This is NOT called directly by the client — Twilio invokes it.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const to = formData.get("To") as string;
  const callerId = formData.get("From") as string || process.env.TWILIO_PHONE_NUMBER!;
  const callSid = formData.get("CallSid") as string;
  // Twilio sends the Device identity as "Caller" (e.g. "client:user-uuid")
  const caller = formData.get("Caller") as string;
  const contactId = formData.get("ContactId") as string;

  if (!to) {
    const VoiceResponse = (await import("twilio")).default.twiml.VoiceResponse;
    const response = new VoiceResponse();
    response.say("No destination number provided.");
    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // Handle transfer: agent joining a conference room
  if (to.startsWith("conference:")) {
    const conferenceName = to.replace("conference:", "");
    const VoiceResponse = (await import("twilio")).default.twiml.VoiceResponse;
    const response = new VoiceResponse();
    const dial = response.dial();
    dial.conference(
      {
        startConferenceOnEnter: true,
        endConferenceOnExit: true,
        waitUrl: "",
      },
      conferenceName
    );
    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // Create CallRecording entry with the real Twilio CallSid
  // The userId comes from the Device identity (Caller = "client:<userId>")
  if (callSid && caller) {
    const userId = caller.replace(/^client:/, "");
    try {
      await prisma.callRecording.create({
        data: {
          userId,
          contactId: contactId || null,
          callSid,
          direction: "outbound",
          fromNumber: callerId || process.env.TWILIO_PHONE_NUMBER || "",
          toNumber: to,
          status: "in-progress",
        },
      });

      // Create an activity so the call shows in the timeline immediately
      if (contactId) {
        await prisma.activity.create({
          data: {
            userId,
            contactId,
            type: "call",
            title: `Outbound call to ${to}`,
            description: "Call placed via Colony dialer",
          },
        });
      }
    } catch (err) {
      // Log but don't fail the TwiML response — call should still go through
      console.error("Failed to create call recording entry:", err);
    }
  }

  const twiml = outboundCallTwiml({
    to,
    callerId: callerId || process.env.TWILIO_PHONE_NUMBER!,
    callSid,
  });

  console.log("[Outbound] TwiML generated for CallSid:", callSid, "Caller:", caller, "To:", to);
  console.log("[Outbound] TwiML:", twiml);

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
