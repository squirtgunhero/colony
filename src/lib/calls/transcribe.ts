// ============================================================================
// CALL TRANSCRIPTION + AI ANALYSIS PIPELINE
// Transcribes call recordings via OpenAI Whisper, then analyzes with Claude
// ============================================================================

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AnthropicProvider } from "@/lam/llm";

// ============================================================================
// Schemas
// ============================================================================

const CallAnalysisSchema = z.object({
  summary: z.string().describe("2-3 sentence summary of the call"),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed"]),
  sentimentScore: z.number().min(-1).max(1).describe("-1 = very negative, 1 = very positive"),
  keyTopics: z.array(z.string()).describe("Main topics discussed (3-8 items)"),
  objections: z.array(z.object({
    objection: z.string(),
    response: z.string().optional(),
    resolved: z.boolean(),
  })).describe("Client objections raised during the call"),
  talkListenRatio: z.number().min(0).max(1).describe("0-1, fraction of time the agent spoke vs listened"),
  actionItems: z.array(z.string()).describe("Follow-up actions identified"),
});

type CallAnalysis = z.infer<typeof CallAnalysisSchema>;

// ============================================================================
// Transcription (OpenAI Whisper)
// ============================================================================

async function transcribeRecording(recordingUrl: string): Promise<string> {
  // Fetch the recording audio from Twilio
  const audioResponse = await fetch(recordingUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString("base64")}`,
    },
  });

  if (!audioResponse.ok) {
    throw new Error(`Failed to fetch recording: ${audioResponse.status}`);
  }

  const audioBlob = await audioResponse.blob();

  // Send to OpenAI Whisper
  const form = new FormData();
  form.append("file", audioBlob, "recording.wav");
  form.append("model", "whisper-1");
  form.append("language", "en");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");

  const whisperResponse = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: form,
    }
  );

  if (!whisperResponse.ok) {
    const err = await whisperResponse.text();
    throw new Error(`Whisper transcription failed: ${whisperResponse.status} - ${err}`);
  }

  const data = await whisperResponse.json();
  return data.text ?? "";
}

// ============================================================================
// AI Analysis (Claude via AnthropicProvider)
// ============================================================================

async function analyzeTranscript(
  transcript: string,
  contactName?: string
): Promise<CallAnalysis> {
  const llm = new AnthropicProvider();

  const systemPrompt = `You are an AI sales call analyst for a real estate CRM called Colony.
Analyze the following call transcript and extract structured insights.

Guidelines:
- Identify the agent (CRM user) vs the client/lead in the conversation
- Sentiment reflects the CLIENT's sentiment toward the deal/relationship
- Talk-listen ratio estimates how much the AGENT talked vs listened (0 = all listening, 1 = all talking)
- Key topics should be specific and actionable (e.g., "Property pricing at $450K", not just "pricing")
- Objections are specific concerns the client raised
- Action items are concrete next steps mentioned or implied

Respond with valid JSON only. No markdown, no explanation.`;

  const userPrompt = `Analyze this call transcript${contactName ? ` with ${contactName}` : ""}:

---
${transcript}
---

Return a JSON object with: summary, sentiment (positive/neutral/negative/mixed), sentimentScore (-1 to 1), keyTopics (string[]), objections ({objection, response?, resolved}[]), talkListenRatio (0-1), actionItems (string[]).`;

  const result = await llm.completeJSON(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    CallAnalysisSchema,
    { temperature: 0.3, maxTokens: 2048 }
  );

  return result.data;
}

// ============================================================================
// Main Processing Pipeline
// ============================================================================

export async function processCallRecording(callRecordingId: string): Promise<void> {
  try {
    // Update status to transcribing
    await prisma.callRecording.update({
      where: { id: callRecordingId },
      data: { analysisStatus: "transcribing" },
    });

    const recording = await prisma.callRecording.findUnique({
      where: { id: callRecordingId },
      include: { contact: { select: { name: true } } },
    });

    if (!recording || !recording.recordingUrl) {
      throw new Error("Recording not found or no URL available");
    }

    // Step 1: Transcribe
    const transcript = await transcribeRecording(recording.recordingUrl);

    await prisma.callRecording.update({
      where: { id: callRecordingId },
      data: { transcript, analysisStatus: "analyzing" },
    });

    // Step 2: AI Analysis
    const analysis = await analyzeTranscript(transcript, recording.contact?.name ?? undefined);

    // Step 3: Save results
    await prisma.callRecording.update({
      where: { id: callRecordingId },
      data: {
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        keyTopics: analysis.keyTopics,
        objections: analysis.objections,
        talkListenRatio: analysis.talkListenRatio,
        actionItems: analysis.actionItems,
        analysisStatus: "complete",
      },
    });

    // Also create an Activity entry for the timeline
    await prisma.activity.create({
      data: {
        userId: recording.userId,
        contactId: recording.contactId,
        type: "call",
        title: `Call with ${recording.contact?.name || recording.toNumber}`,
        description: analysis.summary,
        metadata: JSON.stringify({
          callRecordingId: recording.id,
          duration: recording.duration,
          sentiment: analysis.sentiment,
          sentimentScore: analysis.sentimentScore,
        }),
      },
    });
  } catch (error) {
    console.error("Call recording processing failed:", error);
    await prisma.callRecording.update({
      where: { id: callRecordingId },
      data: {
        analysisStatus: "failed",
        analysisError: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

// ============================================================================
// Batch Processing (Cron)
// ============================================================================

/**
 * Process all pending call recordings (for cron jobs)
 */
export async function processAllPendingRecordings(): Promise<{
  processed: number;
  failed: number;
}> {
  const pending = await prisma.callRecording.findMany({
    where: {
      analysisStatus: "pending",
      recordingUrl: { not: null },
    },
    select: { id: true },
    take: 10, // Process max 10 at a time
  });

  let processed = 0;
  let failed = 0;

  for (const recording of pending) {
    try {
      await processCallRecording(recording.id);
      processed++;
    } catch {
      failed++;
    }
  }

  return { processed, failed };
}
