import { z } from "zod";
import { getSearchProvider } from "@/lib/search";
import type { Recipe } from "../types";
import { estimateRecipeCost, runStructuredRecipe } from "../helpers";

const inputSchema = z.object({
  topic: z.string().min(3),
  depth: z.enum(["brief", "standard", "deep"]).default("standard"),
});

const outputSchema = z.object({
  brief: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
      citations: z.array(z.string().url()),
    }),
  ),
});

export const researchDigestRecipe: Recipe<
  z.infer<typeof inputSchema>,
  z.infer<typeof outputSchema>
> = {
  id: "research-digest",
  name: "Research Digest",
  description: "Build a sourced brief from a topic or URL.",
  inputSchema,
  outputSchema,
  sampleInput: {
    topic: "Render Workflows for long-running AI jobs",
    depth: "standard",
  },
  estimateCost: estimateRecipeCost,
  supportsStreaming: true,
  async run(input, ctx) {
    const sources = await getSearchProvider().search(input.topic);
    await ctx.emit({
      message: "Search sources gathered",
      chunk: `${sources.length} citations collected.\n`,
    });
    return runStructuredRecipe(
      "Return JSON with brief and questions. Preserve citation URLs from the supplied sources.",
      { input, sources },
      outputSchema,
      ctx,
    );
  },
};
