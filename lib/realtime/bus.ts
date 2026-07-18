import { EventEmitter } from "node:events";
import type { JobEventRecord } from "@/lib/jobs/types";

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

export function publishJobEvent(event: JobEventRecord) {
  emitter.emit(event.jobId, event);
}

export function subscribeToJob(
  jobId: string,
  listener: (event: JobEventRecord) => void,
) {
  emitter.on(jobId, listener);
  return () => emitter.off(jobId, listener);
}
