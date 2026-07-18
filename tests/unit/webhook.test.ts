import { describe, expect, it } from "vitest";
import {
  signWebhookPayload,
  verifyWebhookPayload,
} from "@/lib/delivery/webhook";

describe("webhook signatures", () => {
  it("verifies signed payloads", () => {
    const payload = JSON.stringify({ jobId: "job_1" });
    const signature = signWebhookPayload(payload, "secret");
    expect(verifyWebhookPayload(payload, signature, "secret")).toBe(true);
  });
});
