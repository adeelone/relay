import type { LLMMessage, LLMProvider, LLMResponse } from "./types";

export class GroqProvider implements LLMProvider {
  id = "groq";

  constructor(private readonly apiKey = process.env.GROQ_API_KEY) {}

  async generate(messages: LLMMessage[], options?: { temperature?: number }): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: options?.temperature ?? 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`Groq request failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };

    return {
      text: payload.choices[0]?.message.content ?? "{}",
      usage: {
        promptTokens: payload.usage?.prompt_tokens ?? 0,
        completionTokens: payload.usage?.completion_tokens ?? 0,
        model: payload.model ?? "llama-3.3-70b-versatile"
      }
    };
  }
}
