import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Twilio status callback — receives call status updates.
 * Updates the Call record and creates an Activity on completion.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const duration = formData.get("CallDuration") as string;
    const recordingUrl = formData.get("RecordingUrl") as string | null;

    if (!callSid) {
      return NextResponse.json({ error: "Missing CallSid" }, { status: 400 });
    }

    // Map Twilio status to our status
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

    // Find the call record
    const call = await prisma.call.findUnique({
      where: { twilioCallSid: callSid },
      include: { contact: true },
    });

    if (!call) {
      // Call record may not exist yet if status webhook fires before our DB write
      return NextResponse.json({ ok: true });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: mappedStatus,
    };

    if (mappedStatus === "in_progress" && !call.answeredAt) {
      updateData.answeredAt = new Date();
    }

    if (["completed", "busy", "no_answer", "failed"].includes(mappedStatus)) {
      updateData.endedAt = new Date();
      if (duration) {
        updateData.duration = parseInt(duration, 10);
      }
      if (recordingUrl) {
        updateData.recordingUrl = recordingUrl;
      }

      // Create Activity record on call completion
      if (call.contactId) {
        const durationSecs = duration ? parseInt(duration, 10) : 0;
        const durationStr = durationSecs > 0
          ? `${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s`
          : "0s";

        await prisma.activity.create({
          data: {
            userId: call.userId,
            contactId: call.contactId,
            type: "call",
            title: `Call to ${call.contact?.name || call.toNumber}`,
            description: `${mappedStatus === "completed" ? "Completed" : mappedStatus} call (${durationStr})${call.notes ? ` — ${call.notes.slice(0, 200)}` : ""}`,
          },
        });

        // Update contact's lastContactedAt
        await prisma.contact.update({
          where: { id: call.contactId },
          data: { lastContactedAt: new Date() },
        });
      }
    }

    await prisma.call.update({
      where: { id: call.id },
      data: updateData,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Dialer status callback error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to Twilio
  }
}
