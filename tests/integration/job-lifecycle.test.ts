import { describe, expect, it } from "vitest";
import { memoryDb } from "@/lib/db/memory";
import { getJobSnapshot } from "@/lib/jobs/service";

describe("job lifecycle", () => {
  it("queues a job and returns a status snapshot", async () => {
    await memoryDb.createJob({
      id: "job_unit_lifecycle",
      recipe: "task-planner",
      input: {
        task: "Create a beta launch checklist for Relay.",
        urgency: "normal",
      },
      status: "queued",
      delivery: { inApp: true },
      costUsd: 0,
      promptTokens: 0,
      completionTokens: 0,
      attempts: 0,
      queuedAt: new Date().toISOString(),
    });
    const snapshot = await getJobSnapshot("job_unit_lifecycle");
    expect(snapshot?.job.status).toBe("queued");
  });
});
