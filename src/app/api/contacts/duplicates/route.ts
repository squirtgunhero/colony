import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { findDuplicates, mergeContacts } from "@/lib/contact-dedup";

export async function GET() {
  try {
    const userId = await requireUserId();
    const duplicates = await findDuplicates(userId);
    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error("[Dedup API]", error);
    return NextResponse.json({ error: "Failed to find duplicates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { keepId, mergeId } = await req.json();
    if (!keepId || !mergeId) {
      return NextResponse.json({ error: "keepId and mergeId required" }, { status: 400 });
    }
    const result = await mergeContacts(keepId, mergeId, userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Merge API]", error);
    return NextResponse.json({ error: "Failed to merge contacts" }, { status: 500 });
  }
}
