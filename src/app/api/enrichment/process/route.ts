import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enrichContact } from "@/lib/enrichment";
import { computeForEntity } from "@/lib/ai-attributes/engine";

/**
 * POST /api/enrichment/process
 * Processes pending EnrichmentJobs (up to 10 per run).
 * Can be called by a cron job or manually.
 */
export async function POST() {
  try {
    const jobs = await prisma.enrichmentJob.findMany({
      where: {
        status: "pending",
        attempts: { lt: 3 },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
      include: { contact: { select: { id: true, email: true } } },
    });

    if (jobs.length === 0) {
      return NextResponse.json({ processed: 0, message: "No pending jobs" });
    }

    let completed = 0;
    let failed = 0;

    for (const job of jobs) {
      // Mark as processing
      await prisma.enrichmentJob.update({
        where: { id: job.id },
        data: { status: "processing", attempts: { increment: 1 } },
      });

      try {
        const { result, provider } = await enrichContact(job.contactId);

        if (result) {
          await prisma.enrichmentJob.update({
            where: { id: job.id },
            data: {
              status: "complete",
              provider,
              result: JSON.parse(JSON.stringify(result)),
              processedAt: new Date(),
            },
          });
          // Re-compute AI attributes after enrichment
          computeForEntity(job.contactId, "contact").catch((e) =>
            console.error("[Enrichment Process] AI attributes failed:", e)
          );
          completed++;
        } else {
          const newAttempts = job.attempts + 1;
          await prisma.enrichmentJob.update({
            where: { id: job.id },
            data: {
              status: newAttempts >= 3 ? "failed" : "pending",
              error: "No enrichment data found",
              processedAt: new Date(),
            },
          });
          failed++;
        }
      } catch (error) {
        const newAttempts = job.attempts + 1;
        await prisma.enrichmentJob.update({
          where: { id: job.id },
          data: {
            status: newAttempts >= 3 ? "failed" : "pending",
            error: error instanceof Error ? error.message : "Unknown error",
            processedAt: new Date(),
          },
        });
        failed++;
      }

      // Rate limit between jobs
      await new Promise((r) => setTimeout(r, 300));
    }

    return NextResponse.json({ processed: jobs.length, completed, failed });
  } catch (error) {
    console.error("[Enrichment Process]", error);
    return NextResponse.json(
      { error: "Failed to process enrichment jobs" },
      { status: 500 }
    );
  }
}
