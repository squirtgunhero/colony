import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { THEME_MAP } from "@/lib/themes";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { theme } = await request.json();

  if (!theme || !THEME_MAP.has(theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  await prisma.profile.update({
    where: { id: user.id },
    data: { theme },
  });

  return NextResponse.json({ success: true, theme });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { theme: true },
  });

  return NextResponse.json({ theme: profile?.theme ?? "ember" });
}
