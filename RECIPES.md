# Recipes

Recipes are self-contained modules: input schema, output schema, prompts, cost estimate, runner, and dashboard metadata.

```ts
interface Recipe<TInput, TOutput> {
  id: string;
  inputSchema: ZodSchema<TInput>;
  outputSchema: ZodSchema<TOutput>;
  estimateCost(input: TInput): CostEstimate;
  run(input: TInput, ctx: TaskContext): Promise<TOutput>;
  supportsStreaming: boolean;
}
```

## Add A Sixth Recipe

1. Create `recipes/my-recipe/index.ts`.
2. Define `inputSchema`, `outputSchema`, `sampleInput`, `estimateCost`, and `run`.
3. Register it in `recipes/registry.ts`.
4. Add a dashboard icon mapping if needed.
5. Add valid and invalid schema fixtures in `tests/unit/recipes.test.ts`.

No API route, queue, or worker runtime changes should be needed.

## Streaming

Call `ctx.emit({ message, chunk })` during long steps. The SSE route reads the stored events and live subscriber stream.
