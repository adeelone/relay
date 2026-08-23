import { nanoid } from "nanoid";
import { z } from "zod";
import { memoryDb } from "@/lib/db/memory";
import { publishJobEvent } from "@/lib/realtime/bus";
import { takeToken } from "@/lib/rate-limit/token-bucket";
import { deliveryConfigSchema, type JobRecord } from "./types";
import { getCallerFromRequest } from "@/lib/auth/api-keys";
import { getRecipe } from "@/recipes/registry";
import { runRecipeJob } from "@/workflows/runRecipe";
import { logEvent } from "@/lib/logging/logger";

const createJobSchema = z.object({
  recipe: z.string(),
  input: z.record(z.unknown()),
  delivery: deliveryConfigSchema.optional(),
});

export interface Caller {
  apiKeyHash?: string;
}

/**
 * Callers without an API key are treated as admin/local-dashboard access
 * (matches the scoping already applied by GET /api/jobs); callers with a key
 * may only reach jobs they created.
 */
export function canAccessJob(job: JobRecord, caller?: Caller) {
  return !caller?.apiKeyHash || job.apiKeyId === caller.apiKeyHash;
}

export async function createJob(request: Request) {
  const caller = getCallerFromRequest(request);
  const rate = takeToken(caller.apiKeyHash ?? caller.ip);
  if (!rate.allowed) {
    return {
      error: "rate_limited" as const,
      retryAfterSeconds: rate.retryAfterSeconds,
    };
  }

  let parsed: z.infer<typeof createJobSchema>;
  let recipe: ReturnType<typeof getRecipe>;
  let input: Record<string, unknown>;
  try {
    parsed = createJobSchema.parse(await request.json());
    recipe = getRecipe(parsed.recipe);
    input = recipe.inputSchema.parse(parsed.input);
  } catch (error) {
    return {
      error: "invalid_request" as const,
      message: error instanceof Error ? error.message : "Invalid request body",
    };
  }
  const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;
  if (idempotencyKey) {
    const existing = await memoryDb.resolveIdempotency(idempotencyKey);
    if (existing) return { job: existing, existing: true };
  }

  const job: JobRecord = {
    id: nanoid(),
    recipe: recipe.id,
    input,
    status: "queued",
    delivery: parsed.delivery ?? { inApp: true },
    apiKeyId: caller.apiKeyHash,
    idempotencyKey,
    costUsd: 0,
    promptTokens: 0,
    completionTokens: 0,
    attempts: 0,
    queuedAt: new Date().toISOString(),
  };
  await memoryDb.createJob(job);
  if (idempotencyKey) await memoryDb.saveIdempotency(idempotencyKey, job.id);
  const event = await memoryDb.addEvent(job.id, {
    status: "queued",
    message: "Job queued",
  });
  publishJobEvent(event);
  logEvent("info", "job_queued", {
    jobId: job.id,
    recipe: recipe.id,
    caller: caller.apiKeyHash ? "api-key" : "ip",
  });

  setTimeout(() => {
    void runRecipeJob(job.id);
  }, 0);

  return { job, existing: false };
}

export async function getJobSnapshot(jobId: string, caller?: Caller) {
  const job = await memoryDb.getJob(jobId);
  if (!job || !canAccessJob(job, caller)) return undefined;
  const [events, attempts] = await Promise.all([
    memoryDb.listEvents(jobId),
    memoryDb.listAttempts(jobId),
  ]);
  return { job, events, attempts };
}

export async function cancelJob(jobId: string, caller?: Caller) {
  const job = await memoryDb.getJob(jobId);
  if (!job || !canAccessJob(job, caller)) return undefined;
  if (job.status === "complete" || job.status === "failed") return job;
  const updated = await memoryDb.updateJob(jobId, {
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
  });
  const event = await memoryDb.addEvent(jobId, {
    status: "cancelled",
    message: "Cancellation requested",
  });
  publishJobEvent(event);
  return updated;
}

export async function retryJob(jobId: string, caller?: Caller) {
  const job = await memoryDb.getJob(jobId);
  if (!job || !canAccessJob(job, caller) || job.status !== "failed")
    return undefined;
  const updated = await memoryDb.updateJob(jobId, {
    status: "queued",
    error: undefined,
    queuedAt: new Date().toISOString(),
  });
  const event = await memoryDb.addEvent(jobId, {
    status: "queued",
    message: "Job re-queued",
  });
  publishJobEvent(event);
  setTimeout(() => {
    void runRecipeJob(jobId);
  }, 0);
  return updated;
}
