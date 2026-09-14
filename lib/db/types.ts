import type {
  JobAttemptRecord,
  JobEventInput,
  JobEventRecord,
  JobRecord,
  JobStatus,
  WebhookDeliveryRecord,
} from "@/lib/jobs/types";
import type { ApiKeyRecord } from "@/lib/auth/types";

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

export interface JobListResult {
  jobs: JobRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export interface MetricsResult {
  counts: Record<JobStatus, number>;
  tokensTotal: number;
  costUsdTotal: number;
  durationBuckets: Array<{ le: number; count: number }>;
  durationCount: number;
  durationSum: number;
}

export interface Repository {
  createJob(job: JobRecord): Promise<JobRecord>;
  getJob(jobId: string): Promise<JobRecord | undefined>;
  listJobs(query?: JobListQuery): Promise<JobListResult>;
  updateJob(jobId: string, patch: Partial<JobRecord>): Promise<JobRecord>;
  addEvent(jobId: string, event: JobEventInput): Promise<JobEventRecord>;
  listEvents(jobId: string): Promise<JobEventRecord[]>;
  startAttempt(jobId: string, attempt: number): Promise<JobAttemptRecord>;
  finishAttempt(
    jobId: string,
    attempt: number,
    status: "succeeded" | "failed",
    error?: string,
  ): Promise<JobAttemptRecord>;
  listAttempts(jobId: string): Promise<JobAttemptRecord[]>;
  /** Atomically claims one queued/retrying job for processing, or undefined if none are waiting. */
  claimNextJob(): Promise<JobRecord | undefined>;
  addDelivery(
    delivery: Omit<WebhookDeliveryRecord, "id" | "createdAt">,
  ): Promise<WebhookDeliveryRecord>;
  listDeliveries(jobId: string): Promise<WebhookDeliveryRecord[]>;
  saveIdempotency(key: string, jobId: string, ttlMs?: number): Promise<void>;
  resolveIdempotency(key: string): Promise<JobRecord | undefined>;
  countsByStatus(): Promise<Record<JobStatus, number>>;
  metrics(): Promise<MetricsResult>;
  createApiKeyRecord(
    record: Omit<ApiKeyRecord, "id" | "createdAt">,
  ): Promise<ApiKeyRecord>;
  getApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | undefined>;
  listApiKeys(): Promise<ApiKeyRecord[]>;
}
