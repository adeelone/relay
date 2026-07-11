import { z } from "zod";

export const jobStatuses = [
  "queued",
  "processing",
  "retrying",
  "complete",
  "failed",
  "cancelled",
] as const;
export type JobStatus = (typeof jobStatuses)[number];

export const deliveryConfigSchema = z
  .object({
    inApp: z.boolean().default(true),
    webhookUrl: z.string().url().optional(),
    email: z.string().email().optional(),
  })
  .partial()
  .default({ inApp: true });

export type DeliveryConfig = z.infer<typeof deliveryConfigSchema>;

export interface CostEstimate {
  tokens: number;
  costUsd: number;
  model: string;
}

export interface TaskContext {
  jobId: string;
  attempt: number;
  signal?: AbortSignal;
  emit: (event: JobEventInput) => Promise<void>;
  checkCancelled: () => Promise<void>;
}

export interface JobEventInput {
  status?: JobStatus;
  message: string;
  chunk?: string;
  metadata?: Record<string, unknown>;
}

export interface JobRecord {
  id: string;
  recipe: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: JobStatus;
  delivery: DeliveryConfig;
  apiKeyId?: string;
  idempotencyKey?: string;
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
  attempts: number;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  error?: string;
}

export interface JobAttemptRecord {
  id: string;
  jobId: string;
  attempt: number;
  status: "running" | "succeeded" | "failed";
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

export interface JobEventRecord {
  id: string;
  jobId: string;
  status?: JobStatus;
  message: string;
  chunk?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface WebhookDeliveryRecord {
  id: string;
  jobId: string;
  target: "in-app" | "webhook" | "email";
  status: string;
  attempt: number;
  responseStatus?: number;
  createdAt: string;
  deliveredAt?: string;
}
