// ============================================================================
// Team Invitations API - Send and manage invitations
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

// POST /api/teams/invite - Send an invitation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const teamId = typeof body.teamId === "string" ? body.teamId : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = ["admin", "member", "viewer"].includes(body.role) ? body.role : "member";

    if (!teamId || !email) {
      return NextResponse.json(
        { error: "Team ID and email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Check user is owner or admin of the team
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only team owners and admins can invite members" },
        { status: 403 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        user: { email },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "This user is already a team member" },
        { status: 400 }
      );
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.teamInvitation.findFirst({
      where: {
        teamId,
        email,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "An invitation is already pending for this email" },
        { status: 400 }
      );
    }

    // Generate invite token (expires in 7 days)
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        email,
        role,
        invitedById: user.id,
        token,
        expiresAt,
      },
      include: {
        team: { select: { name: true } },
        invitedBy: { select: { fullName: true, email: true } },
      },
    });

    // TODO: Send email with invitation link
    // For now, return the invite link directly
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        teamName: invitation.team.name,
        invitedBy: invitation.invitedBy.fullName || invitation.invitedBy.email,
        expiresAt: invitation.expiresAt,
        inviteLink, // Include for now - remove in production after email is set up
      },
    });
  } catch (error) {
    console.error("Create invitation error:", error);
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }
}

// GET /api/teams/invite - List pending invitations for a team
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    // Check user is member of the team
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const invitations = await prisma.teamInvitation.findMany({
      where: { teamId, status: "pending" },
      include: {
        invitedBy: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        invitedBy: inv.invitedBy.fullName || inv.invitedBy.email,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      })),
    });
  } catch (error) {
    console.error("List invitations error:", error);
    return NextResponse.json({ error: "Failed to list invitations" }, { status: 500 });
  }
}
