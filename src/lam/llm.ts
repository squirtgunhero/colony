// ============================================================================
// COLONY LAM - LLM Provider Abstraction
// Swappable interface for different LLM providers
// ============================================================================

import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface LLMCompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: "stop" | "length" | "content_filter" | "error";
}

export interface LLMProvider {
  name: string;
  complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResult>;
  completeJSON<T>(
    messages: LLMMessage[],
    schema: z.ZodType<T>,
    options?: LLMCompletionOptions
  ): Promise<{ data: T; usage: LLMCompletionResult["usage"] }>;
}

// ============================================================================
// Anthropic Provider (Tara uses Claude)
// ============================================================================

export class AnthropicProvider implements LLMProvider {
  name = "anthropic";
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(options?: { apiKey?: string; model?: string; baseUrl?: string }) {
    this.apiKey = options?.apiKey || process.env.ANTHROPIC_API_KEY || "";
    this.model = options?.model || "claude-sonnet-4-20250514";
    this.baseUrl = options?.baseUrl || "https://api.anthropic.com/v1";
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResult> {
    // Extract system message
    const systemMessage = messages.find((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options?.maxTokens ?? 4096,
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        system: systemMessage?.content,
        messages: nonSystemMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const textContent = data.content.find(
      (c: { type: string }) => c.type === "text"
    );

    return {
      content: textContent?.text || "",
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens:
          (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
      finishReason: data.stop_reason === "end_turn" ? "stop" : "length",
    };
  }

  async completeJSON<T>(
    messages: LLMMessage[],
    schema: z.ZodType<T>,
    options?: LLMCompletionOptions
  ): Promise<{ data: T; usage: LLMCompletionResult["usage"] }> {
    // Add JSON instruction to the last message
    const modifiedMessages = [...messages];
    const lastUserIdx = modifiedMessages.findLastIndex(
      (m) => m.role === "user"
    );
    if (lastUserIdx >= 0) {
      modifiedMessages[lastUserIdx] = {
        ...modifiedMessages[lastUserIdx],
        content: `${modifiedMessages[lastUserIdx].content}\n\nRespond with valid JSON only. No markdown, no explanation.`,
      };
    }

    const result = await this.complete(modifiedMessages, options);

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonContent = result.content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.slice(7);
    }
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      throw new Error(`Failed to parse LLM JSON response: ${jsonContent}`);
    }

    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(
        `LLM response validation failed: ${validated.error.message}`
      );
    }

    return {
      data: validated.data,
      usage: result.usage,
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export type LLMProviderType = "anthropic";

export function createLLMProvider(
  type: LLMProviderType,
  options?: Record<string, string>
): LLMProvider {
  if (type === "anthropic") {
    return new AnthropicProvider(options);
  }
  throw new Error(`Unknown LLM provider: ${type}`);
}

export function getDefaultProvider(): LLMProvider {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "Tara requires ANTHROPIC_API_KEY. Get one at console.anthropic.com"
    );
  }
  const modelOverride = process.env.TARA_LLM_MODEL;
  return new AnthropicProvider(
    modelOverride ? { model: modelOverride } : undefined
  );
}

