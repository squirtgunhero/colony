import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { TextCampaignsDashboard } from "./text-campaigns-dashboard";

export default async function TextCampaignsPage() {
  const userId = await requireUserId();

  const [campaigns, contacts] = await Promise.all([
    prisma.textCampaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.findMany({
      where: { userId, phone: { not: null } },
      select: { id: true, name: true, phone: true, type: true, source: true, tags: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized = JSON.parse(JSON.stringify(campaigns));
  return <TextCampaignsDashboard campaigns={serialized} contacts={contacts} />;
}
