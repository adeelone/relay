import type { CostEstimate } from "@/lib/jobs/types";

const pricingPerMillion: Record<string, { input: number; output: number }> = {
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "claude-3-5-haiku-latest": { input: 0.8, output: 4.0 },
  mock: { input: 0, output: 0 }
};

export function estimateTokensFromText(text: string) {
  return Math.max(100, Math.ceil(text.length / 4));
}

export function estimateCost(tokens: number, model = "llama-3.3-70b-versatile"): CostEstimate {
  const prices = pricingPerMillion[model] ?? pricingPerMillion["llama-3.3-70b-versatile"];
  const promptTokens = Math.round(tokens * 0.7);
  const completionTokens = tokens - promptTokens;
  const costUsd = (promptTokens / 1_000_000) * prices.input + (completionTokens / 1_000_000) * prices.output;
  return { tokens, model, costUsd };
}

export function computeActualCost(promptTokens: number, completionTokens: number, model: string) {
  const prices = pricingPerMillion[model] ?? pricingPerMillion["llama-3.3-70b-versatile"];
  return (promptTokens / 1_000_000) * prices.input + (completionTokens / 1_000_000) * prices.output;
}
