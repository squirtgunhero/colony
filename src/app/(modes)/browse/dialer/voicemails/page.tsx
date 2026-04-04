import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { VoicemailManagement } from "./voicemail-management";

export default async function VoicemailsPage() {
  const userId = await requireUserId();
  const drops = await prisma.voicemailDrop.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return (
    <VoicemailManagement
      initialDrops={drops.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      }))}
    />
  );
}
