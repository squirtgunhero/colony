import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { enrollContact } from "@/lib/sequences/processor";

// POST /api/sequences/enroll — enroll a contact in a sequence
export async function POST(req: NextRequest) {
  await requireUserId();
  const { sequenceId, contactId } = await req.json();

  if (!sequenceId || !contactId) {
    return NextResponse.json(
      { error: "sequenceId and contactId required" },
      { status: 400 }
    );
  }

  try {
    const enrollment = await enrollContact(sequenceId, contactId);
    return NextResponse.json(enrollment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Enrollment failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
