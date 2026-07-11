import { memoryDb } from "@/lib/db/memory";

export const dynamic = "force-dynamic";

export async function GET() {
  const counts = await memoryDb.countsByStatus();
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
    "# HELP tokens_total Approximate tokens processed",
    "# TYPE tokens_total counter",
    "tokens_total 0",
    "# HELP cost_usd_total Estimated cost in USD",
    "# TYPE cost_usd_total counter",
    "cost_usd_total 0"
  ].join("\n");
  return new Response(`${body}\n`, { headers: { "content-type": "text/plain; version=0.0.4" } });
}
