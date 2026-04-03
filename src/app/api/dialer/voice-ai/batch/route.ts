import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

/**
 * POST — Start a batch Voice AI calling session on a call list.
 * Kicks off the first call; subsequent calls are triggered by the status webhook.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { callListId, objective = "qualify" } = await request.json();

    if (!callListId) {
      return NextResponse.json({ error: "callListId required" }, { status: 400 });
    }

    const list = await prisma.callList.findFirst({
      where: { id: callListId, userId },
    });

    if (!list) {
      return NextResponse.json({ error: "Call list not found" }, { status: 404 });
    }

    // Get the next pending entry
    const nextEntry = await prisma.callListEntry.findFirst({
      where: { callListId, status: "pending" },
      orderBy: { position: "asc" },
      include: {
        contact: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!nextEntry || !nextEntry.contact?.phone) {
      return NextResponse.json({ error: "No pending contacts with phone numbers" }, { status: 400 });
    }

    // Mark list as active
    await prisma.callList.update({
      where: { id: callListId },
      data: { status: "active" },
    });

    // Trigger the first AI call
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.colony.so";
    const callRes = await fetch(`${baseUrl}/api/dialer/voice-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        contactId: nextEntry.contact.id,
        objective,
        callListId,
      }),
    });

    if (!callRes.ok) {
      const err = await callRes.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || "Failed to start call" }, { status: 500 });
    }

    const callData = await callRes.json();

    // Count progress
    const total = await prisma.callListEntry.count({ where: { callListId } });
    const completed = await prisma.callListEntry.count({
      where: { callListId, status: "completed" },
    });

    return NextResponse.json({
      status: "started",
      callId: callData.callId,
      contactName: nextEntry.contact.name,
      progress: { total, completed, remaining: total - completed },
    });
  } catch {
    return NextResponse.json({ error: "Failed to start batch" }, { status: 500 });
  }
}

/**
 * GET — Get the current status of a batch AI calling session.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const callListId = request.nextUrl.searchParams.get("callListId");

    if (!callListId) {
      return NextResponse.json({ error: "callListId required" }, { status: 400 });
    }

    const list = await prisma.callList.findFirst({
      where: { id: callListId, userId },
    });

    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get recent calls for this list
    const recentCalls = await prisma.call.findMany({
      where: { callListId, userId, isVoiceAI: true },
      include: {
        contact: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Count progress
    const total = await prisma.callListEntry.count({ where: { callListId } });
    const completed = await prisma.callListEntry.count({
      where: { callListId, status: "completed" },
    });
    const outcomes = await prisma.call.groupBy({
      by: ["outcome"],
      where: { callListId, userId, isVoiceAI: true },
      _count: true,
    });

    return NextResponse.json({
      listStatus: list.status,
      progress: { total, completed, remaining: total - completed },
      outcomes: outcomes.map((o) => ({ outcome: o.outcome, count: o._count })),
      recentCalls: recentCalls.map((c) => ({
        id: c.id,
        contactName: c.contact?.name || c.toNumber,
        status: c.status,
        outcome: c.outcome,
        duration: c.duration,
        aiSummary: c.aiSummary,
        appointmentSet: c.appointmentSet,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }
}

/**
 * DELETE — Stop/pause a batch AI calling session.
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { callListId } = await request.json();

    await prisma.callList.updateMany({
      where: { id: callListId, userId },
      data: { status: "paused" },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to stop" }, { status: 500 });
  }
}
