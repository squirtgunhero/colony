import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

export async function GET() {
  try {
    const userId = await requireUserId();

    const settings = await prisma.dialerSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();

    const allowedFields = [
      "callingHoursStart",
      "callingHoursEnd",
      "callingTimezone",
      "maxCallsPerDay",
      "cooldownDays",
      "recordingConsent",
    ];

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        data[field] = body[field];
      }
    }

    const settings = await prisma.dialerSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
