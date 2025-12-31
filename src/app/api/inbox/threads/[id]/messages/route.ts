import { NextRequest, NextResponse } from "next/server";
import { createOutboundMessage, type MessageChannel } from "@/lib/db/inbox";
import { getUser } from "@/lib/supabase/auth";
import { sendGmailEmail, getDefaultEmailAccount } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: threadId } = await params;
    const body = await request.json();
    const { channel, to, subject, body: messageBody } = body as {
      channel: MessageChannel;
      to: string;
      subject?: string;
      body: string;
    };

    if (!channel || !to || !messageBody) {
      return NextResponse.json(
        { error: "Missing required fields: channel, to, body" },
        { status: 400 }
      );
    }

    let providerMessageId: string | undefined;
    let fromAddress = "unknown";

    if (channel === "email") {
      const emailAccount = await getDefaultEmailAccount(user.id);
      if (!emailAccount) {
        return NextResponse.json(
          { error: "No email account connected" },
          { status: 400 }
        );
      }

      const result = await sendGmailEmail({
        emailAccountId: emailAccount.id,
        to,
        subject: subject || "(No subject)",
        body: messageBody,
      });

      providerMessageId = result.messageId || undefined;
      fromAddress = emailAccount.email;
    } else if (channel === "sms") {
      return NextResponse.json(
        { error: "SMS sending is not yet available" },
        { status: 400 }
      );
    }

    // Create the message record
    const message = await createOutboundMessage({
      threadId,
      channel,
      toAddress: to,
      fromAddress,
      subject,
      bodyText: messageBody,
      bodyHtml: `<p>${messageBody.replace(/\n/g, "<br>")}</p>`,
      providerMessageId,
      metadata: { provider: channel === "email" ? "gmail" : undefined },
    });

    // Create activity if thread is linked to a contact
    const thread = await prisma.inboxThread.findUnique({
      where: { id: threadId },
      select: { contactId: true },
    });

    if (thread?.contactId) {
      await prisma.activity.create({
        data: {
          userId: user.id,
          type: channel,
          title: channel === "email" ? `Sent: ${subject || "(No subject)"}` : "Sent SMS",
          description: messageBody.substring(0, 500),
          metadata: JSON.stringify({
            to,
            from: fromAddress,
            messageId: providerMessageId,
            threadId,
          }),
          contactId: thread.contactId,
        },
      });
    }

    return NextResponse.json({ success: true, messageId: message.id });
  } catch (error) {
    console.error("Failed to send message:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

