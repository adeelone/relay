import type { LLMMessage, LLMProvider, LLMResponse } from "./types";

export class AnthropicProvider implements LLMProvider {
  id = "anthropic";

  constructor(private readonly apiKey = process.env.ANTHROPIC_API_KEY) {}

  async generate(messages: LLMMessage[]): Promise<LLMResponse> {
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
    const system = messages.find((message) => message.role === "system")?.content;
    const userMessages = messages.filter((message) => message.role !== "system");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 1200,
        system,
        messages: userMessages
      })
    });
    if (!response.ok) throw new Error(`Anthropic request failed: ${response.status}`);
    const payload = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    return {
      text: payload.content.find((part) => part.type === "text")?.text ?? "{}",
      usage: {
        promptTokens: payload.usage?.input_tokens ?? 0,
        completionTokens: payload.usage?.output_tokens ?? 0,
        model: "claude-3-5-haiku-latest"
      }
    };
  }
}
