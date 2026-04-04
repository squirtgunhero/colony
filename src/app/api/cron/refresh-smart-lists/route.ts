import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildWhereClause } from "@/lib/dialer/smart-list-filters";
import type { SmartFilter } from "@/lib/dialer/smart-list-filters";

/**
 * GET — Cron endpoint to refresh all qualifying smart lists.
 * Protected by bearer token auth via CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all smart lists that are due for a refresh
    const lists = await prisma.callList.findMany({
      where: {
        isSmartList: true,
        refreshIntervalMin: { not: null },
        status: "active",
        OR: [
          { lastRefreshedAt: null },
          // We'll filter by interval in application code below
          { lastRefreshedAt: { not: null } },
        ],
      },
      include: { entries: { select: { contactId: true } } },
    });

    // Filter lists whose lastRefreshedAt is older than their interval
    const dueLists = lists.filter((list) => {
      if (!list.lastRefreshedAt) return true;
      const intervalMs = (list.refreshIntervalMin ?? 0) * 60 * 1000;
      return now.getTime() - list.lastRefreshedAt.getTime() >= intervalMs;
    });

    let totalRefreshed = 0;
    let totalAdded = 0;

    for (const list of dueLists) {
      if (!list.filterJson) continue;

      const filters = list.filterJson as unknown as SmartFilter[];
      const where = buildWhereClause(list.userId, filters);

      const matchingContacts = await prisma.contact.findMany({
        where,
        select: { id: true },
      });

      const existingContactIds = new Set(list.entries.map((e) => e.contactId));
      const newContactIds = matchingContacts
        .map((c) => c.id)
        .filter((id) => !existingContactIds.has(id));

      if (newContactIds.length > 0) {
        const maxPosition = list.entries.length > 0
          ? await prisma.callListEntry.aggregate({
              where: { callListId: list.id },
              _max: { position: true },
            }).then((r) => r._max.position ?? -1)
          : -1;

        await prisma.callListEntry.createMany({
          data: newContactIds.map((contactId, index) => ({
            callListId: list.id,
            contactId,
            position: maxPosition + 1 + index,
            status: "pending",
          })),
        });

        totalAdded += newContactIds.length;
      }

      await prisma.callList.update({
        where: { id: list.id },
        data: { lastRefreshedAt: now },
      });

      totalRefreshed++;
    }

    return NextResponse.json({
      refreshed: totalRefreshed,
      added: totalAdded,
      checked: lists.length,
    });
  } catch {
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
