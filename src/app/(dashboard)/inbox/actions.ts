"use server";

import { revalidatePath } from "next/cache";
import {
  getInboxThreads,
  getThreadDetail,
  getUnreadCount,
  markThreadAsRead,
  markThreadAsUnread,
  assignThread,
  archiveThread,
  unarchiveThread,
  snoozeThread,
  unsnoozeThread,
  createOutboundMessage,
  addInternalNote,
  findOrCreateThread,
  createInboundMessage,
  type ThreadFilters,
  type MessageChannel,
} from "@/lib/db/inbox";
import { requireUserId } from "@/lib/supabase/auth";
import { sendGmailEmail, getDefaultEmailAccount } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

// ============================================================================
// THREAD LIST ACTIONS
// ============================================================================

export async function fetchInboxThreads(
  filters: ThreadFilters = {},
  cursor?: string
) {
  try {
    const result = await getInboxThreads(filters, cursor);
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to fetch inbox threads:", error);
    return { success: false, error: "Failed to fetch threads" };
  }
}

export async function fetchThreadDetail(threadId: string) {
  try {
    const thread = await getThreadDetail(threadId);
    if (!thread) {
      return { success: false, error: "Thread not found" };
    }
    return { success: true, data: thread };
  } catch (error) {
    console.error("Failed to fetch thread detail:", error);
    return { success: false, error: "Failed to fetch thread" };
  }
}

export async function fetchUnreadCount() {
  try {
    const count = await getUnreadCount();
    return { success: true, count };
  } catch (error) {
    console.error("Failed to fetch unread count:", error);
    return { success: false, count: 0 };
  }
}

// ============================================================================
// THREAD ACTIONS
// ============================================================================

export async function markAsRead(threadId: string) {
  try {
    await markThreadAsRead(threadId);
    revalidatePath("/inbox");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark as read:", error);
    return { success: false, error: "Failed to mark as read" };
  }
}

export async function markAsUnread(threadId: string) {
  try {
    await markThreadAsUnread(threadId);
    revalidatePath("/inbox");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark as unread:", error);
    return { success: false, error: "Failed to mark as unread" };
  }
}

export async function assignThreadToUser(threadId: string, userId: string | null) {
  try {
    await assignThread(threadId, userId);
    revalidatePath("/inbox");
    return { success: true };
  } catch (error) {
    console.error("Failed to assign thread:", error);
    return { success: false, error: "Failed to assign thread" };
  }
}

export async function archiveInboxThread(threadId: string) {
  try {
    await archiveThread(threadId);
    revalidatePath("/inbox");
    return { success: true };
  } catch (error) {
    console.error("Failed to archive thread:", error);
    return { success: false, error: "Failed to archive thread" };
  }
}

export async function unarchiveInboxThread(threadId: string) {
  try {
    await unarchiveThread(threadId);
    revalidatePath("/inbox");
    return { success: true };
  } catch (error) {
    console.error("Failed to unarchive thread:", error);
    return { success: false, error: "Failed to unarchive thread" };
  }
}

export async function snoozeInboxThread(threadId: string, until: Date) {
  try {
    await snoozeThread(threadId, until);
    revalidatePath("/inbox");
    return { success: true };
  } catch (error) {
    console.error("Failed to snooze thread:", error);
    return { success: false, error: "Failed to snooze thread" };
  }
}

export async function unsnoozeInboxThread(threadId: string) {
  try {
    await unsnoozeThread(threadId);
    revalidatePath("/inbox");
    return { success: true };
  } catch (error) {
    console.error("Failed to unsnooze thread:", error);
    return { success: false, error: "Failed to unsnooze thread" };
  }
}

// ============================================================================
// MESSAGE ACTIONS
// ============================================================================

export async function sendInboxMessage(data: {
  threadId: string;
  channel: MessageChannel;
  to: string;
  subject?: string;
  body: string;
}) {
  const userId = await requireUserId();

  try {
    // Get user's email account
    const emailAccount = await getDefaultEmailAccount(userId);
    if (!emailAccount && data.channel === "email") {
      return {
        success: false,
        error: "No email account connected. Please connect your Gmail in Settings.",
      };
    }

    let providerMessageId: string | undefined;
    let fromAddress = emailAccount?.email || "unknown";

    if (data.channel === "email" && emailAccount) {
      // Send via Gmail
      const result = await sendGmailEmail({
        emailAccountId: emailAccount.id,
        to: data.to,
        subject: data.subject || "(No subject)",
        body: data.body,
      });
      providerMessageId = result.messageId || undefined;
    } else if (data.channel === "sms") {
      const { sendSMS } = await import("@/lib/twilio");
      const result = await sendSMS(data.to, data.body);
      providerMessageId = result.sid;
      fromAddress = process.env.TWILIO_PHONE_NUMBER || "colony";

      // Also record in SMSMessage table
      await prisma.sMSMessage.create({
        data: {
          profileId: userId,
          direction: "outbound",
          from: fromAddress,
          to: data.to,
          body: data.body,
          twilioSid: result.sid,
          status: "sent",
        },
      });
    }

    // Create message record
    await createOutboundMessage({
      threadId: data.threadId,
      channel: data.channel,
      toAddress: data.to,
      fromAddress,
      subject: data.subject,
      bodyText: data.body,
      bodyHtml: `<p>${data.body.replace(/\n/g, "<br>")}</p>`,
      providerMessageId,
      metadata: {
        provider: data.channel === "email" ? "gmail" : undefined,
      },
    });

    // Also create activity for contact (if linked)
    const thread = await prisma.inboxThread.findUnique({
      where: { id: data.threadId },
      select: { contactId: true },
    });

    if (thread?.contactId) {
      await prisma.activity.create({
        data: {
          userId,
          type: data.channel,
          title: data.channel === "email" ? `Sent: ${data.subject || "(No subject)"}` : "Sent SMS",
          description: data.body.substring(0, 500),
          metadata: JSON.stringify({
            to: data.to,
            from: fromAddress,
            messageId: providerMessageId,
            threadId: data.threadId,
          }),
          contactId: thread.contactId,
        },
      });
    }

    revalidatePath("/inbox");
    revalidatePath(`/inbox/${data.threadId}`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Failed to send message:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send message";
    return { success: false, error: errorMessage };
  }
}

export async function addNote(threadId: string, noteText: string) {
  try {
    await addInternalNote(threadId, noteText);
    revalidatePath("/inbox");
    revalidatePath(`/inbox/${threadId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to add note:", error);
    return { success: false, error: "Failed to add note" };
  }
}

// ============================================================================
// THREAD CREATION (for starting new conversations)
// ============================================================================

export async function startNewThread(data: {
  channel: MessageChannel;
  to: string;
  subject?: string;
  body: string;
  contactId?: string;
}) {
  const userId = await requireUserId();

  try {
    // Find or create thread
    const { threadId, isNew } = await findOrCreateThread({
      channel: data.channel,
      address: data.to,
      direction: "outbound",
      userId,
    });

    // If we have a contact ID and this is a new thread, link them
    if (data.contactId && isNew) {
      await prisma.inboxThread.update({
        where: { id: threadId },
        data: { contactId: data.contactId },
      });
    }

    // Send the message
    const result = await sendInboxMessage({
      threadId,
      channel: data.channel,
      to: data.to,
      subject: data.subject,
      body: data.body,
    });

    if (!result.success) {
      return result;
    }

    revalidatePath("/inbox");
    return { success: true, threadId };
  } catch (error) {
    console.error("Failed to start new thread:", error);
    return { success: false, error: "Failed to start conversation" };
  }
}

// ============================================================================
// WEBHOOK HANDLER (for inbound messages - Phase 2)
// ============================================================================

export async function handleInboundMessage(data: {
  channel: MessageChannel;
  fromAddress: string;
  toAddress: string;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  providerMessageId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  try {
    // Find or create thread based on sender
    const { threadId } = await findOrCreateThread({
      channel: data.channel,
      address: data.fromAddress,
      direction: "inbound",
    });

    // Create the inbound message
    await createInboundMessage({
      threadId,
      channel: data.channel,
      fromAddress: data.fromAddress,
      toAddress: data.toAddress,
      subject: data.subject,
      bodyText: data.bodyText,
      bodyHtml: data.bodyHtml,
      providerMessageId: data.providerMessageId,
      metadata: data.metadata as Record<string, string | number | boolean | null> | undefined,
    });

    revalidatePath("/inbox");
    return { success: true, threadId };
  } catch (error) {
    console.error("Failed to handle inbound message:", error);
    return { success: false, error: "Failed to process inbound message" };
  }
}

