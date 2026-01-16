// ============================================================================
// Accept Team Invitation API
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// POST /api/teams/invite/accept - Accept an invitation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";

    if (!token) {
      return NextResponse.json({ error: "Invitation token is required" }, { status: 400 });
    }

    // Find the invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Check invitation is still valid
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `This invitation has already been ${invitation.status}` },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: "expired" },
      });
      return NextResponse.json({ error: "This invitation has expired" }, { status: 400 });
    }

    // Get user's email
    const userProfile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { email: true },
    });

    // Check if invitation email matches user's email (optional - can be removed for flexibility)
    if (userProfile?.email && invitation.email !== userProfile.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    // Check if already a member
    const existingMembership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: invitation.teamId, userId: user.id } },
    });

    if (existingMembership) {
      // Mark invitation as accepted anyway
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: "accepted", acceptedAt: new Date() },
      });
      return NextResponse.json({
        success: true,
        message: "You are already a member of this team",
        team: invitation.team,
      });
    }

    // Accept invitation and add as member
    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId: user.id,
          role: invitation.role,
        },
      }),
      prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: "accepted", acceptedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `You've joined ${invitation.team.name}!`,
      team: invitation.team,
      role: invitation.role,
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}

// GET /api/teams/invite/accept?token=xxx - Get invitation details (for preview page)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      include: {
        team: { select: { id: true, name: true, description: true } },
        invitedBy: { select: { fullName: true, email: true, avatarUrl: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const isExpired = new Date() > invitation.expiresAt;
    const isValid = invitation.status === "pending" && !isExpired;

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        status: isExpired && invitation.status === "pending" ? "expired" : invitation.status,
        isValid,
        team: invitation.team,
        invitedBy: {
          name: invitation.invitedBy.fullName,
          email: invitation.invitedBy.email,
          avatarUrl: invitation.invitedBy.avatarUrl,
        },
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
    });
  } catch (error) {
    console.error("Get invitation error:", error);
    return NextResponse.json({ error: "Failed to get invitation" }, { status: 500 });
  }
}
