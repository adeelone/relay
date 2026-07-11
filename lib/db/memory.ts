import { nanoid } from "nanoid";
import type {
  JobAttemptRecord,
  JobEventInput,
  JobEventRecord,
  JobRecord,
  JobStatus,
  WebhookDeliveryRecord,
} from "@/lib/jobs/types";

const jobs = new Map<string, JobRecord>();
const events: JobEventRecord[] = [];
const attempts: JobAttemptRecord[] = [];
const deliveries: WebhookDeliveryRecord[] = [];
const idempotency = new Map<string, { jobId: string; expiresAt: number }>();

export interface JobListQuery {
  apiKeyId?: string;
  recipe?: string;
  status?: JobStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  admin?: boolean;
}

export const memoryDb = {
  async createJob(job: JobRecord) {
    jobs.set(job.id, job);
    return job;
  },
  async getJob(jobId: string) {
    return jobs.get(jobId);
  },
  async listJobs(query: JobListQuery = {}) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const from = query.from ? Date.parse(query.from) : undefined;
    const to = query.to ? Date.parse(query.to) : undefined;
    const filtered = Array.from(jobs.values())
      .filter(
        (job) =>
          query.admin || !query.apiKeyId || job.apiKeyId === query.apiKeyId,
      )
      .filter((job) => !query.recipe || job.recipe === query.recipe)
      .filter((job) => !query.status || job.status === query.status)
      .filter((job) => !from || Date.parse(job.queuedAt) >= from)
      .filter((job) => !to || Date.parse(job.queuedAt) <= to)
      .sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
    return {
      jobs: filtered.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: filtered.length,
    };
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
      ...event,
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
      startedAt: new Date().toISOString(),
    };
    attempts.push(record);
    return record;
  },
  async finishAttempt(
    jobId: string,
    attempt: number,
    status: "succeeded" | "failed",
    error?: string,
  ) {
    const current = attempts.find(
      (item) => item.jobId === jobId && item.attempt === attempt,
    );
    if (!current) throw new Error(`Attempt not found: ${jobId}/${attempt}`);
    current.status = status;
    current.completedAt = new Date().toISOString();
    current.durationMs =
      Date.parse(current.completedAt) - Date.parse(current.startedAt);
    current.error = error;
    return current;
  },
  async listAttempts(jobId: string) {
    return attempts.filter((attempt) => attempt.jobId === jobId);
  },
  async addDelivery(delivery: Omit<WebhookDeliveryRecord, "id" | "createdAt">) {
    const record: WebhookDeliveryRecord = {
      id: nanoid(),
      createdAt: new Date().toISOString(),
      ...delivery,
    };
    deliveries.push(record);
    return record;
  },
  async listDeliveries(jobId: string) {
    return deliveries.filter((delivery) => delivery.jobId === jobId);
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
        cancelled: 0,
      } satisfies Record<JobStatus, number>,
    );
  },
  async metrics() {
    const allJobs = Array.from(jobs.values());
    const counts = await this.countsByStatus();
    const completedDurations = allJobs
      .filter((job) => job.startedAt && job.completedAt)
      .map(
        (job) =>
          (Date.parse(job.completedAt as string) -
            Date.parse(job.startedAt as string)) /
          1000,
      );
    const tokensTotal = allJobs.reduce(
      (sum, job) => sum + job.promptTokens + job.completionTokens,
      0,
    );
    const costUsdTotal = allJobs.reduce((sum, job) => sum + job.costUsd, 0);
    const durationBuckets = [1, 5, 15, 30, 60, 120].map((bucket) => ({
      le: bucket,
      count: completedDurations.filter((duration) => duration <= bucket).length,
    }));
    return {
      counts,
      tokensTotal,
      costUsdTotal,
      durationBuckets,
      durationCount: completedDurations.length,
      durationSum: completedDurations.reduce(
        (sum, duration) => sum + duration,
        0,
      ),
    };
  },
  seed(job: JobRecord) {
    jobs.set(job.id, job);
  },
};
