import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const audioFile = formData.get("audio");

  if (!audioFile || !(audioFile instanceof Blob)) {
    return NextResponse.json(
      { error: "No audio file provided" },
      { status: 400 }
    );
  }

  const whisperForm = new FormData();
  whisperForm.append("file", audioFile, "recording.webm");
  whisperForm.append("model", "whisper-1");
  whisperForm.append("language", "en");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperForm,
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("Whisper API error:", response.status, err);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 502 }
    );
  }

  const data = await response.json();

  return NextResponse.json({ text: data.text ?? "" });
}
