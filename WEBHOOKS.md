# Webhooks

Relay posts this payload when a job reaches a terminal state:

```json
{
  "jobId": "job_123",
  "status": "complete",
  "output": {}
}
```

The `x-relay-signature` header is an HMAC-SHA256 hex digest of the raw JSON body.

## Node Verification

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verify(body: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex"),
  );
}
```

## Python Verification

```python
import hmac
import hashlib

def verify(body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)
```

Webhook retries use exponential backoff and stop after terminal failure is recorded.
