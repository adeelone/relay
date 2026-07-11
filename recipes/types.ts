import type { z, ZodType } from "zod";
import type { CostEstimate, TaskContext } from "@/lib/jobs/types";

export interface Recipe<TInput extends Record<string, unknown>, TOutput> {
  id: string;
  name: string;
  description: string;
  inputSchema: ZodType<TInput, z.ZodTypeDef, unknown>;
  outputSchema: ZodType<TOutput, z.ZodTypeDef, unknown>;
  sampleInput: TInput;
  estimateCost(input: TInput): CostEstimate;
  run(input: TInput, ctx: TaskContext): Promise<TOutput>;
  supportsStreaming: boolean;
}

export type AnyRecipe = Recipe<Record<string, unknown>, unknown>;
export type RecipeInput<T extends AnyRecipe> = z.infer<T["inputSchema"]>;
