import { describe, expect, it } from "vitest";
import { memoryDb } from "@/lib/db/memory";
import { cancelJob, getJobSnapshot, retryJob } from "@/lib/jobs/service";

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

  it("scopes job access to the owning API key", async () => {
    await memoryDb.createJob({
      id: "job_unit_owned",
      recipe: "task-planner",
      input: {
        task: "Create a beta launch checklist for Relay.",
        urgency: "normal",
      },
      status: "failed",
      delivery: { inApp: true },
      apiKeyId: "owner-hash",
      costUsd: 0,
      promptTokens: 0,
      completionTokens: 0,
      attempts: 1,
      queuedAt: new Date().toISOString(),
    });

    // An unrelated caller with their own API key cannot read, cancel, or
    // retry someone else's job.
    const otherCaller = { apiKeyHash: "someone-elses-hash" };
    expect(await getJobSnapshot("job_unit_owned", otherCaller)).toBeUndefined();
    expect(await cancelJob("job_unit_owned", otherCaller)).toBeUndefined();
    expect(await retryJob("job_unit_owned", otherCaller)).toBeUndefined();

    // The owning caller can.
    const owner = { apiKeyHash: "owner-hash" };
    expect((await getJobSnapshot("job_unit_owned", owner))?.job.id).toBe(
      "job_unit_owned",
    );
    expect((await retryJob("job_unit_owned", owner))?.status).toBe("queued");

    // Unauthenticated (no API key) callers keep local/dashboard admin access.
    expect((await getJobSnapshot("job_unit_owned"))?.job.id).toBe(
      "job_unit_owned",
    );
  });
});
