// ============================================================================
// COLONY - Contact Deduplication & Merge Engine
// Finds duplicate contacts and merges them
// ============================================================================

import { prisma } from "@/lib/prisma";

export interface DuplicatePair {
  contactA: { id: string; name: string; email?: string | null; phone?: string | null };
  contactB: { id: string; name: string; email?: string | null; phone?: string | null };
  matchReason: string;
  confidence: number; // 0-100
}

/**
 * Find potential duplicate contacts for a user.
 * Matches on: exact email, exact phone, or fuzzy name similarity.
 */
export async function findDuplicates(userId: string): Promise<DuplicatePair[]> {
  const contacts = await prisma.contact.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
    orderBy: { name: "asc" },
  });

  const duplicates: DuplicatePair[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const a = contacts[i];
      const b = contacts[j];
      const pairKey = [a.id, b.id].sort().join(":");
      if (seen.has(pairKey)) continue;

      // Exact email match
      if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) {
        seen.add(pairKey);
        duplicates.push({
          contactA: a,
          contactB: b,
          matchReason: `Same email: ${a.email}`,
          confidence: 95,
        });
        continue;
      }

      // Exact phone match (normalize by removing non-digits)
      const phoneA = a.phone?.replace(/\D/g, "");
      const phoneB = b.phone?.replace(/\D/g, "");
      if (phoneA && phoneB && phoneA.length >= 7 && phoneA === phoneB) {
        seen.add(pairKey);
        duplicates.push({
          contactA: a,
          contactB: b,
          matchReason: `Same phone: ${a.phone}`,
          confidence: 90,
        });
        continue;
      }

      // Fuzzy name match (normalized comparison)
      const nameA = a.name.toLowerCase().trim();
      const nameB = b.name.toLowerCase().trim();
      if (nameA === nameB) {
        seen.add(pairKey);
        duplicates.push({
          contactA: a,
          contactB: b,
          matchReason: `Same name: ${a.name}`,
          confidence: 70,
        });
        continue;
      }

      // Name parts overlap (first+last or last+first)
      const partsA = nameA.split(/\s+/);
      const partsB = nameB.split(/\s+/);
      if (partsA.length >= 2 && partsB.length >= 2) {
        const matchCount = partsA.filter((p) => partsB.includes(p)).length;
        if (matchCount >= 2) {
          seen.add(pairKey);
          duplicates.push({
            contactA: a,
            contactB: b,
            matchReason: `Similar name: "${a.name}" / "${b.name}"`,
            confidence: 55,
          });
        }
      }
    }
  }

  // Sort by confidence descending
  duplicates.sort((a, b) => b.confidence - a.confidence);
  return duplicates.slice(0, 50); // Cap at 50 pairs
}

/**
 * Merge contactB into contactA:
 * - Move all deals, tasks, activities, notes from B to A
 * - Fill in missing fields on A from B
 * - Delete B
 */
export async function mergeContacts(
  keepId: string,
  mergeId: string,
  userId: string
): Promise<{ merged: boolean; keptName: string }> {
  const [keep, merge] = await Promise.all([
    prisma.contact.findFirst({ where: { id: keepId, userId } }),
    prisma.contact.findFirst({ where: { id: mergeId, userId } }),
  ]);

  if (!keep || !merge) throw new Error("Contacts not found");

  // Fill missing fields from merge into keep
  const updates: Record<string, unknown> = {};
  if (!keep.email && merge.email) updates.email = merge.email;
  if (!keep.phone && merge.phone) updates.phone = merge.phone;
  if (!keep.source && merge.source) updates.source = merge.source;
  if ((!keep.notes || keep.notes.trim() === "") && merge.notes) {
    updates.notes = merge.notes;
  } else if (keep.notes && merge.notes && merge.notes.trim() !== "") {
    updates.notes = `${keep.notes}\n\n--- Merged from ${merge.name} ---\n${merge.notes}`;
  }
  if (merge.tags.length > 0) {
    const mergedTags = [...new Set([...keep.tags, ...merge.tags])];
    updates.tags = mergedTags;
  }

  // Reassign all related records from merge to keep
  await prisma.$transaction([
    // Update keep with merged fields
    prisma.contact.update({ where: { id: keepId }, data: updates }),
    // Move deals
    prisma.deal.updateMany({ where: { contactId: mergeId }, data: { contactId: keepId } }),
    // Move tasks
    prisma.task.updateMany({ where: { contactId: mergeId }, data: { contactId: keepId } }),
    // Move activities
    prisma.activity.updateMany({ where: { contactId: mergeId }, data: { contactId: keepId } }),
    // Move notes
    prisma.note.updateMany({ where: { contactId: mergeId }, data: { contactId: keepId } }),
    // Move inbox threads
    prisma.inboxThread.updateMany({ where: { contactId: mergeId }, data: { contactId: keepId } }),
    // Delete the merged contact (cascading will handle LeadScore, LeadAttribution, etc.)
    prisma.contact.delete({ where: { id: mergeId } }),
  ]);

  return { merged: true, keptName: keep.name };
}
