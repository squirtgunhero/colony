// ============================================================================
// COLONY - Call Intelligence Pipeline
// Downloads Twilio recordings, transcribes with Deepgram, and extracts
// AI summaries + action items via Claude
// ============================================================================

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getDefaultProvider } from "@/lam/llm";

// ---------------------------------------------------------------------------
// Deepgram transcription
// ---------------------------------------------------------------------------

async function transcribeWithDeepgram(audioUrl: string): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY not configured");

  const response = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&paragraphs=true&diarize=true&punctuate=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: audioUrl }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Deepgram API error: ${response.status} - ${err}`);
  }

  const data = await response.json();

  // Extract paragraphs with speaker labels
  const paragraphs =
    data.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs;

  if (paragraphs && paragraphs.length > 0) {
    return paragraphs
      .map(
        (p: { speaker: number; sentences: { text: string }[] }) =>
          `Speaker ${p.speaker}: ${p.sentences.map((s: { text: string }) => s.text).join(" ")}`
      )
      .join("\n\n");
  }

  // Fallback to plain transcript
  return (
    data.results?.channels?.[0]?.alternatives?.[0]?.transcript || ""
  );
}

// ---------------------------------------------------------------------------
// AI analysis (summary + action items + sentiment)
// ---------------------------------------------------------------------------

const CallAnalysisSchema = z.object({
  summary: z.string(),
  actionItems: z.array(
    z.object({
      text: z.string(),
      priority: z.enum(["high", "medium", "low"]).optional(),
    })
  ),
  sentiment: z.enum(["positive", "neutral", "negative"]),
});

type CallAnalysis = z.infer<typeof CallAnalysisSchema>;

async function analyzeTranscript(
  transcript: string,
  contactName?: string
): Promise<CallAnalysis> {
  const llm = getDefaultProvider();

  const { data } = await llm.completeJSON(
    [
      {
        role: "system",
        content:
          "You are a CRM assistant that analyzes sales call transcripts. Be concise and actionable.",
      },
      {
        role: "user",
        content: `Analyze this call transcript${contactName ? ` with ${contactName}` : ""}:

${transcript}

Return JSON with:
- "summary": 3-4 sentence summary of the call
- "actionItems": array of { "text": string, "priority": "high"|"medium"|"low" } — concrete follow-up tasks
- "sentiment": "positive" | "neutral" | "negative" — overall call sentiment`,
      },
    ],
    CallAnalysisSchema,
    { temperature: 0.3 }
  );

  return data;
}

// ---------------------------------------------------------------------------
// Process a single recording: transcribe → analyze → update DB → create tasks
// ---------------------------------------------------------------------------

export async function processCallRecording(recordingId: string): Promise<void> {
  const recording = await prisma.callRecording.findUniqueOrThrow({
    where: { id: recordingId },
    include: {
      contact: { select: { id: true, name: true } },
    },
  });

  // Mark as transcribing
  await prisma.callRecording.update({
    where: { id: recordingId },
    data: { status: "transcribing" },
  });

  // Step 1: Transcribe
  const transcript = await transcribeWithDeepgram(recording.recordingUrl);

  await prisma.callRecording.update({
    where: { id: recordingId },
    data: { transcript, status: "transcribed" },
  });

  if (!transcript.trim()) {
    // Empty transcript — nothing to analyze
    return;
  }

  // Step 2: AI analysis
  const analysis = await analyzeTranscript(
    transcript,
    recording.contact?.name
  );

  await prisma.callRecording.update({
    where: { id: recordingId },
    data: {
      summary: analysis.summary,
      actionItems: analysis.actionItems,
      sentiment: analysis.sentiment,
      status: "summarized",
    },
  });

  // Step 3: Auto-create tasks from action items
  if (analysis.actionItems.length > 0 && recording.contactId) {
    for (const item of analysis.actionItems) {
      await prisma.task.create({
        data: {
          userId: recording.userId,
          contactId: recording.contactId,
          title: item.text,
          priority: item.priority || "medium",
        },
      });
    }
  }

  // Step 4: Update relationship score — calls are deep interactions
  if (recording.contactId) {
    await prisma.contact.update({
      where: { id: recording.contactId },
      data: {
        lastContactedAt: recording.occurredAt,
        interactionCount: { increment: 1 },
      },
    }).catch(() => {});

    // Create an EmailInteraction-equivalent for relationship scoring
    await prisma.activity.create({
      data: {
        userId: recording.userId,
        contactId: recording.contactId,
        type: "call",
        title: `Call${recording.contact?.name ? ` with ${recording.contact.name}` : ""} — ${analysis.sentiment}`,
        description: analysis.summary,
      },
    }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Batch processor — called by cron
// ---------------------------------------------------------------------------

export async function processAllPendingRecordings(): Promise<{
  processed: number;
  failed: number;
}> {
  const pending = await prisma.callRecording.findMany({
    where: { status: "recorded" },
    take: 10,
    orderBy: { createdAt: "asc" },
  });

  let processed = 0;
  let failed = 0;

  for (const recording of pending) {
    try {
      await processCallRecording(recording.id);
      processed++;
    } catch (error) {
      console.error(
        `[CallIntel] Failed to process recording ${recording.id}:`,
        error
      );
      failed++;
    }
  }

  return { processed, failed };
}
