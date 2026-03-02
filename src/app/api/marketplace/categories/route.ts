import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CATEGORY_LABELS: Record<string, string> = {
  real_estate: "Real Estate",
  plumbing: "Plumbing",
  electrical: "Electrical",
  finance: "Finance",
  legal: "Legal",
  insurance: "Insurance",
  contractor: "Contractor",
  landscaping: "Landscaping",
  cleaning: "Cleaning",
  moving: "Moving",
  other: "Other",
};

export async function GET() {
  const results = await prisma.referral.groupBy({
    by: ["category"],
    where: { visibility: "public", status: "open" },
    _count: { _all: true },
  });

  const categories = results
    .map((r) => ({
      key: r.category,
      label:
        CATEGORY_LABELS[r.category] ??
        r.category.charAt(0).toUpperCase() + r.category.slice(1).replace(/_/g, " "),
      openCount: r._count._all,
    }))
    .sort((a, b) => b.openCount - a.openCount);

  return NextResponse.json({ categories });
}
