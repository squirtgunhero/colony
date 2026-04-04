import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { buildWhereClause } from "@/lib/dialer/smart-list-filters";
import type { SmartFilter } from "@/lib/dialer/smart-list-filters";

/**
 * POST — Refresh a single smart list by re-evaluating its filters
 * and adding any new matching contacts.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { callListId } = (await request.json()) as { callListId: string };

    if (!callListId) {
      return NextResponse.json({ error: "callListId is required" }, { status: 400 });
    }

    const result = await refreshSmartList(callListId, userId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to refresh list" }, { status: 500 });
  }
}

export async function refreshSmartList(
  callListId: string,
  userId: string
): Promise<{ added: number; total: number }> {
  const list = await prisma.callList.findFirst({
    where: { id: callListId, userId },
    include: { entries: { select: { contactId: true } } },
  });

  if (!list) {
    throw new Error("Call list not found");
  }

  if (!list.filterJson) {
    throw new Error("Call list has no filters");
  }

  const filters = list.filterJson as unknown as SmartFilter[];
  const where = buildWhereClause(userId, filters);

  // Get all matching contact IDs
  const matchingContacts = await prisma.contact.findMany({
    where,
    select: { id: true },
  });

  // Find contacts not already in the list
  const existingContactIds = new Set(list.entries.map((e) => e.contactId));
  const newContactIds = matchingContacts
    .map((c) => c.id)
    .filter((id) => !existingContactIds.has(id));

  // Find the max position of existing entries
  const maxPosition = list.entries.length > 0
    ? await prisma.callListEntry.aggregate({
        where: { callListId },
        _max: { position: true },
      }).then((r) => r._max.position ?? -1)
    : -1;

  // Add new contacts as pending entries
  if (newContactIds.length > 0) {
    await prisma.callListEntry.createMany({
      data: newContactIds.map((contactId, index) => ({
        callListId,
        contactId,
        position: maxPosition + 1 + index,
        status: "pending",
      })),
    });
  }

  // Update lastRefreshedAt
  await prisma.callList.update({
    where: { id: callListId },
    data: { lastRefreshedAt: new Date() },
  });

  return {
    added: newContactIds.length,
    total: existingContactIds.size + newContactIds.length,
  };
}
