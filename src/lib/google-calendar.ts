import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { createOAuth2Client, getValidAccessToken } from "@/lib/gmail";

/**
 * Get an authorized Google Calendar client for a user.
 * Reuses the same EmailAccount + OAuth2 pattern as gmail.ts.
 */
export async function getCalendarClient(userId: string) {
  const account = await prisma.emailAccount.findFirst({
    where: { userId, provider: "gmail" },
    orderBy: { isDefault: "desc" },
  });

  if (!account) return null;

  const accessToken = await getValidAccessToken(account.id);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  return {
    calendar: google.calendar({ version: "v3", auth: oauth2Client }),
    emailAccountId: account.id,
    email: account.email,
  };
}

/**
 * Query Google Calendar FreeBusy API for busy time slots.
 */
export async function getAvailability(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ start: string; end: string }[]> {
  const client = await getCalendarClient(userId);
  if (!client) return [];

  try {
    const res = await client.calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: [{ id: "primary" }],
      },
    });

    const busySlots = res.data.calendars?.primary?.busy || [];
    return busySlots
      .filter((slot): slot is { start: string; end: string } =>
        Boolean(slot.start && slot.end)
      )
      .map((slot) => ({
        start: slot.start!,
        end: slot.end!,
      }));
  } catch (error) {
    console.error("Failed to get calendar availability:", error);
    return [];
  }
}

/**
 * Create a Google Calendar event.
 */
export async function createCalendarEvent(
  userId: string,
  event: {
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendeeEmail?: string;
    location?: string;
  }
): Promise<{ eventId: string; htmlLink: string } | null> {
  const client = await getCalendarClient(userId);
  if (!client) return null;

  try {
    const attendees = event.attendeeEmail
      ? [{ email: event.attendeeEmail }]
      : undefined;

    const res = await client.calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.summary,
        description: event.description || undefined,
        location: event.location || undefined,
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 30 },
            { method: "popup", minutes: 10 },
          ],
        },
      },
    });

    return {
      eventId: res.data.id!,
      htmlLink: res.data.htmlLink!,
    };
  } catch (error) {
    console.error("Failed to create calendar event:", error);
    return null;
  }
}

/**
 * List upcoming events from the user's primary Google Calendar.
 */
export async function listUpcomingEvents(
  userId: string,
  days: number = 7
): Promise<
  Array<{
    id: string;
    summary: string;
    start: string;
    end: string;
  }>
> {
  const client = await getCalendarClient(userId);
  if (!client) return [];

  const now = new Date();
  const maxDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  try {
    const res = await client.calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: maxDate.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });

    return (res.data.items || [])
      .filter((e) => e.id && e.start)
      .map((e) => ({
        id: e.id!,
        summary: e.summary || "(No title)",
        start: e.start?.dateTime || e.start?.date || "",
        end: e.end?.dateTime || e.end?.date || "",
      }));
  } catch (error) {
    console.error("Failed to list upcoming events:", error);
    return [];
  }
}
