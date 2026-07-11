import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhookPayload(payload: string, secret = process.env.WEBHOOK_SIGNING_SECRET ?? "dev-secret") {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyWebhookPayload(payload: string, signature: string, secret = process.env.WEBHOOK_SIGNING_SECRET ?? "dev-secret") {
  const expected = signWebhookPayload(payload, secret);
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function deliverWebhook(url: string, payload: unknown) {
  const body = JSON.stringify(payload);
  const signature = signWebhookPayload(body);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-relay-signature": signature
    },
    body
  });
  return { ok: response.ok, status: response.status };
}
