import type { LLMMessage, LLMProvider, LLMResponse } from "./types";

export class MockLLMProvider implements LLMProvider {
  id = "mock";

  async generate(messages: LLMMessage[]): Promise<LLMResponse> {
    const prompt = messages.map((message) => message.content).join("\n").slice(0, 400);
    return {
      text: JSON.stringify({
        summary: `Mocked analysis for: ${prompt}`,
        items: [
          { title: "Confirm owner", priority: "high", detail: "Assign a directly responsible owner." },
          { title: "Publish result", priority: "medium", detail: "Deliver the output through the requested channel." }
        ],
        nextSteps: ["Review generated output", "Trigger webhook delivery", "Mark job unread in-app"]
      }),
      usage: {
        promptTokens: Math.max(80, Math.round(prompt.length / 4)),
        completionTokens: 180,
        model: "mock"
      }
    };
  }
}
