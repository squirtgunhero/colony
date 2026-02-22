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
// OpenAI Provider
// ============================================================================

export class OpenAIProvider implements LLMProvider {
  name = "openai";
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(options?: { apiKey?: string; model?: string; baseUrl?: string }) {
    this.apiKey = options?.apiKey || process.env.OPENAI_API_KEY || "";
    this.model = options?.model || "gpt-4o";
    this.baseUrl = options?.baseUrl || "https://api.openai.com/v1";
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.1,
        max_tokens: options?.maxTokens ?? 4096,
        stop: options?.stopSequences,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content || "",
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      finishReason: choice.finish_reason === "stop" ? "stop" : "length",
    };
  }

  async completeJSON<T>(
    messages: LLMMessage[],
    schema: z.ZodType<T>,
    options?: LLMCompletionOptions
  ): Promise<{ data: T; usage: LLMCompletionResult["usage"] }> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.1,
        max_tokens: options?.maxTokens ?? 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content || "{}";

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Failed to parse LLM JSON response: ${content}`);
    }

    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(
        `LLM response validation failed: ${validated.error.message}`
      );
    }

    return {
      data: validated.data,
      usage: {
        promptTokens: result.usage?.prompt_tokens ?? 0,
        completionTokens: result.usage?.completion_tokens ?? 0,
        totalTokens: result.usage?.total_tokens ?? 0,
      },
    };
  }
}

// ============================================================================
// Anthropic Provider
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

export type LLMProviderType = "openai" | "anthropic";

export function createLLMProvider(
  type: LLMProviderType,
  options?: Record<string, string>
): LLMProvider {
  switch (type) {
    case "openai":
      return new OpenAIProvider(options);
    case "anthropic":
      return new AnthropicProvider(options);
    default:
      throw new Error(`Unknown LLM provider: ${type}`);
  }
}

export function getDefaultProvider(): LLMProvider {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIProvider();
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider();
  }
  throw new Error(
    "No LLM API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in your environment."
  );
}

