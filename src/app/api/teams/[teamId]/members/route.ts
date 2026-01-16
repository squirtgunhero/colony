// ============================================================================
// Team Members API - List and manage team members
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ teamId: string }>;
}

// GET /api/teams/[teamId]/members - List team members
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user is member of the team
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [
        { role: "asc" }, // owner first, then admin, then member
        { joinedAt: "asc" },
      ],
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
      currentUserRole: membership.role,
    });
  } catch (error) {
    console.error("List members error:", error);
    return NextResponse.json({ error: "Failed to list members" }, { status: 500 });
  }
}

// PATCH /api/teams/[teamId]/members - Update member role
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const memberId = typeof body.memberId === "string" ? body.memberId : "";
    const newRole = body.role;

    if (!memberId || !["admin", "member", "viewer"].includes(newRole)) {
      return NextResponse.json(
        { error: "Member ID and valid role are required" },
        { status: 400 }
      );
    }

    // Check user is owner or admin
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can update roles" },
        { status: 403 }
      );
    }

    // Find the member to update
    const targetMember = await prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.teamId !== teamId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Can't change owner's role
    if (targetMember.role === "owner") {
      return NextResponse.json(
        { error: "Cannot change the owner's role" },
        { status: 403 }
      );
    }

    // Admins can't promote others to admin
    if (membership.role === "admin" && newRole === "admin") {
      return NextResponse.json(
        { error: "Only the owner can promote members to admin" },
        { status: 403 }
      );
    }

    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        id: updated.id,
        userId: updated.userId,
        role: updated.role,
        user: updated.user,
      },
    });
  } catch (error) {
    console.error("Update member error:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

// DELETE /api/teams/[teamId]/members - Remove a member
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    // Check user is owner or admin
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can remove members" },
        { status: 403 }
      );
    }

    // Find the member to remove
    const targetMember = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { fullName: true, email: true } } },
    });

    if (!targetMember || targetMember.teamId !== teamId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Can't remove owner
    if (targetMember.role === "owner") {
      return NextResponse.json({ error: "Cannot remove the team owner" }, { status: 403 });
    }

    // Admins can only remove members, not other admins
    if (membership.role === "admin" && targetMember.role === "admin") {
      return NextResponse.json(
        { error: "Admins cannot remove other admins" },
        { status: 403 }
      );
    }

    await prisma.teamMember.delete({ where: { id: memberId } });

    return NextResponse.json({
      success: true,
      message: `${targetMember.user.fullName || targetMember.user.email} has been removed from the team`,
    });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
