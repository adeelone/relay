import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export function createApiKey(prefix = "rly") {
  const secret = `${prefix}_${randomBytes(24).toString("base64url")}`;
  return {
    secret,
    hash: hashApiKey(secret),
    prefix,
    displayPrefix: secret.slice(0, prefix.length + 9),
  };
}

export function hashApiKey(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

/**
 * Resolves the caller's identity from the Authorization header. A bearer
 * token that matches an issued, non-revoked key (via lib/db's api_keys
 * store) carries its real id and role. An unrecognized token still scopes
 * jobs by its hash — preserving the original "any bearer token is an opaque
 * per-caller bucket" behavior for anyone not using issued keys — it just
 * won't carry a role or a stable issued-key id.
 */
export async function getCallerFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const key = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : undefined;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!key) {
    return {
      apiKey: undefined,
      apiKeyHash: undefined,
      apiKeyRecordId: undefined,
      role: undefined,
      rateLimitPerMinute: undefined,
      ip,
    };
  }
  const apiKeyHash = hashApiKey(key);
  const record = await db.getApiKeyByHash(apiKeyHash);
  return {
    apiKey: key,
    apiKeyHash,
    apiKeyRecordId: record?.id,
    role: record?.role,
    rateLimitPerMinute: record?.rateLimitPerMinute,
    ip,
  };
}
