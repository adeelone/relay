import { describe, expect, it } from "vitest";
import { takeToken } from "@/lib/rate-limit/token-bucket";

describe("token bucket", () => {
  it("blocks after the configured limit", () => {
    expect(takeToken("unit-bucket", 1).allowed).toBe(true);
    expect(takeToken("unit-bucket", 1).allowed).toBe(false);
  });
});
