import { z } from "zod";
import type { Recipe } from "../types";
import { estimateRecipeCost, generateStructured } from "../helpers";

const inputSchema = z.object({
  task: z.string().min(10),
  context: z.string().optional(),
  urgency: z.enum(["low", "normal", "high"]).default("normal"),
});

const outputSchema = z.object({
  summary: z.string(),
  items: z.array(
    z.object({ title: z.string(), priority: z.string(), detail: z.string() }),
  ),
  nextSteps: z.array(z.string()),
});

export const taskPlannerRecipe: Recipe<
  z.infer<typeof inputSchema>,
  z.infer<typeof outputSchema>
> = {
  id: "task-planner",
  name: "Task Planner",
  description: "Turn free-text work into a prioritized execution plan.",
  inputSchema,
  outputSchema,
  sampleInput: {
    task: "Plan a launch checklist for the Relay private beta and identify risks.",
    context: "Small team, two weeks, technical users.",
    urgency: "high",
  },
  estimateCost: estimateRecipeCost,
  supportsStreaming: true,
  async run(input, ctx) {
    const result = await generateStructured<z.infer<typeof outputSchema>>(
      [
        {
          role: "system",
          content:
            "Return JSON with summary, items, and nextSteps for a pragmatic task plan.",
        },
        { role: "user", content: JSON.stringify(input) },
      ],
      ctx,
    );
    return outputSchema.parse(result.data);
  },
};
