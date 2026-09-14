import { logEvent } from "@/lib/logging/logger";
import { memoryDb } from "./memory";
import { checkPostgresHealth, postgresDb } from "./postgres";
import type { Repository } from "./types";

export type {
  JobListQuery,
  JobListResult,
  MetricsResult,
  Repository,
} from "./types";

export const postgresConfigured = Boolean(process.env.DATABASE_URL);

let active: Repository = memoryDb;

const ready: Promise<void> = postgresConfigured
  ? checkPostgresHealth()
      .then(() => {
        active = postgresDb;
        logEvent("info", "db_backend_selected", { backend: "postgres" });
      })
      .catch((error: unknown) => {
        logEvent("warn", "db_backend_fallback", {
          backend: "memory",
          reason: error instanceof Error ? error.message : "unknown error",
        });
      })
  : Promise.resolve();

/** True once the startup Postgres health check has resolved (or immediately, if Postgres isn't configured). */
export function backendReady() {
  return ready;
}

/** True if Postgres is configured AND reachable — false if unconfigured or the health check failed and the app fell back to memory. */
export function isUsingPostgres() {
  return active === postgresDb;
}

async function withBackend<T>(fn: (repo: Repository) => Promise<T>) {
  await ready;
  return fn(active);
}

export const db: Repository = {
  createJob: (job) => withBackend((repo) => repo.createJob(job)),
  getJob: (jobId) => withBackend((repo) => repo.getJob(jobId)),
  listJobs: (query) => withBackend((repo) => repo.listJobs(query)),
  updateJob: (jobId, patch) =>
    withBackend((repo) => repo.updateJob(jobId, patch)),
  addEvent: (jobId, event) =>
    withBackend((repo) => repo.addEvent(jobId, event)),
  listEvents: (jobId) => withBackend((repo) => repo.listEvents(jobId)),
  startAttempt: (jobId, attempt) =>
    withBackend((repo) => repo.startAttempt(jobId, attempt)),
  finishAttempt: (jobId, attempt, status, error) =>
    withBackend((repo) => repo.finishAttempt(jobId, attempt, status, error)),
  listAttempts: (jobId) => withBackend((repo) => repo.listAttempts(jobId)),
  claimNextJob: () => withBackend((repo) => repo.claimNextJob()),
  addDelivery: (delivery) => withBackend((repo) => repo.addDelivery(delivery)),
  listDeliveries: (jobId) => withBackend((repo) => repo.listDeliveries(jobId)),
  saveIdempotency: (key, jobId, ttlMs) =>
    withBackend((repo) => repo.saveIdempotency(key, jobId, ttlMs)),
  resolveIdempotency: (key) =>
    withBackend((repo) => repo.resolveIdempotency(key)),
  countsByStatus: () => withBackend((repo) => repo.countsByStatus()),
  metrics: () => withBackend((repo) => repo.metrics()),
  createApiKeyRecord: (record) =>
    withBackend((repo) => repo.createApiKeyRecord(record)),
  getApiKeyByHash: (keyHash) =>
    withBackend((repo) => repo.getApiKeyByHash(keyHash)),
  listApiKeys: () => withBackend((repo) => repo.listApiKeys()),
};
