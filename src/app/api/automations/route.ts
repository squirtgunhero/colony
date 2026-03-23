import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";

export async function GET() {
  try {
    const userId = await requireUserId();

    const automations = await prisma.automation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(automations);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch automations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();

    const { name, trigger, action } = body as {
      name: string;
      trigger: { type: string; conditions?: Record<string, unknown> };
      action: { type: string; params: Record<string, unknown> };
    };

    if (!name || !trigger?.type || !action?.type) {
      return NextResponse.json(
        { error: "name, trigger, and action are required" },
        { status: 400 }
      );
    }

    const automation = await prisma.automation.create({
      data: {
        userId,
        name,
        trigger: JSON.parse(JSON.stringify(trigger)),
        action: JSON.parse(JSON.stringify(action)),
      },
    });

    return NextResponse.json(automation, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create automation" },
      { status: 500 }
    );
  }
}
