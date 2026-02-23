import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const phone = await prisma.userPhone.findUnique({
    where: { profileId: user.id },
  });

  if (!phone) {
    return NextResponse.json({ hasPhone: false });
  }

  return NextResponse.json({
    hasPhone: true,
    phoneNumber: phone.phoneNumber,
    verified: phone.verified,
    autopilotEnabled: phone.autopilotEnabled,
    digestEnabled: phone.digestEnabled,
    overdueRemindersEnabled: phone.overdueRemindersEnabled,
    referralAlertsEnabled: phone.referralAlertsEnabled,
    digestTime: phone.digestTime,
    quietStart: phone.quietStart,
    quietEnd: phone.quietEnd,
  });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  const allowedFields = [
    "autopilotEnabled",
    "digestEnabled",
    "overdueRemindersEnabled",
    "referralAlertsEnabled",
    "digestTime",
    "quietStart",
    "quietEnd",
  ];

  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updateData[key] = body[key];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await prisma.userPhone.update({
    where: { profileId: user.id },
    data: updateData,
  });

  return NextResponse.json({ ok: true });
}
