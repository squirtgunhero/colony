import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const updateData: Record<string, unknown> = {};

  if (body.businessType !== undefined) {
    updateData.businessType = body.businessType;
  }
  if (body.onboardingCompleted !== undefined) {
    updateData.onboardingCompleted = body.onboardingCompleted;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await prisma.profile.update({
    where: { id: user.id },
    data: updateData,
  });

  return NextResponse.json({ ok: true });
}
