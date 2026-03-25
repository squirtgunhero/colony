import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// GET — list all listing alerts
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alerts = await prisma.listingAlert.findMany({
    where: { userId: user.id },
    include: {
      contact: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(alerts);
}

// POST — create listing alert
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { contactId, name, channel, frequency, cities, states, zipCodes, minPrice, maxPrice, minBedrooms, maxBedrooms, minBathrooms, minSqft, maxSqft } = body;

  if (!contactId || !name) {
    return NextResponse.json({ error: "contactId and name required" }, { status: 400 });
  }

  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId: user.id } });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const alert = await prisma.listingAlert.create({
    data: {
      userId: user.id,
      contactId,
      name,
      channel: channel || "email",
      frequency: frequency || "instant",
      cities: cities || [],
      states: states || [],
      zipCodes: zipCodes || [],
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
      minBedrooms: minBedrooms || null,
      maxBedrooms: maxBedrooms || null,
      minBathrooms: minBathrooms || null,
      minSqft: minSqft || null,
      maxSqft: maxSqft || null,
    },
  });

  return NextResponse.json(alert, { status: 201 });
}
