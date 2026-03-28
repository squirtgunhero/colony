import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

/**
 * POST /api/enrichment/trigger
 * Creates EnrichmentJob records for contacts needing enrichment.
 * Body: { contactId: string } or { all: true }
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    let created = 0;

    if (body.contactId) {
      // Single contact enrichment
      const contact = await prisma.contact.findFirst({
        where: { id: body.contactId, userId },
        select: { id: true, email: true, enrichedAt: true },
      });

      if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }

      if (!contact.email) {
        return NextResponse.json({ error: "Contact has no email" }, { status: 400 });
      }

      // Check if there's already a pending/processing job
      const existingJob = await prisma.enrichmentJob.findFirst({
        where: {
          contactId: contact.id,
          status: { in: ["pending", "processing"] },
        },
      });

      if (!existingJob) {
        await prisma.enrichmentJob.create({
          data: { contactId: contact.id },
        });
        created = 1;
      }
    } else if (body.all) {
      // Batch: all contacts not enriched in 90 days
      const contacts = await prisma.contact.findMany({
        where: {
          userId,
          email: { not: null },
          OR: [
            { enrichedAt: null },
            { enrichedAt: { lt: ninetyDaysAgo } },
          ],
        },
        select: { id: true },
      });

      // Filter out contacts that already have pending jobs
      const existingJobs = await prisma.enrichmentJob.findMany({
        where: {
          contactId: { in: contacts.map((c) => c.id) },
          status: { in: ["pending", "processing"] },
        },
        select: { contactId: true },
      });

      const existingSet = new Set(existingJobs.map((j) => j.contactId));
      const toCreate = contacts.filter((c) => !existingSet.has(c.id));

      if (toCreate.length > 0) {
        await prisma.enrichmentJob.createMany({
          data: toCreate.map((c) => ({ contactId: c.id })),
        });
        created = toCreate.length;
      }
    }

    return NextResponse.json({ created });
  } catch (error) {
    console.error("[Enrichment Trigger]", error);
    const message = error instanceof Error ? error.message : "Failed to trigger enrichment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
