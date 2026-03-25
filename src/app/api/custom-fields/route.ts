import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import {
  createCustomField,
  getCustomFields,
  deleteCustomField,
  updateCustomField,
  type CustomFieldEntityType,
  type CustomFieldDefinitionInput,
} from "@/lib/custom-fields";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const entityType = (searchParams.get("entityType") || "contact") as CustomFieldEntityType;
    const fields = await getCustomFields(userId, entityType);
    return NextResponse.json({ fields });
  } catch (error) {
    console.error("[Custom Fields API]", error);
    return NextResponse.json({ error: "Failed to get custom fields" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json()) as CustomFieldDefinitionInput;
    const field = await createCustomField(userId, body);
    return NextResponse.json(field);
  } catch (error) {
    console.error("[Custom Fields API]", error);
    return NextResponse.json({ error: "Failed to create custom field" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await updateCustomField(userId, id, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Custom Fields API]", error);
    return NextResponse.json({ error: "Failed to update custom field" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteCustomField(userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Custom Fields API]", error);
    return NextResponse.json({ error: "Failed to delete custom field" }, { status: 500 });
  }
}
