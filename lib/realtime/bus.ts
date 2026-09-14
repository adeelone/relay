import type { JobEventRecord } from "@/lib/jobs/types";
import { logEvent } from "@/lib/logging/logger";
import { publishLocal, subscribeLocal } from "./local";
import {
  checkRedisHealth,
  ensureRedisChannel,
  publishRedis,
  releaseRedisChannel,
} from "./redis";

export const redisConfigured = Boolean(process.env.REDIS_URL);

let redisHealthy = false;

const ready: Promise<void> = redisConfigured
  ? checkRedisHealth()
      .then(() => {
        redisHealthy = true;
        logEvent("info", "realtime_backend_selected", { backend: "redis" });
      })
      .catch((error: unknown) => {
        logEvent("warn", "realtime_backend_fallback", {
          backend: "local",
          reason: error instanceof Error ? error.message : "unknown error",
        });
      })
  : Promise.resolve();

const localSubscriberCounts = new Map<string, number>();

/**
 * Publishes immediately over whichever backend is currently known-active.
 * Events published before the readiness probe settles use the local emitter,
 * which is always correct for same-process delivery; once Redis is confirmed
 * healthy, subsequent publishes fan out across processes via Redis pub/sub
 * (which also bridges back into the local emitter — see redis.ts).
 */
export function publishJobEvent(event: JobEventRecord) {
  if (redisHealthy) {
    publishRedis(event);
  } else {
    publishLocal(event);
  }
}

/**
 * Always registers on the local emitter (synchronous, zero-latency). If Redis
 * is configured, also ensures a Redis subscription exists for this job so
 * events published by other processes get bridged in. Safe to call before the
 * startup health check resolves.
 */
export function subscribeToJob(
  jobId: string,
  listener: (event: JobEventRecord) => void,
) {
  const unsubscribeLocal = subscribeLocal(jobId, listener);
  if (redisConfigured) {
    void ready.then(() => {
      if (redisHealthy) ensureRedisChannel(jobId);
    });
    localSubscriberCounts.set(
      jobId,
      (localSubscriberCounts.get(jobId) ?? 0) + 1,
    );
  }
  return () => {
    unsubscribeLocal();
    if (redisConfigured) {
      const remaining = (localSubscriberCounts.get(jobId) ?? 1) - 1;
      if (remaining <= 0) {
        localSubscriberCounts.delete(jobId);
        releaseRedisChannel(jobId);
      } else {
        localSubscriberCounts.set(jobId, remaining);
      }
    }
  };
}
