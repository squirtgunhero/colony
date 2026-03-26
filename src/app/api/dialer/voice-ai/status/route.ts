import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Voice AI status callback — receives call lifecycle updates from Twilio.
 */
export async function POST(request: NextRequest) {
  try {
    const callId = request.nextUrl.searchParams.get("callId");
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const duration = formData.get("CallDuration") as string | null;

    const statusMap: Record<string, string> = {
      initiated: "initiated",
      ringing: "ringing",
      "in-progress": "in_progress",
      completed: "completed",
      busy: "busy",
      "no-answer": "no_answer",
      failed: "failed",
      canceled: "failed",
    };

    const mappedStatus = statusMap[callStatus] || callStatus;

    // Find call by ID or SID
    let call = callId
      ? await prisma.call.findUnique({ where: { id: callId }, include: { contact: true } })
      : null;
    if (!call && callSid) {
      call = await prisma.call.findUnique({ where: { twilioCallSid: callSid }, include: { contact: true } });
    }
    if (!call) return NextResponse.json({ ok: true });

    const updateData: Record<string, unknown> = { status: mappedStatus };

    if (mappedStatus === "in_progress" && !call.answeredAt) {
      updateData.answeredAt = new Date();
    }

    if (["completed", "busy", "no_answer", "failed"].includes(mappedStatus)) {
      updateData.endedAt = new Date();
      if (duration) updateData.duration = parseInt(duration, 10);

      // Create activity for Voice AI call
      if (call.contactId) {
        const durationSecs = duration ? parseInt(duration, 10) : 0;
        const durationStr = durationSecs > 0
          ? `${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s`
          : "0s";

        const summary = call.aiSummary ? ` — ${call.aiSummary.slice(0, 200)}` : "";
        const apptNote = call.appointmentSet ? " [Appointment Set]" : "";

        await prisma.activity.create({
          data: {
            userId: call.userId,
            contactId: call.contactId,
            type: "call",
            title: `Voice AI call to ${call.contact?.name || call.toNumber}`,
            description: `${mappedStatus === "completed" ? "Completed" : mappedStatus} AI call (${durationStr})${apptNote}${summary}`,
          },
        });

        await prisma.contact.update({
          where: { id: call.contactId },
          data: { lastContactedAt: new Date() },
        });
      }
    }

    await prisma.call.update({ where: { id: call.id }, data: updateData });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Voice AI status callback error:", error);
    return NextResponse.json({ ok: true });
  }
}
