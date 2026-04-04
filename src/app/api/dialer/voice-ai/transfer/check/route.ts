import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET — Check for pending transfers in an active call list session.
 * TaraSession polls this to know when to show the transfer notification.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const callListId = request.nextUrl.searchParams.get("callListId");

    if (!callListId) {
      return NextResponse.json({ error: "callListId is required" }, { status: 400 });
    }

    const pendingTransfer = await prisma.call.findFirst({
      where: {
        userId,
        callListId,
        transferRequested: true,
        transferredAt: null,
        status: { in: ["initiated", "ringing", "in_progress"] },
      },
      include: {
        contact: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!pendingTransfer) {
      return NextResponse.json({ pending: false });
    }

    const conferenceName = `transfer-${pendingTransfer.id}`;
    const durationSecs = pendingTransfer.answeredAt
      ? Math.floor((Date.now() - new Date(pendingTransfer.answeredAt).getTime()) / 1000)
      : 0;

    return NextResponse.json({
      pending: true,
      callId: pendingTransfer.id,
      contactName: pendingTransfer.contact?.name || "Unknown Contact",
      conferenceName,
      duration: durationSecs,
      objective: pendingTransfer.aiObjective || "qualify",
    });
  } catch (error) {
    console.error("[Transfer Check] Error:", error);
    return NextResponse.json({ error: "Failed to check transfers" }, { status: 500 });
  }
}
