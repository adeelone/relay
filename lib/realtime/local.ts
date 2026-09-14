import { EventEmitter } from "node:events";
import type { JobEventRecord } from "@/lib/jobs/types";

/** Single-process fan-out. Used directly when REDIS_URL isn't configured, and as
 * the delivery target that the Redis bridge forwards into either way — see bus.ts. */
export const localEmitter = new EventEmitter();
localEmitter.setMaxListeners(200);

export function publishLocal(event: JobEventRecord) {
  localEmitter.emit(event.jobId, event);
}

export function subscribeLocal(
  jobId: string,
  listener: (event: JobEventRecord) => void,
) {
  localEmitter.on(jobId, listener);
  return () => localEmitter.off(jobId, listener);
}
