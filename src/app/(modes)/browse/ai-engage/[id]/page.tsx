import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { AIConversationView } from "./conversation-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AIEngageDetailPage({ params }: Props) {
  const { id } = await params;
  const userId = await requireUserId();

  const engagement = await prisma.aIEngagement.findFirst({
    where: { id, userId },
    include: {
      contact: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          source: true,
          type: true,
          tags: true,
          createdAt: true,
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!engagement) notFound();

  const serialized = JSON.parse(JSON.stringify(engagement));
  return <AIConversationView engagement={serialized} />;
}
