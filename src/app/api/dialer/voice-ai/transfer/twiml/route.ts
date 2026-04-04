import { NextRequest, NextResponse } from "next/server";

/**
 * Returns TwiML that puts the contact into a conference room for transfer.
 * Twilio redirects the contact's call leg to this endpoint.
 */
export async function POST(request: NextRequest) {
  const callId = request.nextUrl.searchParams.get("callId") || "";
  const conferenceName = `transfer-${callId}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please hold while I connect you with your agent.</Say>
  <Dial>
    <Conference waitUrl="" startConferenceOnEnter="true" endConferenceOnExit="true">${escapeXml(conferenceName)}</Conference>
  </Dial>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}

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
