import { NextResponse } from "next/server";
import { createApiKey } from "@/lib/auth/api-keys";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    keys: [{ id: "dev-key", prefix: "rly", role: "admin", rateLimitPerMinute: 30, deliveryDefault: "in-app" }]
  });
}

export async function POST() {
  const key = createApiKey();
  return NextResponse.json({ apiKey: key.secret, prefix: key.prefix }, { status: 201 });
}
