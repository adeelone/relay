import { nanoid } from "nanoid";
import type { JobAttemptRecord, JobEventInput, JobEventRecord, JobRecord, JobStatus } from "@/lib/jobs/types";

const jobs = new Map<string, JobRecord>();
const events: JobEventRecord[] = [];
const attempts: JobAttemptRecord[] = [];
const idempotency = new Map<string, { jobId: string; expiresAt: number }>();

export const memoryDb = {
  async createJob(job: JobRecord) {
    jobs.set(job.id, job);
    return job;
  },
  async getJob(jobId: string) {
    return jobs.get(jobId);
  },
  async listJobs() {
    return Array.from(jobs.values()).sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
  },
  async updateJob(jobId: string, patch: Partial<JobRecord>) {
    const current = jobs.get(jobId);
    if (!current) throw new Error(`Job not found: ${jobId}`);
    const next = { ...current, ...patch };
    jobs.set(jobId, next);
    return next;
  },
  async addEvent(jobId: string, event: JobEventInput) {
    const record: JobEventRecord = {
      id: nanoid(),
      jobId,
      createdAt: new Date().toISOString(),
      ...event
    };
    events.push(record);
    return record;
  },
  async listEvents(jobId: string) {
    return events.filter((event) => event.jobId === jobId);
  },
  async startAttempt(jobId: string, attempt: number) {
    const record: JobAttemptRecord = {
      id: nanoid(),
      jobId,
      attempt,
      status: "running",
      startedAt: new Date().toISOString()
    };
    attempts.push(record);
    return record;
  },
  async finishAttempt(jobId: string, attempt: number, status: "succeeded" | "failed", error?: string) {
    const current = attempts.find((item) => item.jobId === jobId && item.attempt === attempt);
    if (!current) throw new Error(`Attempt not found: ${jobId}/${attempt}`);
    current.status = status;
    current.completedAt = new Date().toISOString();
    current.durationMs = Date.parse(current.completedAt) - Date.parse(current.startedAt);
    current.error = error;
    return current;
  },
  async listAttempts(jobId: string) {
    return attempts.filter((attempt) => attempt.jobId === jobId);
  },
  async saveIdempotency(key: string, jobId: string, ttlMs = 60 * 60 * 1000) {
    idempotency.set(key, { jobId, expiresAt: Date.now() + ttlMs });
  },
  async resolveIdempotency(key: string) {
    const record = idempotency.get(key);
    if (!record) return undefined;
    if (record.expiresAt < Date.now()) {
      idempotency.delete(key);
      return undefined;
    }
    return jobs.get(record.jobId);
  },
  async countsByStatus() {
    return Array.from(jobs.values()).reduce(
      (acc, job) => {
        acc[job.status] += 1;
        return acc;
      },
      {
        queued: 0,
        processing: 0,
        retrying: 0,
        complete: 0,
        failed: 0,
        cancelled: 0
      } satisfies Record<JobStatus, number>
    );
  },
  seed(job: JobRecord) {
    jobs.set(job.id, job);
  }
};
