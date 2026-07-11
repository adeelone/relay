import { memoryDb } from "@/lib/db/memory";
import { recipes } from "@/recipes/registry";
import type { JobStatus } from "@/lib/jobs/types";

export interface DashboardSnapshot {
  recipes: Array<{ id: string; name: string; description: string; sampleInput: Record<string, unknown>; estimate: { tokens: number; costUsd: number } }>;
  jobs: Array<{
    id: string;
    recipeName: string;
    status: JobStatus;
    durationMs?: number;
    costUsd: number;
    createdLabel: string;
    timeline: Array<{ status: JobStatus; at: string; label: string }>;
    outputPreview: string;
  }>;
  health: {
    queued: number;
    processing: number;
    retrying: number;
    averageLatencySeconds: number;
    errorRatePercent: number;
    latencySparkline: number[];
    workerHeartbeat: string;
  };
  deliveries: Array<{ target: string; status: string }>;
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  seedIfEmpty();
  const jobs = await memoryDb.listJobs();
  const counts = await memoryDb.countsByStatus();
  return {
    recipes: recipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      sampleInput: recipe.sampleInput,
      estimate: recipe.estimateCost(recipe.sampleInput as Record<string, unknown>)
    })),
    jobs: jobs.slice(0, 8).map((job) => {
      const recipe = recipes.find((item) => item.id === job.recipe);
      const durationMs = job.startedAt && job.completedAt ? Date.parse(job.completedAt) - Date.parse(job.startedAt) : undefined;
      return {
        id: job.id,
        recipeName: recipe?.name ?? job.recipe,
        status: job.status,
        durationMs,
        costUsd: job.costUsd,
        createdLabel: new Date(job.queuedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timeline: [
          { status: "queued", at: job.queuedAt, label: "Accepted by HTTP layer" },
          { status: job.startedAt ? "processing" : "queued", at: job.startedAt ?? job.queuedAt, label: "Workflow owns execution" },
          { status: job.status, at: job.completedAt ?? job.startedAt ?? job.queuedAt, label: job.status === "complete" ? "Delivery triggered" : "Awaiting next transition" }
        ],
        outputPreview:
          typeof job.output === "string"
            ? job.output
            : job.output
              ? JSON.stringify(job.output, null, 2)
              : "Queued event written.\nWorker will stream chunks through job_events."
      };
    }),
    health: {
      queued: counts.queued,
      processing: counts.processing,
      retrying: counts.retrying,
      averageLatencySeconds: 18,
      errorRatePercent: 2.4,
      latencySparkline: [34, 48, 39, 62, 55, 70, 46, 64, 58, 72, 61, 44],
      workerHeartbeat: "12s ago"
    },
    deliveries: [
      { target: "in-app inbox", status: "enabled" },
      { target: "signed webhook", status: "3 retries" },
      { target: "email summary", status: "feature flag" }
    ]
  };
}

function seedIfEmpty() {
  const now = new Date();
  const base = now.toISOString();
  memoryDb.seed({
    id: "job_live_4YkP",
    recipe: "research-digest",
    input: { topic: "Render Workflows" },
    status: "processing",
    delivery: { inApp: true, webhookUrl: "https://example.com/relay" },
    costUsd: 0.0041,
    promptTokens: 1180,
    completionTokens: 540,
    attempts: 1,
    queuedAt: new Date(now.getTime() - 72_000).toISOString(),
    startedAt: new Date(now.getTime() - 49_000).toISOString(),
    output: "Collected 2 sources.\nDrafting sourced sub-questions...\n"
  });
  memoryDb.seed({
    id: "job_done_9aQ1",
    recipe: "meeting-notes",
    input: { notes: "Beta planning meeting" },
    status: "complete",
    delivery: { inApp: true },
    costUsd: 0.0029,
    promptTokens: 920,
    completionTokens: 380,
    attempts: 1,
    queuedAt: new Date(now.getTime() - 640_000).toISOString(),
    startedAt: new Date(now.getTime() - 620_000).toISOString(),
    completedAt: new Date(now.getTime() - 590_000).toISOString(),
    output: { decisions: ["Keep webhook delivery in scope"], actionItems: [{ owner: "Maya", task: "Prep beta list" }], openQuestions: [] }
  });
  memoryDb.seed({
    id: "job_retry_Lf22",
    recipe: "code-review",
    input: { diff: "sample" },
    status: "retrying",
    delivery: { inApp: true },
    costUsd: 0.0018,
    promptTokens: 740,
    completionTokens: 260,
    attempts: 2,
    queuedAt: new Date(now.getTime() - 220_000).toISOString(),
    startedAt: new Date(now.getTime() - 210_000).toISOString(),
    output: undefined,
    error: "Provider timeout"
  });
  void base;
}
