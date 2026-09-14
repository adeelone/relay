import Redis from "ioredis";
import type { JobEventRecord } from "@/lib/jobs/types";
import { localEmitter } from "./local";

const CHANNEL_PREFIX = "relay:job:";

let publisher: Redis | undefined;
let subscriber: Redis | undefined;
const subscribedChannels = new Set<string>();

function requireUrl() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not configured");
  return url;
}

function getPublisher() {
  publisher ??= new Redis(requireUrl(), {
    maxRetriesPerRequest: 2,
    lazyConnect: false,
  });
  return publisher;
}

function getSubscriber() {
  if (!subscriber) {
    subscriber = new Redis(requireUrl(), {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
    });
    subscriber.on("message", (channel: string, message: string) => {
      if (!channel.startsWith(CHANNEL_PREFIX)) return;
      const jobId = channel.slice(CHANNEL_PREFIX.length);
      try {
        const event = JSON.parse(message) as JobEventRecord;
        // Bridge into the shared local emitter so subscribers have one
        // delivery path regardless of which process published the event.
        localEmitter.emit(jobId, event);
      } catch {
        // Ignore malformed payloads rather than crashing the subscriber loop.
      }
    });
  }
  return subscriber;
}

export async function checkRedisHealth() {
  const probe = new Redis(requireUrl(), {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 5_000,
  });
  try {
    await probe.connect();
    await probe.ping();
  } finally {
    probe.disconnect();
  }
}

export function publishRedis(event: JobEventRecord) {
  void getPublisher()
    .publish(`${CHANNEL_PREFIX}${event.jobId}`, JSON.stringify(event))
    .catch(() => {
      // Best-effort: if publish fails mid-flight, in-process listeners still
      // see the direct-local fallback path the caller uses when unhealthy.
    });
}

/** Idempotent — safe to call on every subscribeToJob(); only issues SUBSCRIBE once per jobId. */
export function ensureRedisChannel(jobId: string) {
  const channel = `${CHANNEL_PREFIX}${jobId}`;
  if (subscribedChannels.has(channel)) return;
  subscribedChannels.add(channel);
  void getSubscriber()
    .subscribe(channel)
    .catch(() => {
      subscribedChannels.delete(channel);
    });
}

export function releaseRedisChannel(jobId: string) {
  const channel = `${CHANNEL_PREFIX}${jobId}`;
  if (!subscribedChannels.has(channel)) return;
  subscribedChannels.delete(channel);
  void getSubscriber()
    .unsubscribe(channel)
    .catch(() => {
      // Not fatal — an orphaned subscription just costs a bit of bandwidth.
    });
}
