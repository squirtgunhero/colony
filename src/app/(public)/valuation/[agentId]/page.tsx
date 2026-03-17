import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ValuationForm } from "./valuation-form";

interface PageProps {
  params: Promise<{ agentId: string }>;
}

export default async function ValuationPage({ params }: PageProps) {
  const { agentId } = await params;

  // Fetch the agent's profile
  const profile = await prisma.profile.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      fullName: true,
      businessType: true,
      serviceAreaCity: true,
      avatarUrl: true,
      email: true,
    },
  });

  if (!profile) {
    notFound();
  }

  const agentName = profile.fullName || "Your Local Expert";
  const businessType = profile.businessType || "Real Estate";
  const serviceArea = profile.serviceAreaCity || "";

  return (
    <ValuationForm
      agentId={profile.id}
      agentName={agentName}
      businessType={businessType}
      serviceArea={serviceArea}
      avatarUrl={profile.avatarUrl || null}
    />
  );
}
