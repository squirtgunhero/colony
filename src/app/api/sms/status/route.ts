import { NextRequest } from "next/server";
import { validateRequest } from "twilio/lib/webhooks/webhooks";
import { prisma } from "@/lib/prisma";

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  const signature = request.headers.get("x-twilio-signature") ?? "";
  const url = request.url;

  if (!validateRequest(TWILIO_AUTH_TOKEN, signature, url, params)) {
    return new Response("Forbidden", { status: 403 });
  }

  const messageSid = params.MessageSid;
  const messageStatus = params.MessageStatus;

  if (!messageSid || !messageStatus) {
    return new Response(null, { status: 200 });
  }

  const statusMap: Record<string, string> = {
    sent: "sent",
    delivered: "delivered",
    undelivered: "failed",
    failed: "failed",
  };

  const normalized = statusMap[messageStatus];
  if (!normalized) {
    return new Response(null, { status: 200 });
  }

  try {
    await prisma.sMSMessage.updateMany({
      where: { twilioSid: messageSid },
      data: { status: normalized },
    });
  } catch (error) {
    console.error("SMS status update error:", error);
  }

  return new Response(null, { status: 200 });
}
