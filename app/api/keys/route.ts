import { NextResponse } from "next/server";
import { createApiKey } from "@/lib/auth/api-keys";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const keys = await db.listApiKeys();
  return NextResponse.json({
    keys: keys.map((key) => ({
      id: key.id,
      prefix: key.keyPrefix,
      role: key.role,
      rateLimitPerMinute: key.rateLimitPerMinute,
      createdAt: key.createdAt,
      revokedAt: key.revokedAt,
    })),
  });
}

export async function POST() {
  const key = createApiKey();
  const record = await db.createApiKeyRecord({
    keyHash: key.hash,
    keyPrefix: key.displayPrefix,
    role: "user",
    rateLimitPerMinute: 30,
  });
  // The secret is returned exactly once, at issuance — only its hash is
  // ever persisted, matching how every real API-key system works.
  return NextResponse.json(
    { id: record.id, apiKey: key.secret, prefix: record.keyPrefix },
    { status: 201 },
  );
}
