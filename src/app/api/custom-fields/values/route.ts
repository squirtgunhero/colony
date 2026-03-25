import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { getCustomFieldValues, setCustomFieldValues } from "@/lib/custom-fields";

export async function GET(req: Request) {
  try {
    await requireUserId();
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    if (!entityId) return NextResponse.json({ error: "entityId required" }, { status: 400 });
    const values = await getCustomFieldValues(entityId);
    return NextResponse.json({ values });
  } catch (error) {
    console.error("[Custom Field Values API]", error);
    return NextResponse.json({ error: "Failed to get values" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireUserId();
    const { entityId, fields } = await req.json();
    if (!entityId || !fields) {
      return NextResponse.json({ error: "entityId and fields required" }, { status: 400 });
    }
    await setCustomFieldValues(entityId, fields);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Custom Field Values API]", error);
    return NextResponse.json({ error: "Failed to set values" }, { status: 500 });
  }
}
