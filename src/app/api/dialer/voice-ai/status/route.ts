import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreContact } from "@/lib/lead-scoring";
import { executeCallAction } from "@/lib/dialer/action-executor";
import { updateScriptMetrics } from "@/lib/dialer/script-selector";
import { createCalendarEvent } from "@/lib/google-calendar";

/**
 * Voice AI status callback — receives call lifecycle updates from Twilio.
 * On terminal statuses: creates activity, scores contact, marks call list
 * entry complete, creates follow-up tasks, and triggers next batch call.
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

        // Update contact: lastContactedAt + lead score/grade
        await prisma.contact.update({
          where: { id: call.contactId },
          data: { lastContactedAt: new Date() },
        });

        // Re-score contact after call
        try {
          const { score, grade } = await scoreContact(call.contactId);
          await prisma.contact.update({
            where: { id: call.contactId },
            data: { leadScore: score, leadGrade: grade },
          });
        } catch {
          // Non-critical — don't fail the webhook
        }

        // Create follow-up task if appointment was set
        if (call.appointmentSet) {
          await prisma.task.create({
            data: {
              userId: call.userId,
              contactId: call.contactId,
              title: `Follow up: appointment with ${call.contact?.name || "contact"}`,
              description: call.aiSummary || "Appointment set by Voice AI",
              dueDate: call.appointmentDate || new Date(Date.now() + 86400000),
              priority: "high",
            },
          });

          // Best-effort: auto-create Google Calendar event if not already created
          if (call.appointmentDate && !call.calendarEventId) {
            try {
              const apptStart = new Date(call.appointmentDate);
              const apptEnd = new Date(apptStart.getTime() + 60 * 60 * 1000);
              const contactEmail = call.contact?.email || undefined;

              const calResult = await createCalendarEvent(call.userId, {
                summary: `Meeting with ${call.contact?.name || "Contact"}`,
                description: call.aiSummary || "Appointment set by Voice AI",
                startTime: apptStart,
                endTime: apptEnd,
                attendeeEmail: contactEmail,
              });

              if (calResult) {
                await prisma.call.update({
                  where: { id: call.id },
                  data: { calendarEventId: calResult.eventId },
                });
              }
            } catch {
              // Non-critical — skip silently if no calendar connected
            }
          }
        } else if (call.leadQualified) {
          // Create callback task for qualified leads without appointment
          await prisma.task.create({
            data: {
              userId: call.userId,
              contactId: call.contactId,
              title: `Callback: ${call.contact?.name || "contact"} — qualified lead`,
              description: call.aiSummary || "Lead qualified by Voice AI, needs personal follow-up",
              dueDate: new Date(Date.now() + 86400000),
              priority: "medium",
            },
          });
        }
      }

      // Update A/B test script metrics if a script was used
      if (call.scriptId) {
        try {
          const durationSecs = duration ? parseInt(duration, 10) : 0;
          await updateScriptMetrics(call.scriptId, {
            connected: mappedStatus === "completed",
            appointmentSet: call.appointmentSet || false,
            duration: durationSecs,
          });
        } catch (e) {
          console.error("[Voice AI Status] Failed to update script metrics:", e);
        }
      }

      // Auto-execute tier-0 CallActions (safe, reversible operations)
      // Tier-0: add_note, score_updated, status_changed, tag_added
      // Tier-1 actions (create_task, send_email, schedule_showing, follow_up_call) are left for user approval
      const tier0Types = ["add_note", "score_updated", "status_changed", "tag_added"];
      try {
        const pendingActions = await prisma.callAction.findMany({
          where: { callId: call.id, completed: false, type: { in: tier0Types } },
        });
        for (const action of pendingActions) {
          await executeCallAction(action);
        }
      } catch (e) {
        console.error("[Voice AI Status] Failed to auto-execute tier-0 actions:", e);
      }

      // Mark CallListEntry as completed and trigger next batch call
      if (call.callListId && call.contactId) {
        // Map Twilio status to entry outcome
        const entryOutcome =
          call.outcome || // Use outcome set by respond route (interested/callback_requested/connected)
          (mappedStatus === "completed" ? "connected" : mappedStatus);

        await prisma.callListEntry.updateMany({
          where: { callListId: call.callListId, contactId: call.contactId },
          data: { status: "completed", outcome: entryOutcome, calledAt: new Date() },
        });

        // Check if the list is still active and trigger next call
        await triggerNextBatchCall(call.callListId, call.userId, call.aiObjective || "qualify");
      }
    }

    await prisma.call.update({ where: { id: call.id }, data: updateData });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Voice AI status callback error:", error);
    return NextResponse.json({ ok: true });
  }
}

/**
 * After a call completes, check if the list is still active and trigger
 * the next pending contact in the batch.
 */
async function triggerNextBatchCall(callListId: string, userId: string, objective: string) {
  try {
    const list = await prisma.callList.findFirst({
      where: { id: callListId, userId, status: "active" },
    });
    if (!list) return; // List paused or completed

    const nextEntry = await prisma.callListEntry.findFirst({
      where: { callListId, status: "pending" },
      orderBy: { position: "asc" },
      include: { contact: { select: { id: true, name: true, phone: true } } },
    });

    if (!nextEntry || !nextEntry.contact?.phone) {
      // No more pending entries — mark list as completed
      await prisma.callList.update({
        where: { id: callListId },
        data: { status: "completed" },
      });
      return;
    }

    // Trigger the next Voice AI call (server-to-server with internal secret)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.colony.so";
    await fetch(`${baseUrl}/api/dialer/voice-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: nextEntry.contact.id,
        objective,
        callListId,
        userId,
        internalSecret: process.env.INTERNAL_API_SECRET,
      }),
    });
  } catch (error) {
    console.error("Failed to trigger next batch call:", error);
  }
}
