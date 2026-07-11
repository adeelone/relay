import { z } from "zod";
import type { Recipe } from "../types";
import { estimateRecipeCost, generateStructured } from "../helpers";

const inputSchema = z.object({
  messages: z.array(z.object({ from: z.string(), subject: z.string(), body: z.string() })).min(1)
});

const outputSchema = z.object({
  items: z.array(
    z.object({
      subject: z.string(),
      category: z.enum(["urgent", "FYI", "can-wait", "spam-like"]),
      reason: z.string()
    })
  )
});

export const inboxTriageRecipe: Recipe<z.infer<typeof inputSchema>, z.infer<typeof outputSchema>> = {
  id: "inbox-triage",
  name: "Inbox Triage",
  description: "Categorize batches of email or message text with reasons.",
  inputSchema,
  outputSchema,
  sampleInput: {
    messages: [
      { from: "ops@example.com", subject: "Webhook failures", body: "Three deliveries failed after retries." },
      { from: "newsletter@example.com", subject: "Weekly roundup", body: "Links and product updates." }
    ]
  },
  estimateCost: estimateRecipeCost,
  supportsStreaming: false,
  async run(input, ctx) {
    const result = await generateStructured<z.infer<typeof outputSchema>>(
      [
        { role: "system", content: "Return JSON that triages each message into urgent, FYI, can-wait, or spam-like." },
        { role: "user", content: JSON.stringify(input) }
      ],
      ctx
    );
    return outputSchema.parse(result.data);
  }
};
