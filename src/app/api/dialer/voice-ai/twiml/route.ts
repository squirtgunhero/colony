import { NextRequest, NextResponse } from "next/server";

/**
 * TwiML webhook — Twilio hits this when the call connects.
 * Returns TwiML that greets the contact and starts gathering speech.
 */
export async function POST(request: NextRequest) {
  const callId = request.nextUrl.searchParams.get("callId") || "";
  const contactName = decodeURIComponent(request.nextUrl.searchParams.get("contactName") || "there");
  const objective = request.nextUrl.searchParams.get("objective") || "qualify";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.colony.so";

  const firstName = contactName.split(" ")[0];

  // Build opening based on objective
  let greeting: string;
  switch (objective) {
    case "appointment":
      greeting = `Hi ${firstName}, this is Tara calling from Colony Real Estate. I'm reaching out because we noticed you were looking at some properties and I'd love to help schedule a time for you to see them in person. Do you have a moment to chat?`;
      break;
    case "followup":
      greeting = `Hi ${firstName}, this is Tara from Colony Real Estate following up on our earlier conversation. I wanted to check in and see if you had any questions or if there's anything I can help you with?`;
      break;
    default: // qualify
      greeting = `Hi ${firstName}, this is Tara calling from Colony Real Estate. I understand you might be interested in buying or selling property. I'd love to learn more about what you're looking for. Do you have a quick moment?`;
      break;
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${baseUrl}/api/dialer/voice-ai/respond?callId=${callId}&amp;contactName=${encodeURIComponent(contactName)}&amp;objective=${objective}&amp;turn=1" method="POST">
    <Say voice="Polly.Joanna">${escapeXml(greeting)}</Say>
  </Gather>
  <Say voice="Polly.Joanna">It seems like you might be busy. No worries, we'll try again another time. Have a great day!</Say>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}

// Also handle GET for Twilio
export async function GET(request: NextRequest) {
  return POST(request);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
