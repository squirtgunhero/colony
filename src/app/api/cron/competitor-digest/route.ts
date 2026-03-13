import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/twilio";
import { isQuietHours } from "@/lib/quiet-hours";
import { createAdLibraryClient } from "@/lib/meta/adLibrary";
import { getDefaultProvider } from "@/lam/llm";
import type { AdLibraryAd } from "@/lib/meta/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow more time for multiple Ad Library calls

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get all active competitor watches grouped by user
  const watches = await prisma.competitorWatch.findMany({
    where: { active: true },
    orderBy: { userId: "asc" },
  });

  if (watches.length === 0) {
    return Response.json({ sent: 0, users: 0, watches: 0 });
  }

  // Group watches by userId
  const watchesByUser: Record<string, typeof watches> = {};
  for (const watch of watches) {
    if (!watchesByUser[watch.userId]) {
      watchesByUser[watch.userId] = [];
    }
    watchesByUser[watch.userId].push(watch);
  }

  // Get user phone settings for all users with watches
  const userIds = Object.keys(watchesByUser);
  const userPhones = await prisma.userPhone.findMany({
    where: {
      profileId: { in: userIds },
      autopilotEnabled: true,
      verified: true,
    },
  });

  const phoneByUser: Record<string, typeof userPhones[0]> = {};
  for (const up of userPhones) {
    phoneByUser[up.profileId] = up;
  }

  let adLibrary: ReturnType<typeof createAdLibraryClient> | null = null;
  try {
    adLibrary = createAdLibraryClient();
  } catch {
    console.error("Failed to create Ad Library client — META_APP_ID/SECRET may not be set");
    return Response.json({ error: "Ad Library client init failed", sent: 0 });
  }

  let sent = 0;
  const llm = getDefaultProvider();

  for (const userId of userIds) {
    const userPhone = phoneByUser[userId];
    if (!userPhone) continue; // No verified autopilot phone
    if (isQuietHours(userPhone.quietStart, userPhone.quietEnd)) continue;

    const userWatches = watchesByUser[userId];
    const allNewAds: Array<{ pageName: string; pageId: string; ads: AdLibraryAd[] }> = [];

    for (const watch of userWatches) {
      try {
        const ads = await adLibrary.searchByPage(watch.pageId, {
          ad_active_status: "ACTIVE",
          limit: 25,
        });

        // Determine new ads: compare count to lastAdCount
        // If more ads than before, we have new activity
        const newAdCount = ads.length;
        const previousCount = watch.lastAdCount;

        // Update the watch record regardless
        await prisma.competitorWatch.update({
          where: { id: watch.id },
          data: {
            lastCheckedAt: new Date(),
            lastAdCount: newAdCount,
          },
        });

        // Only report if there are more ads than last time
        if (newAdCount > previousCount) {
          // Get the newest ads (approximate — Ad Library doesn't guarantee order,
          // but recently created ads tend to appear first)
          const newAds = ads.slice(0, newAdCount - previousCount);
          if (newAds.length > 0) {
            allNewAds.push({
              pageName: watch.pageName,
              pageId: watch.pageId,
              ads: newAds,
            });
          }
        }
      } catch (error) {
        console.error(`Ad Library search failed for page ${watch.pageId}:`, error);
        // Continue with other watches
      }
    }

    // Skip if no new ads across all watched competitors
    if (allNewAds.length === 0) continue;

    try {
      // Build summary data for LLM
      const competitorSummaries = allNewAds.map((c) => ({
        competitor: c.pageName,
        new_ad_count: c.ads.length,
        headlines: c.ads
          .flatMap((a) => a.ad_creative_link_titles || [])
          .slice(0, 5),
        body_snippets: c.ads
          .flatMap((a) => a.ad_creative_bodies || [])
          .slice(0, 3)
          .map((b) => (b.length > 100 ? b.slice(0, 97) + "..." : b)),
        platforms: [
          ...new Set(c.ads.flatMap((a) => a.publisher_platforms || [])),
        ],
      }));

      const totalNewAds = allNewAds.reduce((s, c) => s + c.ads.length, 0);

      const response = await llm.complete([
        {
          role: "system",
          content:
            "You write brief text message updates from Tara, an AI marketing assistant. Keep messages conversational, under 300 characters, and actionable.",
        },
        {
          role: "user",
          content: `Summarize these new competitor ads for a weekly digest text message. Keep it under 300 characters. Focus on: how many new ads, any notable creative shifts, and one actionable takeaway. Be conversational — this is a text message from Tara.

Total new ads found: ${totalNewAds}
Competitors with new activity: ${allNewAds.length}

Data:
${JSON.stringify(competitorSummaries, null, 2)}`,
        },
      ]);

      let message = response.content.trim();
      // Ensure under SMS-friendly length
      if (message.length > 480) {
        message = message.slice(0, 477) + "...";
      }

      const result = await sendSMS(userPhone.phoneNumber, message);

      await prisma.sMSMessage.create({
        data: {
          profileId: userId,
          direction: "outbound",
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: userPhone.phoneNumber,
          body: message,
          twilioSid: result.sid,
          status: "sent",
        },
      });

      sent++;
    } catch (error) {
      console.error(`Competitor digest failed for user ${userId}:`, error);
    }
  }

  return Response.json({
    sent,
    users: userIds.length,
    watches: watches.length,
  });
}
