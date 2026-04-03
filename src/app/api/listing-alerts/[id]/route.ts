import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET — single alert with matching properties
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alert = await prisma.listingAlert.findFirst({
    where: { id, userId: user.id },
    include: { contact: { select: { id: true, name: true, email: true, phone: true } } },
  });
  if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Find matching properties
  const where: Record<string, unknown> = { userId: user.id };
  if (alert.cities.length > 0) where.city = { in: alert.cities };
  if (alert.states.length > 0) where.state = { in: alert.states };
  if (alert.zipCodes.length > 0) where.zipCode = { in: alert.zipCodes };
  if (alert.states.length > 0) where.state = { in: alert.states };
  if (alert.minPrice || alert.maxPrice) {
    where.price = {};
    if (alert.minPrice) (where.price as Record<string, number>).gte = alert.minPrice;
    if (alert.maxPrice) (where.price as Record<string, number>).lte = alert.maxPrice;
  }
  if (alert.minBedrooms) where.bedrooms = { gte: alert.minBedrooms };
  if (alert.minBathrooms) where.bathrooms = { gte: alert.minBathrooms };
  if (alert.minSqft || alert.maxSqft) {
    where.sqft = {};
    if (alert.minSqft) (where.sqft as Record<string, number>).gte = alert.minSqft;
    if (alert.maxSqft) (where.sqft as Record<string, number>).lte = alert.maxSqft;
  }

  const matches = await prisma.property.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ alert, matches });
}

// PATCH — update alert
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alert = await prisma.listingAlert.findFirst({ where: { id, userId: user.id } });
  if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  const fields = ["name", "isActive", "channel", "frequency", "cities", "states", "zipCodes", "minPrice", "maxPrice", "minBedrooms", "maxBedrooms", "minBathrooms", "minSqft", "maxSqft"];
  for (const key of fields) {
    if (body[key] !== undefined) updateData[key] = body[key];
  }

  const updated = await prisma.listingAlert.update({ where: { id }, data: updateData });
  return NextResponse.json(updated);
}

// DELETE
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alert = await prisma.listingAlert.findFirst({ where: { id, userId: user.id } });
  if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.listingAlert.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
