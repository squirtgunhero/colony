import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { scoreAllContacts, scoreContact } from "@/lib/lead-scoring";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => ({}));

    // Score a single contact
    if (body.contactId) {
      const result = await scoreContact(body.contactId);
      return NextResponse.json(result);
    }

    // Score all contacts for the user
    const result = await scoreAllContacts(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Lead Score API]", error);
    return NextResponse.json({ error: "Failed to score leads" }, { status: 500 });
  }
}
