import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { CallHistoryPage } from "./call-history-page";

export default async function DialerHistoryPage() {
  const userId = await requireUserId();

  const calls = await prisma.call.findMany({
    where: { userId },
    include: {
      contact: { select: { id: true, name: true, phone: true, type: true } },
      callList: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const formattedCalls = calls.map((call) => ({
    id: call.id,
    direction: call.direction,
    status: call.status,
    outcome: call.outcome,
    fromNumber: call.fromNumber,
    toNumber: call.toNumber,
    duration: call.duration,
    notes: call.notes,
    isVoiceAI: call.isVoiceAI,
    aiObjective: call.aiObjective,
    aiSummary: call.aiSummary,
    appointmentSet: call.appointmentSet,
    createdAt: call.createdAt.toISOString(),
    contact: call.contact,
    callList: call.callList,
  }));

  return <CallHistoryPage calls={formattedCalls} />;
}
