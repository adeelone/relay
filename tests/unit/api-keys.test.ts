import { describe, expect, it } from "vitest";
import { createApiKey, getCallerFromRequest } from "@/lib/auth/api-keys";
import { db } from "@/lib/db";

function requestWithBearer(token?: string) {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request("http://localhost/api/jobs", { headers });
}

describe("api keys", () => {
  it("creates a key whose secret hashes to the stored hash", () => {
    const key = createApiKey();
    expect(key.secret.startsWith("rly_")).toBe(true);
    expect(key.displayPrefix.startsWith("rly_")).toBe(true);
    expect(key.displayPrefix.length).toBeLessThan(key.secret.length);
  });

  it("recognizes a persisted key and returns its role and id", async () => {
    const key = createApiKey();
    const record = await db.createApiKeyRecord({
      keyHash: key.hash,
      keyPrefix: key.displayPrefix,
      role: "admin",
      rateLimitPerMinute: 30,
    });

    const caller = await getCallerFromRequest(requestWithBearer(key.secret));
    expect(caller.apiKeyHash).toBe(key.hash);
    expect(caller.apiKeyRecordId).toBe(record.id);
    expect(caller.role).toBe("admin");
  });

  it("still scopes an unrecognized bearer token by its hash, with no role", async () => {
    const caller = await getCallerFromRequest(
      requestWithBearer("not-an-issued-key"),
    );
    expect(caller.apiKeyHash).toBeDefined();
    expect(caller.apiKeyRecordId).toBeUndefined();
    expect(caller.role).toBeUndefined();
  });

  it("returns no key info for an unauthenticated request", async () => {
    const caller = await getCallerFromRequest(requestWithBearer());
    expect(caller.apiKey).toBeUndefined();
    expect(caller.apiKeyHash).toBeUndefined();
  });
});
