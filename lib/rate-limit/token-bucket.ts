const buckets = new Map<string, { tokens: number; updatedAt: number }>();

export function takeToken(key: string, limit = 30, refillPerMinute = 30) {
  const now = Date.now();
  const current = buckets.get(key) ?? { tokens: limit, updatedAt: now };
  const elapsedMinutes = (now - current.updatedAt) / 60_000;
  current.tokens = Math.min(limit, current.tokens + elapsedMinutes * refillPerMinute);
  current.updatedAt = now;

  if (current.tokens < 1) {
    buckets.set(key, current);
    return { allowed: false, retryAfterSeconds: Math.ceil(((1 - current.tokens) / refillPerMinute) * 60) };
  }

  current.tokens -= 1;
  buckets.set(key, current);
  return { allowed: true, retryAfterSeconds: 0 };
}
