import { z } from "zod";
import type { Recipe } from "../types";
import { estimateRecipeCost, runStructuredRecipe } from "../helpers";

const inputSchema = z.object({
  notes: z.string().min(20),
  attendees: z.array(z.string()).default([]),
});

const outputSchema = z.object({
  decisions: z.array(z.string()),
  actionItems: z.array(
    z.object({
      owner: z.string(),
      task: z.string(),
      due: z.string().optional(),
    }),
  ),
  openQuestions: z.array(z.string()),
});

export const meetingNotesRecipe: Recipe<
  z.infer<typeof inputSchema>,
  z.infer<typeof outputSchema>
> = {
  id: "meeting-notes",
  name: "Meeting Notes",
  description:
    "Distill transcripts into decisions, owners, and open questions.",
  inputSchema,
  outputSchema,
  sampleInput: {
    notes:
      "We agreed to ship the beta to five teams, keep webhook delivery in scope, and defer Slack.",
    attendees: ["Maya", "Ibrahim", "Noor"],
  },
  estimateCost: estimateRecipeCost,
  supportsStreaming: false,
  async run(input, ctx) {
    return runStructuredRecipe(
      "Return JSON with decisions, actionItems, and openQuestions from meeting notes.",
      input,
      outputSchema,
      ctx,
    );
  },
};
