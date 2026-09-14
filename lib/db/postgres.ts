import type {
  JobAttemptRecord,
  JobEventInput,
  JobEventRecord,
  JobRecord,
  JobStatus,
  WebhookDeliveryRecord,
} from "@/lib/jobs/types";
import type { ApiKeyRecord } from "@/lib/auth/types";
import { getPool } from "./pool";
import type {
  JobListQuery,
  JobListResult,
  MetricsResult,
  Repository,
} from "./types";

function mapApiKeyRow(row: Record<string, unknown>): ApiKeyRecord {
  return {
    id: row.id as string,
    keyHash: row.key_hash as string,
    keyPrefix: (row.key_prefix as string | null) ?? "",
    role: row.role as string,
    rateLimitPerMinute: Number(row.rate_limit_per_minute),
    createdAt: toIso(row.created_at as Date)!,
    revokedAt: toIso(row.revoked_at as Date | null),
  };
}

const emptyCounts: Record<JobStatus, number> = {
  queued: 0,
  processing: 0,
  retrying: 0,
  complete: 0,
  failed: 0,
  cancelled: 0,
};

function toIso(value: Date | string | null | undefined) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

function mapJobRow(row: Record<string, unknown>): JobRecord {
  return {
    id: row.id as string,
    recipe: row.recipe as string,
    input: row.input as Record<string, unknown>,
    output: row.output === null ? undefined : (row.output as unknown),
    status: row.status as JobStatus,
    delivery: row.delivery as JobRecord["delivery"],
    apiKeyId: (row.api_key_id as string | null) ?? undefined,
    idempotencyKey: (row.idempotency_key as string | null) ?? undefined,
    costUsd: Number(row.cost_usd),
    promptTokens: Number(row.prompt_tokens),
    completionTokens: Number(row.completion_tokens),
    attempts: Number(row.attempts),
    queuedAt: toIso(row.queued_at as Date)!,
    startedAt: toIso(row.started_at as Date | null),
    completedAt: toIso(row.completed_at as Date | null),
    cancelledAt: toIso(row.cancelled_at as Date | null),
    error: (row.error as string | null) ?? undefined,
  };
}

function mapEventRow(row: Record<string, unknown>): JobEventRecord {
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    status: (row.status as JobStatus | null) ?? undefined,
    message: row.message as string,
    chunk: (row.chunk as string | null) ?? undefined,
    metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
    createdAt: toIso(row.created_at as Date)!,
  };
}

function mapAttemptRow(row: Record<string, unknown>): JobAttemptRecord {
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    attempt: Number(row.attempt),
    status: row.status as JobAttemptRecord["status"],
    startedAt: toIso(row.started_at as Date)!,
    completedAt: toIso(row.completed_at as Date | null),
    durationMs: row.duration_ms === null ? undefined : Number(row.duration_ms),
    error: (row.error as string | null) ?? undefined,
  };
}

function mapDeliveryRow(row: Record<string, unknown>): WebhookDeliveryRecord {
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    target: row.target as WebhookDeliveryRecord["target"],
    status: row.status as string,
    attempt: Number(row.attempt),
    responseStatus:
      row.response_status === null ? undefined : Number(row.response_status),
    createdAt: toIso(row.created_at as Date)!,
    deliveredAt: toIso(row.delivered_at as Date | null),
  };
}

const jobColumnMap: Record<string, string> = {
  recipe: "recipe",
  input: "input",
  output: "output",
  status: "status",
  delivery: "delivery",
  apiKeyId: "api_key_id",
  idempotencyKey: "idempotency_key",
  costUsd: "cost_usd",
  promptTokens: "prompt_tokens",
  completionTokens: "completion_tokens",
  attempts: "attempts",
  queuedAt: "queued_at",
  startedAt: "started_at",
  completedAt: "completed_at",
  cancelledAt: "cancelled_at",
  error: "error",
};
const jsonJobColumns = new Set(["input", "output", "delivery"]);

/** Throws for an unparseable date so callers can skip the filter, matching the memory adapter's lenient behavior. */
function parseFilterDate(value: string) {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return undefined;
  return new Date(ms);
}

export const postgresDb: Repository = {
  async createJob(job) {
    await getPool().query(
      `insert into jobs
        (id, recipe, input, output, status, delivery, api_key_id, idempotency_key,
         cost_usd, prompt_tokens, completion_tokens, attempts,
         queued_at, started_at, completed_at, cancelled_at, error)
       values ($1,$2,$3::jsonb,$4::jsonb,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        job.id,
        job.recipe,
        JSON.stringify(job.input),
        job.output === undefined ? null : JSON.stringify(job.output),
        job.status,
        JSON.stringify(job.delivery),
        job.apiKeyId ?? null,
        job.idempotencyKey ?? null,
        job.costUsd,
        job.promptTokens,
        job.completionTokens,
        job.attempts,
        job.queuedAt,
        job.startedAt ?? null,
        job.completedAt ?? null,
        job.cancelledAt ?? null,
        job.error ?? null,
      ],
    );
    return job;
  },

  async getJob(jobId) {
    const result = await getPool().query("select * from jobs where id = $1", [
      jobId,
    ]);
    return result.rows[0] ? mapJobRow(result.rows[0]) : undefined;
  },

  async listJobs(query: JobListQuery = {}): Promise<JobListResult> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const conditions: string[] = [];
    const values: unknown[] = [];
    const add = (sql: string, value: unknown) => {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    };
    if (!query.admin && query.apiKeyId) add("api_key_id = ?", query.apiKeyId);
    if (query.recipe) add("recipe = ?", query.recipe);
    if (query.status) add("status = ?", query.status);
    const from = query.from ? parseFilterDate(query.from) : undefined;
    const to = query.to ? parseFilterDate(query.to) : undefined;
    if (from) add("queued_at >= ?", from);
    if (to) add("queued_at <= ?", to);
    const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

    const countResult = await getPool().query(
      `select count(*)::int as total from jobs ${where}`,
      values,
    );
    const total = (countResult.rows[0]?.total as number) ?? 0;

    const rowsResult = await getPool().query(
      `select * from jobs ${where} order by queued_at desc limit $${values.length + 1} offset $${values.length + 2}`,
      [...values, pageSize, (page - 1) * pageSize],
    );
    return {
      jobs: rowsResult.rows.map(mapJobRow),
      page,
      pageSize,
      total,
    };
  },

  async updateJob(jobId, patch) {
    const entries = Object.entries(patch) as Array<
      [keyof typeof jobColumnMap, unknown]
    >;
    if (entries.length === 0) {
      const existing = await this.getJob(jobId);
      if (!existing) throw new Error(`Job not found: ${jobId}`);
      return existing;
    }
    const setClauses: string[] = [];
    const values: unknown[] = [];
    entries.forEach(([key, value]) => {
      const column = jobColumnMap[key];
      values.push(
        jsonJobColumns.has(key)
          ? value === undefined
            ? null
            : JSON.stringify(value)
          : (value ?? null),
      );
      setClauses.push(
        `${column} = $${values.length}${jsonJobColumns.has(key) ? "::jsonb" : ""}`,
      );
    });
    values.push(jobId);
    const result = await getPool().query(
      `update jobs set ${setClauses.join(", ")} where id = $${values.length} returning *`,
      values,
    );
    if (result.rowCount === 0) throw new Error(`Job not found: ${jobId}`);
    return mapJobRow(result.rows[0]);
  },

  async addEvent(jobId, event: JobEventInput) {
    const result = await getPool().query(
      `insert into job_events (job_id, status, message, chunk, metadata)
       values ($1,$2,$3,$4,$5::jsonb) returning *`,
      [
        jobId,
        event.status ?? null,
        event.message,
        event.chunk ?? null,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ],
    );
    return mapEventRow(result.rows[0]);
  },

  async listEvents(jobId) {
    const result = await getPool().query(
      "select * from job_events where job_id = $1 order by created_at asc",
      [jobId],
    );
    return result.rows.map(mapEventRow);
  },

  async startAttempt(jobId, attempt) {
    const result = await getPool().query(
      `insert into job_attempts (job_id, attempt, status)
       values ($1,$2,'running') returning *`,
      [jobId, attempt],
    );
    return mapAttemptRow(result.rows[0]);
  },

  async finishAttempt(jobId, attempt, status, error) {
    const result = await getPool().query(
      `update job_attempts
       set status = $3,
           completed_at = now(),
           duration_ms = extract(epoch from (now() - started_at)) * 1000,
           error = $4
       where job_id = $1 and attempt = $2
       returning *`,
      [jobId, attempt, status, error ?? null],
    );
    if (result.rowCount === 0)
      throw new Error(`Attempt not found: ${jobId}/${attempt}`);
    return mapAttemptRow(result.rows[0]);
  },

  async claimNextJob() {
    const result = await getPool().query(
      `update jobs set status = 'processing'
       where id = (
         select id from jobs
         where status in ('queued', 'retrying')
         order by queued_at asc
         for update skip locked
         limit 1
       )
       returning *`,
    );
    return result.rows[0] ? mapJobRow(result.rows[0]) : undefined;
  },

  async listAttempts(jobId) {
    const result = await getPool().query(
      "select * from job_attempts where job_id = $1 order by attempt asc",
      [jobId],
    );
    return result.rows.map(mapAttemptRow);
  },

  async addDelivery(delivery) {
    const result = await getPool().query(
      `insert into webhook_deliveries (job_id, target, status, attempt, response_status, delivered_at)
       values ($1,$2,$3,$4,$5,$6) returning *`,
      [
        delivery.jobId,
        delivery.target,
        delivery.status,
        delivery.attempt,
        delivery.responseStatus ?? null,
        delivery.deliveredAt ?? null,
      ],
    );
    return mapDeliveryRow(result.rows[0]);
  },

  async listDeliveries(jobId) {
    const result = await getPool().query(
      "select * from webhook_deliveries where job_id = $1 order by created_at asc",
      [jobId],
    );
    return result.rows.map(mapDeliveryRow);
  },

  async saveIdempotency(key, jobId, ttlMs = 60 * 60 * 1000) {
    await getPool().query(
      `insert into idempotency_keys (key, job_id, expires_at)
       values ($1, $2, now() + ($3 || ' milliseconds')::interval)
       on conflict (key) do update set job_id = excluded.job_id, expires_at = excluded.expires_at`,
      [key, jobId, ttlMs],
    );
  },

  async resolveIdempotency(key) {
    const result = await getPool().query(
      `select j.* from idempotency_keys i
       join jobs j on j.id = i.job_id
       where i.key = $1 and i.expires_at > now()`,
      [key],
    );
    return result.rows[0] ? mapJobRow(result.rows[0]) : undefined;
  },

  async countsByStatus() {
    const result = await getPool().query(
      "select status, count(*)::int as count from jobs group by status",
    );
    const counts = { ...emptyCounts };
    for (const row of result.rows) {
      if (row.status in counts) {
        counts[row.status as JobStatus] = row.count as number;
      }
    }
    return counts;
  },

  async metrics(): Promise<MetricsResult> {
    // One round trip: status counts (as a JSON object via a lateral subquery),
    // token/cost sums, and per-job durations, rather than three separate
    // queries. This runs on every Prometheus scrape of /api/metrics.
    const result = await getPool().query(`
      select
        coalesce(sum(j.prompt_tokens + j.completion_tokens), 0)::bigint as tokens_total,
        coalesce(sum(j.cost_usd), 0)::numeric as cost_usd_total,
        coalesce(
          array_agg(extract(epoch from (j.completed_at - j.started_at)))
            filter (where j.started_at is not null and j.completed_at is not null),
          '{}'
        ) as durations,
        (select coalesce(json_object_agg(status, count), '{}'::json)
         from (select status, count(*)::int as count from jobs group by status) s
        ) as status_counts
      from jobs j
    `);
    const row = result.rows[0];
    const statusCounts = (row?.status_counts ?? {}) as Partial<
      Record<JobStatus, number>
    >;
    const counts = { ...emptyCounts };
    for (const status of Object.keys(counts) as JobStatus[]) {
      counts[status] = statusCounts[status] ?? 0;
    }
    const completedDurations = (
      (row?.durations ?? []) as Array<number | string>
    ).map(Number);
    const durationBuckets = [1, 5, 15, 30, 60, 120].map((bucket) => ({
      le: bucket,
      count: completedDurations.filter((duration) => duration <= bucket).length,
    }));
    return {
      counts,
      tokensTotal: Number(row?.tokens_total ?? 0),
      costUsdTotal: Number(row?.cost_usd_total ?? 0),
      durationBuckets,
      durationCount: completedDurations.length,
      durationSum: completedDurations.reduce((sum, d) => sum + d, 0),
    };
  },

  async createApiKeyRecord(record) {
    const result = await getPool().query(
      `insert into api_keys (key_hash, key_prefix, role, rate_limit_per_minute)
       values ($1,$2,$3,$4) returning *`,
      [
        record.keyHash,
        record.keyPrefix,
        record.role,
        record.rateLimitPerMinute,
      ],
    );
    return mapApiKeyRow(result.rows[0]);
  },

  async getApiKeyByHash(keyHash) {
    const result = await getPool().query(
      "select * from api_keys where key_hash = $1 and revoked_at is null",
      [keyHash],
    );
    return result.rows[0] ? mapApiKeyRow(result.rows[0]) : undefined;
  },

  async listApiKeys() {
    const result = await getPool().query(
      "select * from api_keys order by created_at desc",
    );
    return result.rows.map(mapApiKeyRow);
  },
};

export async function checkPostgresHealth() {
  await getPool().query("select 1");
}
