import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * AMD (Answering Machine Detection) callback.
 * If voicemail detected, leave a message and hang up.
 * If human detected, let the TwiML conversation continue.
 */
export async function POST(request: NextRequest) {
  try {
    const callId = request.nextUrl.searchParams.get("callId");
    const formData = await request.formData();
    const answeredBy = formData.get("AnsweredBy") as string; // human, machine_start, machine_end_beep, machine_end_silence, machine_end_other, fax, unknown
    const callSid = formData.get("CallSid") as string;

    // Update call with AMD result
    if (callId) {
      await prisma.call.update({
        where: { id: callId },
        data: { amdResult: answeredBy },
      });
    }

    const isMachine = answeredBy?.startsWith("machine_");

    if (isMachine) {
      // Fetch contact name for personalized voicemail
      let contactName = "there";
      if (callId) {
        const call = await prisma.call.findUnique({
          where: { id: callId },
          include: { contact: { select: { name: true } } },
        });
        if (call?.contact?.name) {
          contactName = call.contact.name.split(" ")[0];
        }
      }

      // Leave a voicemail and hang up
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.colony.so";
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Hi ${escapeXml(contactName)}, this is Tara from Colony Real Estate. I was calling to chat about your real estate goals. When you get a chance, please give us a call back. We'd love to help you find the perfect property. Have a wonderful day!</Say>
  <Hangup/>
</Response>`;

      // Update outcome to voicemail
      if (callId) {
        await prisma.call.update({
          where: { id: callId },
          data: { outcome: "left_voicemail" },
        });
      }

      // Modify the live call with new TwiML
      if (callSid) {
        const Twilio = (await import("twilio")).default;
        const client = Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
        await client.calls(callSid).update({ twiml });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Voice AI AMD callback error:", error);
    return NextResponse.json({ ok: true });
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
