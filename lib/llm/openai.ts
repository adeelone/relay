import type { LLMMessage, LLMProvider, LLMResponse } from "./types";

export class OpenAIProvider implements LLMProvider {
  id = "openai";

  constructor(private readonly apiKey = process.env.OPENAI_API_KEY) {}

  async generate(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY is not configured");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok)
      throw new Error(`OpenAI request failed: ${response.status}`);
    const payload = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      text: payload.choices[0]?.message.content ?? "{}",
      usage: {
        promptTokens: payload.usage?.prompt_tokens ?? 0,
        completionTokens: payload.usage?.completion_tokens ?? 0,
        model: "gpt-4o-mini",
      },
    };
  }
}
