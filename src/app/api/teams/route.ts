// ============================================================================
// Teams API - Create and list teams
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// GET /api/teams - List user's teams
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get teams where user is owner or member
    const memberships = await prisma.teamMember.findMany({
      where: { userId: user.id },
      include: {
        team: {
          include: {
            owner: { select: { id: true, email: true, fullName: true, avatarUrl: true } },
            _count: { select: { members: true } },
          },
        },
      },
    });

    const teams = memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      description: m.team.description,
      role: m.role,
      owner: m.team.owner,
      memberCount: m.team._count.members,
      joinedAt: m.joinedAt,
      createdAt: m.team.createdAt,
    }));

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("List teams error:", error);
    return NextResponse.json({ error: "Failed to list teams" }, { status: 500 });
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;

    if (!name) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    // Create team and add owner as first member
    const team = await prisma.team.create({
      data: {
        name,
        description,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
      include: {
        owner: { select: { id: true, email: true, fullName: true } },
        _count: { select: { members: true } },
      },
    });

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        owner: team.owner,
        memberCount: team._count.members,
        createdAt: team.createdAt,
      },
    });
  } catch (error) {
    console.error("Create team error:", error);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
