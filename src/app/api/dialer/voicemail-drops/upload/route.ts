import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    await requireUserId();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const duration = formData.get("duration") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Determine file extension from MIME type
    const mimeToExt: Record<string, string> = {
      "audio/webm": ".webm",
      "audio/mpeg": ".mp3",
      "audio/mp3": ".mp3",
      "audio/wav": ".wav",
      "audio/x-wav": ".wav",
      "audio/ogg": ".ogg",
      "audio/mp4": ".m4a",
      "audio/x-m4a": ".m4a",
      "audio/m4a": ".m4a",
    };

    const ext = mimeToExt[file.type] || ".webm";
    const filename = `${randomUUID()}${ext}`;

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads", "voicemails");
    await mkdir(uploadDir, { recursive: true });

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const url = `/uploads/voicemails/${filename}`;

    return NextResponse.json({
      url,
      duration: duration ? parseInt(duration, 10) : 0,
    });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
