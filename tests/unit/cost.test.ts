import { describe, expect, it } from "vitest";
import { estimateCost } from "@/lib/cost/pricing";

describe("estimateCost", () => {
  it("returns a positive estimate for paid models", () => {
    expect(estimateCost(2000, "llama-3.3-70b-versatile").costUsd).toBeGreaterThan(0);
  });
});
