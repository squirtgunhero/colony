import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

// GET — list all scripts for the current user
export async function GET() {
  try {
    const userId = await requireUserId();

    const scripts = await prisma.taraScript.findMany({
      where: { userId },
      orderBy: [{ objective: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(scripts);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// POST — create a new script
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();

    const { name, objective, greeting, systemPrompt, weight, isActive } = body;

    if (!name || !objective || !greeting || !systemPrompt) {
      return NextResponse.json(
        { error: "name, objective, greeting, and systemPrompt are required" },
        { status: 400 }
      );
    }

    if (!["qualify", "appointment", "followup"].includes(objective)) {
      return NextResponse.json(
        { error: "objective must be qualify, appointment, or followup" },
        { status: 400 }
      );
    }

    const script = await prisma.taraScript.create({
      data: {
        userId,
        name,
        objective,
        greeting,
        systemPrompt,
        weight: weight ?? 50,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(script, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
