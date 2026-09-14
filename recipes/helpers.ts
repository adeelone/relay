import type { z, ZodType } from "zod";
import { estimateCost, estimateTokensFromText } from "@/lib/cost/pricing";
import { getLLMProvider } from "@/lib/llm";
import type { LLMMessage } from "@/lib/llm/types";
import type { CostEstimate, TaskContext } from "@/lib/jobs/types";

export function estimateRecipeCost(
  input: Record<string, unknown>,
): CostEstimate {
  return estimateCost(estimateTokensFromText(JSON.stringify(input)) + 600);
}

export async function generateStructured<T>(
  messages: LLMMessage[],
  ctx: TaskContext,
): Promise<{
  data: T;
  usage: { promptTokens: number; completionTokens: number; model: string };
}> {
  await ctx.emit({
    message: "Calling LLM provider",
    chunk: "Provider request started.\n",
  });
  const response = await getLLMProvider().generate(messages, {
    temperature: 0.2,
  });
  await ctx.emit({
    message: "Provider returned structured output",
    chunk: "Provider response received.\n",
  });
  return {
    data: JSON.parse(response.text) as T,
    usage: response.usage,
  };
}

/**
 * Shared "call the LLM for one JSON-shaped result" path used by every recipe.
 * `userPayload` is JSON-stringified as the user message content — most
 * recipes pass their parsed input directly; research-digest passes
 * `{ input, sources }` to include gathered search results.
 */
export async function runStructuredRecipe<T>(
  systemPrompt: string,
  userPayload: unknown,
  outputSchema: ZodType<T, z.ZodTypeDef, unknown>,
  ctx: TaskContext,
): Promise<T> {
  const result = await generateStructured<T>(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(userPayload) },
    ],
    ctx,
  );
  return outputSchema.parse(result.data);
}
