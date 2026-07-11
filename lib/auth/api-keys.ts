import { createHash, randomBytes } from "node:crypto";

export function createApiKey(prefix = "rly") {
  const secret = `${prefix}_${randomBytes(24).toString("base64url")}`;
  return { secret, hash: hashApiKey(secret), prefix };
}

export function hashApiKey(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function getCallerFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const key = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  return {
    apiKey: key,
    apiKeyHash: key ? hashApiKey(key) : undefined,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
  };
}
