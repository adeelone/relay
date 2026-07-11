import { AnthropicProvider } from "./anthropic";
import { GroqProvider } from "./groq";
import { MockLLMProvider } from "./mock";
import { OpenAIProvider } from "./openai";
import type { LLMProvider } from "./types";

export function getLLMProvider(): LLMProvider {
  if (process.env.GROQ_API_KEY) return new GroqProvider();
  if (process.env.OPENAI_API_KEY) return new OpenAIProvider();
  if (process.env.ANTHROPIC_API_KEY) return new AnthropicProvider();
  return new MockLLMProvider();
}
