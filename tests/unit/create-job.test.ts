import { describe, expect, it } from "vitest";
import { createJob } from "@/lib/jobs/service";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("createJob", () => {
  it("returns invalid_request instead of throwing for an unknown recipe", async () => {
    const result = await createJob(
      jsonRequest({ recipe: "does-not-exist", input: {} }),
    );
    expect(result).toMatchObject({ error: "invalid_request" });
  });

  it("returns invalid_request instead of throwing for input that fails the recipe schema", async () => {
    const result = await createJob(
      jsonRequest({ recipe: "task-planner", input: { task: "" } }),
    );
    expect(result).toMatchObject({ error: "invalid_request" });
  });

  it("queues a job for valid input", async () => {
    const result = await createJob(
      jsonRequest({
        recipe: "task-planner",
        input: { task: "Plan the Relay private beta launch checklist." },
      }),
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.job.status).toBe("queued");
    }
  });
});
