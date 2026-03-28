/**
 * Gmail Inbox Sync
 *
 * Polls Gmail for new messages and routes them into the unified inbox.
 * Supports both incremental sync (via History API) and full bootstrap.
 */

import { google } from "googleapis";
import { prisma } from "./prisma";
import { createOAuth2Client, getValidAccessToken } from "./gmail";
import {
  findOrCreateThread,
  createInboundMessage,
  createOutboundMessageSystem,
} from "./db/inbox";
import * as Sentry from "@sentry/nextjs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedEmail {
  messageId: string; // Gmail message ID
  providerMessageId: string; // RFC Message-ID header
  from: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  date: Date;
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

export async function syncEmailAccount(emailAccountId: string): Promise<number> {
  const account = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
  });

  if (!account) return 0;

  const accessToken = await getValidAccessToken(emailAccountId);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  let messageIds: string[] = [];

  if (account.gmailHistoryId) {
    // Incremental sync via History API
    try {
      const history = await gmail.users.history.list({
        userId: "me",
        startHistoryId: account.gmailHistoryId,
        historyTypes: ["messageAdded"],
        maxResults: 100,
      });

      const added = history.data.history?.flatMap(
        (h) => h.messagesAdded?.map((m) => m.message?.id).filter(Boolean) ?? []
      ) ?? [];
      messageIds = added as string[];

      // Update historyId even if no new messages
      if (history.data.historyId) {
        await prisma.emailAccount.update({
          where: { id: emailAccountId },
          data: { gmailHistoryId: history.data.historyId },
        });
      }
    } catch (error: unknown) {
      // History ID expired or invalid — fall back to full sync
      const statusCode = (error as { code?: number })?.code;
      if (statusCode === 404 || statusCode === 410) {
        messageIds = await bootstrapSync(gmail, account.email);
      } else {
        throw error;
      }
    }
  } else {
    // First sync — bootstrap from last 7 days
    messageIds = await bootstrapSync(gmail, account.email);
  }

  let synced = 0;

  for (const msgId of messageIds) {
    try {
      const parsed = await fetchAndParse(gmail, msgId);
      if (!parsed) continue;

      // Dedup: skip if providerMessageId already exists
      const existing = await prisma.inboxMessage.findFirst({
        where: { providerMessageId: parsed.providerMessageId },
        select: { id: true },
      });
      if (existing) continue;

      // Determine direction
      const isOutbound = parsed.from.toLowerCase().includes(account.email.toLowerCase());
      const counterpartyAddress = isOutbound ? parsed.to : parsed.from;
      // Extract just the email from "Name <email>" format
      const emailMatch = counterpartyAddress.match(/<([^>]+)>/) ?? [null, counterpartyAddress];
      const cleanAddress = (emailMatch[1] ?? counterpartyAddress).trim().toLowerCase();

      if (!cleanAddress || cleanAddress === account.email.toLowerCase()) continue;

      const { threadId } = await findOrCreateThread({
        channel: "email",
        address: cleanAddress,
        direction: isOutbound ? "outbound" : "inbound",
        userId: account.userId,
      });

      if (isOutbound) {
        await createOutboundMessageSystem({
          threadId,
          channel: "email",
          toAddress: parsed.to,
          fromAddress: parsed.from,
          userId: account.userId,
          subject: parsed.subject,
          bodyText: parsed.bodyText,
          bodyHtml: parsed.bodyHtml,
          providerMessageId: parsed.providerMessageId,
          occurredAt: parsed.date,
        });
      } else {
        await createInboundMessage({
          threadId,
          channel: "email",
          fromAddress: parsed.from,
          toAddress: parsed.to,
          subject: parsed.subject,
          bodyText: parsed.bodyText,
          bodyHtml: parsed.bodyHtml,
          providerMessageId: parsed.providerMessageId,
          occurredAt: parsed.date,
        });
      }

      // Create Activity + update lastContactedAt for matched contacts
      const thread = await prisma.inboxThread.findUnique({
        where: { id: threadId },
        select: { contactId: true },
      });

      if (thread?.contactId) {
        await prisma.activity.create({
          data: {
            userId: account.userId,
            type: "email",
            title: isOutbound
              ? `Sent: ${parsed.subject || "(No subject)"}`
              : `Received: ${parsed.subject || "(No subject)"}`,
            description: parsed.bodyText?.substring(0, 200),
            contactId: thread.contactId,
          },
        });
        await prisma.contact.update({
          where: { id: thread.contactId },
          data: { lastContactedAt: parsed.date },
        }).catch(() => {});

        // --- Sequence reply detection ---
        if (!isOutbound) {
          try {
            await detectSequenceReply(thread.contactId, account.userId, parsed.subject);
          } catch {
            // Non-critical — don't break sync
          }
        }
      }

      synced++;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: "gmail-sync", messageId: msgId },
      });
    }
  }

  // Update sync timestamp
  await prisma.emailAccount.update({
    where: { id: emailAccountId },
    data: { lastSyncedAt: new Date() },
  });

  // Set initial historyId if not set
  if (!account.gmailHistoryId) {
    try {
      const profile = await gmail.users.getProfile({ userId: "me" });
      if (profile.data.historyId) {
        await prisma.emailAccount.update({
          where: { id: emailAccountId },
          data: { gmailHistoryId: profile.data.historyId },
        });
      }
    } catch {
      // Non-critical
    }
  }

  return synced;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function bootstrapSync(
  gmail: ReturnType<typeof google.gmail>,
  accountEmail: string
): Promise<string[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const afterDate = `${sevenDaysAgo.getFullYear()}/${sevenDaysAgo.getMonth() + 1}/${sevenDaysAgo.getDate()}`;

  const response = await gmail.users.messages.list({
    userId: "me",
    q: `after:${afterDate}`,
    maxResults: 100,
  });

  return response.data.messages?.map((m) => m.id!).filter(Boolean) ?? [];
}

async function fetchAndParse(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string
): Promise<ParsedEmail | null> {
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const msg = response.data;
  const headers = msg.payload?.headers ?? [];

  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

  const from = getHeader("From");
  const to = getHeader("To");
  const subject = getHeader("Subject");
  const messageIdHeader = getHeader("Message-ID") || `gmail-${messageId}`;
  const dateStr = getHeader("Date");
  const date = dateStr ? new Date(dateStr) : new Date();

  // Extract body
  let bodyText = "";
  let bodyHtml = "";

  function extractParts(part: typeof msg.payload) {
    if (!part) return;
    if (part.mimeType === "text/plain" && part.body?.data) {
      bodyText = Buffer.from(part.body.data, "base64url").toString("utf-8");
    }
    if (part.mimeType === "text/html" && part.body?.data) {
      bodyHtml = Buffer.from(part.body.data, "base64url").toString("utf-8");
    }
    if (part.parts) {
      for (const subPart of part.parts) {
        extractParts(subPart);
      }
    }
  }

  extractParts(msg.payload);

  // Fallback: if payload itself has body data
  if (!bodyText && !bodyHtml && msg.payload?.body?.data) {
    const decoded = Buffer.from(msg.payload.body.data, "base64url").toString("utf-8");
    if (msg.payload.mimeType === "text/html") {
      bodyHtml = decoded;
    } else {
      bodyText = decoded;
    }
  }

  if (!from && !to) return null;

  return {
    messageId,
    providerMessageId: messageIdHeader,
    from,
    to,
    subject,
    bodyText,
    bodyHtml,
    date,
  };
}

// ---------------------------------------------------------------------------
// Sequence reply detection
// When an inbound email arrives from a contact with an active enrollment,
// mark the enrollment as "replied" and create a follow-up task.
// ---------------------------------------------------------------------------

async function detectSequenceReply(
  contactId: string,
  userId: string,
  subject: string
): Promise<void> {
  const activeEnrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      contactId,
      status: "active",
    },
    include: {
      sequence: { select: { name: true } },
      contact: { select: { name: true } },
    },
  });

  for (const enrollment of activeEnrollments) {
    // Mark enrollment as replied
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: { status: "replied", nextSendAt: null },
    });

    // Create replied event
    await prisma.sequenceEvent.create({
      data: {
        enrollmentId: enrollment.id,
        step: enrollment.currentStep,
        type: "replied",
        metadata: { subject },
      },
    });

    // Create follow-up task
    await prisma.task.create({
      data: {
        userId,
        contactId,
        title: `Reply from ${enrollment.contact.name} on "${enrollment.sequence.name}" — follow up`,
        priority: "high",
      },
    });
  }
}
