import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

export async function GET() {
  try {
    const userId = await requireUserId();
    const drops = await prisma.voicemailDrop.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(drops);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { name, recordingUrl, duration } = await request.json();

    const drop = await prisma.voicemailDrop.create({
      data: {
        userId,
        name,
        recordingUrl,
        duration: duration || null,
      },
    });

    return NextResponse.json(drop);
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
