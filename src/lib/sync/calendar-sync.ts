// ============================================================================
// COLONY - Calendar Sync Engine
// Incremental Google Calendar sync using Events.list with syncToken
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

export async function syncCalendar(profileId: string): Promise<SyncResult> {
  // Use the same Gmail OAuth account (calendar scope will be added)
  const emailAccount = await prisma.emailAccount.findFirst({
    where: { userId: profileId, isDefault: true },
  });

  if (!emailAccount) {
    throw new Error("No connected email account found");
  }

  // Get or create sync record
  let syncRecord = await prisma.calendarSync.findUnique({
    where: { profileId_provider: { profileId, provider: "google" } },
  });

  if (!syncRecord) {
    syncRecord = await prisma.calendarSync.create({
      data: { profileId, provider: "google" },
    });
  }

  // Mark as syncing
  await prisma.calendarSync.update({
    where: { id: syncRecord.id },
    data: { status: "syncing" },
  });

  try {
    const accessToken = await getValidAccessToken(emailAccount.id);
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    let result: SyncResult;
    let newSyncToken: string | undefined;

    if (syncRecord.syncToken) {
      const syncResult = await incrementalSync(calendar, profileId, emailAccount.email, syncRecord.syncToken);
      result = syncResult.result;
      newSyncToken = syncResult.nextSyncToken;
    } else {
      const syncResult = await initialSync(calendar, profileId, emailAccount.email);
      result = syncResult.result;
      newSyncToken = syncResult.nextSyncToken;
    }

    // Update sync record
    await prisma.calendarSync.update({
      where: { id: syncRecord.id },
      data: {
        status: "idle",
        lastSyncAt: new Date(),
        syncToken: newSyncToken ?? syncRecord.syncToken,
      },
    });

    return result;
  } catch (error) {
    await prisma.calendarSync.update({
      where: { id: syncRecord.id },
      data: { status: "error" },
    });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Initial sync — pull last 90 days of events
// ---------------------------------------------------------------------------
async function initialSync(
  calendar: ReturnType<typeof google.calendar>,
  profileId: string,
  userEmail: string
): Promise<{ result: SyncResult; nextSyncToken?: string }> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  let synced = 0;
  let newContacts = 0;
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  const affectedContactIds = new Set<string>();

  do {
    const eventsResponse = await calendar.events.list({
      calendarId: "primary",
      timeMin: ninetyDaysAgo.toISOString(),
      maxResults: 250,
      singleEvents: true,
      orderBy: "startTime",
      pageToken,
    });

    const events = eventsResponse.data.items || [];

    for (const event of events) {
      if (!event.id) continue;

      const results = await processEvent(profileId, userEmail, event);
      synced += results.synced;
      newContacts += results.newContacts;
      for (const cid of results.contactIds) affectedContactIds.add(cid);
    }

    pageToken = eventsResponse.data.nextPageToken ?? undefined;
    if (!pageToken) {
      nextSyncToken = eventsResponse.data.nextSyncToken ?? undefined;
    }
  } while (pageToken);

  const scoresUpdated = await updateScores(Array.from(affectedContactIds));
  return { result: { synced, newContacts, scoresUpdated }, nextSyncToken };
}

// ---------------------------------------------------------------------------
// Incremental sync — use syncToken
// ---------------------------------------------------------------------------
async function incrementalSync(
  calendar: ReturnType<typeof google.calendar>,
  profileId: string,
  userEmail: string,
  syncToken: string
): Promise<{ result: SyncResult; nextSyncToken?: string }> {
  let synced = 0;
  let newContacts = 0;
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  const affectedContactIds = new Set<string>();

  try {
    do {
      const eventsResponse = await calendar.events.list({
        calendarId: "primary",
        syncToken,
        pageToken,
      });

      const events = eventsResponse.data.items || [];

      for (const event of events) {
        if (!event.id) continue;

        // Handle cancelled events
        if (event.status === "cancelled") {
          await prisma.meetingInteraction.updateMany({
            where: { eventId: event.id },
            data: { status: "cancelled" },
          });
          continue;
        }

        const results = await processEvent(profileId, userEmail, event);
        synced += results.synced;
        newContacts += results.newContacts;
        for (const cid of results.contactIds) affectedContactIds.add(cid);
      }

      pageToken = eventsResponse.data.nextPageToken ?? undefined;
      if (!pageToken) {
        nextSyncToken = eventsResponse.data.nextSyncToken ?? undefined;
      }
    } while (pageToken);
  } catch (error: unknown) {
    // If syncToken is invalid, fall back to full sync
    const isGone =
      error instanceof Error &&
      "code" in error &&
      (error as { code: number }).code === 410;
    if (isGone) {
      return initialSync(calendar as ReturnType<typeof google.calendar>, profileId, userEmail);
    }
    throw error;
  }

  const scoresUpdated = await updateScores(Array.from(affectedContactIds));
  return { result: { synced, newContacts, scoresUpdated }, nextSyncToken };
}

// ---------------------------------------------------------------------------
// Process a single calendar event — extract attendees, match contacts
// ---------------------------------------------------------------------------
async function processEvent(
  profileId: string,
  userEmail: string,
  event: { id?: string | null; summary?: string | null; start?: { dateTime?: string | null; date?: string | null } | null; end?: { dateTime?: string | null; date?: string | null } | null; attendees?: Array<{ email?: string | null; displayName?: string | null }> | null; status?: string | null }
): Promise<{ synced: number; newContacts: number; contactIds: string[] }> {
  if (!event.id) return { synced: 0, newContacts: 0, contactIds: [] };

  const attendees = (event.attendees || []).filter(
    (a) => a.email && a.email.toLowerCase() !== userEmail.toLowerCase()
  );

  if (attendees.length === 0) return { synced: 0, newContacts: 0, contactIds: [] };

  const startTime = new Date(event.start?.dateTime || event.start?.date || Date.now());
  const endTime = new Date(event.end?.dateTime || event.end?.date || Date.now());
  const title = event.summary || "Untitled Event";

  let synced = 0;
  let newContacts = 0;
  const contactIds: string[] = [];

  for (const attendee of attendees) {
    const email = attendee.email!;

    // Check if already recorded for this event + email
    const existing = await prisma.meetingInteraction.findUnique({
      where: { eventId: `${event.id}__${email}` },
    });
    if (existing) continue;

    // Match to existing contact or create stub
    let isNew = false;
    let contact = await prisma.contact.findFirst({
      where: {
        userId: profileId,
        email: { equals: email, mode: "insensitive" },
      },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          userId: profileId,
          name: attendee.displayName || email,
          email,
          source: "email-sync",
          type: "lead",
        },
      });
      isNew = true;
    }

    await prisma.meetingInteraction.create({
      data: {
        profileId,
        contactId: contact.id,
        externalEmail: email,
        title,
        eventId: `${event.id}__${email}`,
        startTime,
        endTime,
        status: event.status || "confirmed",
      },
    });

    // Update contact denormalized fields
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        lastExternalContact: startTime,
        interactionCount: { increment: 1 },
      },
    });

    synced++;
    if (isNew) newContacts++;
    contactIds.push(contact.id);
  }

  return { synced, newContacts, contactIds };
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
