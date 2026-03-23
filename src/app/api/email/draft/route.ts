import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/supabase/auth";
import { draftContextualEmail } from "@/lib/contextual-email";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { contactId, purpose } = (await request.json()) as {
      contactId: string;
      purpose?: string;
    };

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId is required" },
        { status: 400 }
      );
    }

    // Verify contact belongs to user
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { userId: true },
    });

    if (!contact || contact.userId !== userId) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    const result = await draftContextualEmail(contactId, userId, purpose);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to draft email" },
      { status: 500 }
    );
  }
}
