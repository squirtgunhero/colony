import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CompanyDetailView } from "./company-detail-view";

interface CompanyPageProps {
  params: Promise<{ id: string }>;
}

async function getCompany(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          type: true,
          updatedAt: true,
        },
      },
      deals: {
        orderBy: { updatedAt: "desc" },
        include: {
          contact: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { id } = await params;
  const company = await getCompany(id);

  if (!company) notFound();

  const serialized = JSON.parse(JSON.stringify(company));
  return <CompanyDetailView company={serialized} />;
}
