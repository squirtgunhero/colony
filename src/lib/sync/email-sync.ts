// ============================================================================
// COLONY - Email Sync Engine
// Incremental Gmail sync using Users.history.list
// First sync pulls last 90 days of message headers
// NEVER stores email bodies — only subject + first 200 chars snippet
// ============================================================================

import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { createOAuth2Client, getValidAccessToken } from "@/lib/gmail";
import { calculateRelationshipScore } from "@/lib/relationship-score";

interface SyncResult {
  synced: number;
  newContacts: number;
  scoresUpdated: number;
}

export async function syncEmail(profileId: string): Promise<SyncResult> {
  // Get the user's default email account
  const emailAccount = await prisma.emailAccount.findFirst({
    where: { userId: profileId, isDefault: true },
  });

  if (!emailAccount) {
    throw new Error("No connected email account found");
  }

  // Get or create sync record
  let syncRecord = await prisma.emailSync.findUnique({
    where: { profileId_provider: { profileId, provider: "gmail" } },
  });

  if (!syncRecord) {
    syncRecord = await prisma.emailSync.create({
      data: { profileId, provider: "gmail" },
    });
  }

  // Mark as syncing
  await prisma.emailSync.update({
    where: { id: syncRecord.id },
    data: { status: "syncing" },
  });

  try {
    const accessToken = await getValidAccessToken(emailAccount.id);
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    let result: SyncResult;

    if (syncRecord.syncCursor) {
      // Incremental sync using history
      result = await incrementalSync(gmail, profileId, emailAccount.email, syncRecord.syncCursor);
    } else {
      // Initial sync — last 90 days
      result = await initialSync(gmail, profileId, emailAccount.email);
    }

    // Get current historyId for next sync
    const profile = await gmail.users.getProfile({ userId: "me" });
    const newHistoryId = profile.data.historyId;

    // Update sync record
    await prisma.emailSync.update({
      where: { id: syncRecord.id },
      data: {
        status: "idle",
        lastSyncAt: new Date(),
        syncCursor: newHistoryId ?? syncRecord.syncCursor,
      },
    });

    return result;
  } catch (error) {
    await prisma.emailSync.update({
      where: { id: syncRecord.id },
      data: { status: "error" },
    });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Initial sync — pull last 90 days of messages (headers only)
// ---------------------------------------------------------------------------
async function initialSync(
  gmail: ReturnType<typeof google.gmail>,
  profileId: string,
  userEmail: string
): Promise<SyncResult> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const afterEpoch = Math.floor(ninetyDaysAgo.getTime() / 1000);

  let synced = 0;
  let newContacts = 0;
  let pageToken: string | undefined;
  const affectedContactIds = new Set<string>();

  do {
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      q: `after:${afterEpoch}`,
      maxResults: 100,
      pageToken,
    });

    const messages = listResponse.data.messages || [];

    for (const msg of messages) {
      if (!msg.id) continue;

      // Check if already imported
      const existing = await prisma.emailInteraction.findUnique({
        where: { messageId: msg.id },
      });
      if (existing) continue;

      const result = await processMessage(gmail, profileId, userEmail, msg.id);
      if (result) {
        synced++;
        if (result.newContact) newContacts++;
        if (result.contactId) affectedContactIds.add(result.contactId);
      }
    }

    pageToken = listResponse.data.nextPageToken ?? undefined;
  } while (pageToken);

  // Recalculate scores for affected contacts
  const scoresUpdated = await updateScores(Array.from(affectedContactIds));

  return { synced, newContacts, scoresUpdated };
}

// ---------------------------------------------------------------------------
// Incremental sync — use Gmail history API
// ---------------------------------------------------------------------------
async function incrementalSync(
  gmail: ReturnType<typeof google.gmail>,
  profileId: string,
  userEmail: string,
  historyId: string
): Promise<SyncResult> {
  let synced = 0;
  let newContacts = 0;
  let pageToken: string | undefined;
  const affectedContactIds = new Set<string>();

  try {
    do {
      const historyResponse = await gmail.users.history.list({
        userId: "me",
        startHistoryId: historyId,
        historyTypes: ["messageAdded"],
        pageToken,
      });

      const histories = historyResponse.data.history || [];

      for (const history of histories) {
        const addedMessages = history.messagesAdded || [];
        for (const added of addedMessages) {
          const msgId = added.message?.id;
          if (!msgId) continue;

          const existing = await prisma.emailInteraction.findUnique({
            where: { messageId: msgId },
          });
          if (existing) continue;

          const result = await processMessage(gmail, profileId, userEmail, msgId);
          if (result) {
            synced++;
            if (result.newContact) newContacts++;
            if (result.contactId) affectedContactIds.add(result.contactId);
          }
        }
      }

      pageToken = historyResponse.data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (error: unknown) {
    // If historyId is too old, fall back to initial sync
    const isNotFound =
      error instanceof Error &&
      "code" in error &&
      (error as { code: number }).code === 404;
    if (isNotFound) {
      return initialSync(gmail, profileId, userEmail);
    }
    throw error;
  }

  const scoresUpdated = await updateScores(Array.from(affectedContactIds));
  return { synced, newContacts, scoresUpdated };
}

// ---------------------------------------------------------------------------
// Process a single Gmail message — extract headers, match contact, create record
// ---------------------------------------------------------------------------
async function processMessage(
  gmail: ReturnType<typeof google.gmail>,
  profileId: string,
  userEmail: string,
  messageId: string
): Promise<{ contactId: string | null; newContact: boolean } | null> {
  const msgResponse = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "metadata",
    metadataHeaders: ["From", "To", "Subject", "Date"],
  });

  const headers = msgResponse.data.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

  const from = getHeader("From");
  const to = getHeader("To");
  const subject = getHeader("Subject");
  const dateStr = getHeader("Date");
  const snippet = (msgResponse.data.snippet || "").slice(0, 200);

  // Determine direction and external email
  const fromEmail = extractEmail(from);
  const toEmail = extractEmail(to);
  const isOutbound = fromEmail?.toLowerCase() === userEmail.toLowerCase();
  const externalEmail = isOutbound ? toEmail : fromEmail;

  if (!externalEmail) return null;

  // Match to existing contact or create stub
  let newContact = false;
  let contact = await prisma.contact.findFirst({
    where: {
      userId: profileId,
      email: { equals: externalEmail, mode: "insensitive" },
    },
  });

  if (!contact) {
    // Create stub contact from email
    const displayName = isOutbound ? extractName(to) : extractName(from);
    contact = await prisma.contact.create({
      data: {
        userId: profileId,
        name: displayName || externalEmail,
        email: externalEmail,
        source: "email-sync",
        type: "lead",
      },
    });
    newContact = true;

    // Queue enrichment for new contact
    await prisma.enrichmentJob.create({
      data: { contactId: contact.id },
    }).catch(() => {});
  }

  // Parse date
  const occurredAt = dateStr ? new Date(dateStr) : new Date();

  // Create interaction record
  await prisma.emailInteraction.create({
    data: {
      profileId,
      contactId: contact.id,
      externalEmail,
      direction: isOutbound ? "outbound" : "inbound",
      subject: subject || null,
      snippet: snippet || null,
      messageId,
      threadId: msgResponse.data.threadId || null,
      occurredAt,
    },
  });

  // Update contact denormalized fields
  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      lastExternalContact: occurredAt,
      interactionCount: { increment: 1 },
    },
  });

  return { contactId: contact.id, newContact };
}

// ---------------------------------------------------------------------------
// Recalculate relationship scores for affected contacts
// ---------------------------------------------------------------------------
async function updateScores(contactIds: string[]): Promise<number> {
  let updated = 0;
  for (const contactId of contactIds) {
    const score = await calculateRelationshipScore(contactId);
    await prisma.contact.update({
      where: { id: contactId },
      data: { relationshipScore: score },
    });
    updated++;
  }
  return updated;
}

// ---------------------------------------------------------------------------
// Email parsing helpers
// ---------------------------------------------------------------------------
function extractEmail(header: string): string | null {
  const match = header.match(/<([^>]+)>/);
  if (match) return match[1];
  // Bare email
  if (header.includes("@")) return header.trim();
  return null;
}

function extractName(header: string): string | null {
  // "John Doe <john@example.com>" → "John Doe"
  const match = header.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  return null;
}
