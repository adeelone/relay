import { z } from "zod";
import type { Recipe } from "../types";
import { estimateRecipeCost, runStructuredRecipe } from "../helpers";

const inputSchema = z.object({
  diff: z.string().min(20),
  focus: z
    .array(z.enum(["bug", "style", "security", "performance"]))
    .default(["bug", "security"]),
});

const outputSchema = z.object({
  findings: z.array(
    z.object({
      category: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      title: z.string(),
      detail: z.string(),
      suggestedFix: z.string().optional(),
    }),
  ),
});

export const codeReviewRecipe: Recipe<
  z.infer<typeof inputSchema>,
  z.infer<typeof outputSchema>
> = {
  id: "code-review",
  name: "Code Review",
  description: "Review diffs for bugs, security, performance, and style risks.",
  inputSchema,
  outputSchema,
  sampleInput: {
    diff: "diff --git a/app.ts b/app.ts\n+ const token = process.env.API_KEY\n+ console.log(token)",
    focus: ["bug", "security"],
  },
  estimateCost: estimateRecipeCost,
  supportsStreaming: false,
  async run(input, ctx) {
    return runStructuredRecipe(
      "Return JSON with categorized code review findings. Be concise and actionable.",
      input,
      outputSchema,
      ctx,
    );
  },
};
