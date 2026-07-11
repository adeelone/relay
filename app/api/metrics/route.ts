import { memoryDb } from "@/lib/db/memory";

export const dynamic = "force-dynamic";

export async function GET() {
  const metrics = await memoryDb.metrics();
  const counts = metrics.counts;
  const body = [
    "# HELP jobs_queued_total Jobs currently queued",
    "# TYPE jobs_queued_total gauge",
    `jobs_queued_total ${counts.queued}`,
    "# HELP jobs_completed_total Completed jobs",
    "# TYPE jobs_completed_total counter",
    `jobs_completed_total ${counts.complete}`,
    "# HELP jobs_failed_total Failed jobs",
    "# TYPE jobs_failed_total counter",
    `jobs_failed_total ${counts.failed}`,
    "# HELP job_duration_seconds Job duration in seconds",
    "# TYPE job_duration_seconds histogram",
    ...metrics.durationBuckets.map(
      (bucket) =>
        `job_duration_seconds_bucket{le="${bucket.le}"} ${bucket.count}`,
    ),
    `job_duration_seconds_bucket{le="+Inf"} ${metrics.durationCount}`,
    `job_duration_seconds_count ${metrics.durationCount}`,
    `job_duration_seconds_sum ${metrics.durationSum.toFixed(3)}`,
    "# HELP tokens_total Tokens processed",
    "# TYPE tokens_total counter",
    `tokens_total ${metrics.tokensTotal}`,
    "# HELP cost_usd_total Estimated cost in USD",
    "# TYPE cost_usd_total counter",
    `cost_usd_total ${metrics.costUsdTotal.toFixed(6)}`,
  ].join("\n");
  return new Response(`${body}\n`, {
    headers: { "content-type": "text/plain; version=0.0.4" },
  });
}
