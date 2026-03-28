import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

// GET /api/sequences/enrollments?sequenceId=xxx
export async function GET(req: NextRequest) {
  await requireUserId();
  const sequenceId = req.nextUrl.searchParams.get("sequenceId");
  if (!sequenceId) {
    return NextResponse.json({ error: "sequenceId required" }, { status: 400 });
  }

  const enrollments = await prisma.sequenceEnrollment.findMany({
    where: { sequenceId },
    include: {
      contact: { select: { id: true, name: true, email: true } },
      events: { orderBy: { occurredAt: "desc" }, take: 5 },
    },
    orderBy: { enrolledAt: "desc" },
  });

  return NextResponse.json(enrollments.map((e) => ({
    id: e.id,
    contactId: e.contactId,
    contactName: e.contact.name,
    contactEmail: e.contact.email,
    currentStep: e.currentStep,
    status: e.status,
    nextSendAt: e.nextSendAt?.toISOString() ?? null,
    enrolledAt: e.enrolledAt.toISOString(),
    recentEvents: e.events.map((ev) => ({
      type: ev.type,
      step: ev.step,
      occurredAt: ev.occurredAt.toISOString(),
    })),
  })));
}
