"use client";

import {
  Activity,
  Bell,
  CheckCircle2,
  Clock3,
  Code2,
  Database,
  FileText,
  Inbox,
  KeyRound,
  ListChecks,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Square,
  Webhook
} from "lucide-react";
import { useMemo, useState } from "react";
import type { DashboardSnapshot } from "@/lib/dashboard/snapshot";
import type { JobStatus } from "@/lib/jobs/types";

const recipeIcons = {
  "task-planner": ListChecks,
  "meeting-notes": FileText,
  "research-digest": Search,
  "code-review": Code2,
  "inbox-triage": Inbox
};

const statusColor: Record<JobStatus, string> = {
  queued: "bg-amber-100 text-amber-900",
  processing: "bg-teal-100 text-teal-900",
  retrying: "bg-orange-100 text-orange-900",
  complete: "bg-emerald-100 text-emerald-900",
  failed: "bg-red-100 text-red-900",
  cancelled: "bg-graphite-200 text-graphite-700"
};

export function DashboardShell({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [selectedRecipe, setSelectedRecipe] = useState(snapshot.recipes[0]?.id ?? "");
  const recipe = snapshot.recipes.find((item) => item.id === selectedRecipe) ?? snapshot.recipes[0];
  const selectedJob = snapshot.jobs[0];
  const queueTotal = snapshot.health.queued + snapshot.health.processing + snapshot.health.retrying;

  const sampleInput = useMemo(() => {
    if (!recipe) return "{}";
    return JSON.stringify(recipe.sampleInput, null, 2);
  }, [recipe]);

  return (
    <main className="min-h-screen bg-graphite-50 text-graphite-900">
      <div className="grid min-h-screen grid-cols-[248px_1fr] max-lg:grid-cols-1">
        <aside className="border-r border-graphite-200 bg-white px-5 py-5 max-lg:hidden">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-graphite-900 text-white">
              <Activity size={19} />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide">Relay</div>
              <div className="text-xs text-graphite-500">Async AI ops</div>
            </div>
          </div>
          <nav className="space-y-1 text-sm">
            {([
              ["Submit", Send],
              ["Jobs", Database],
              ["Queue", Activity],
              ["API Keys", KeyRound],
              ["Settings", Settings]
            ] satisfies Array<[string, typeof Send]>).map(([label, Icon]) => (
              <button
                key={String(label)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-graphite-700 hover:bg-graphite-100"
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-8 rounded-md border border-graphite-200 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-graphite-700">
              <ShieldCheck size={14} />
              Provider guard
            </div>
            <p className="mt-2 text-xs leading-5 text-graphite-500">
              Groq is primary. OpenAI and Anthropic adapters are available when keys are set.
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-graphite-200 bg-white/92 px-6 py-4 backdrop-blur max-sm:flex-col max-sm:items-start max-sm:px-4">
            <div>
              <h1 className="text-xl font-semibold">Operations dashboard</h1>
              <p className="text-sm text-graphite-500">
                Submit jobs, watch workflow state, inspect attempts, and deliver results.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm max-sm:w-full max-sm:justify-between">
              <span className="inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-teal-900">
                <span className="h-2 w-2 rounded-full bg-teal-600" />
                Worker heartbeat {snapshot.health.workerHeartbeat}
              </span>
              <button className="grid h-9 w-9 place-items-center rounded-md border border-graphite-200 bg-white">
                <Bell size={16} />
              </button>
            </div>
          </header>

          <div className="grid gap-5 p-6 max-sm:p-4 xl:grid-cols-[minmax(0,1.05fr)_420px]">
            <section className="min-w-0 space-y-5">
              <div className="min-w-0 rounded-md border border-graphite-200 bg-white p-5 shadow-panel">
                <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-start">
                  <div>
                    <h2 className="text-base font-semibold">Submit a job</h2>
                    <p className="text-sm text-graphite-500">The API returns immediately; workflow execution happens off-thread.</p>
                  </div>
                  <span className="rounded-md bg-graphite-100 px-3 py-1 text-xs text-graphite-700">p95 intake &lt; 200ms</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {snapshot.recipes.map((item) => {
                    const Icon = recipeIcons[item.id as keyof typeof recipeIcons] ?? FileText;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedRecipe(item.id)}
                        className={`rounded-md border p-3 text-left transition ${
                          item.id === selectedRecipe
                            ? "border-teal-400 bg-teal-50"
                            : "border-graphite-200 bg-white hover:border-graphite-300"
                        }`}
                      >
                        <Icon className="mb-3 text-graphite-700" size={18} />
                        <div className="text-sm font-semibold">{item.name}</div>
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-graphite-500">{item.description}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_260px]">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-graphite-500">Input payload</span>
                    <textarea
                      className="mt-2 h-56 w-full min-w-0 resize-none rounded-md border border-graphite-200 bg-graphite-50 p-3 font-mono text-xs leading-5 outline-none focus:border-teal-500"
                      value={sampleInput}
                      readOnly
                    />
                  </label>
                  <div className="rounded-md border border-graphite-200 bg-graphite-50 p-4">
                    <div className="text-xs font-semibold uppercase text-graphite-500">Estimate</div>
                    <div className="mt-2 text-3xl font-semibold">${recipe?.estimate.costUsd.toFixed(4)}</div>
                    <div className="mt-1 text-sm text-graphite-500">{recipe?.estimate.tokens.toLocaleString()} tokens</div>
                    <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-graphite-900 px-4 py-2.5 text-sm font-semibold text-white">
                      <Play size={15} />
                      Submit
                    </button>
                    <p className="mt-3 text-xs leading-5 text-graphite-500">
                      A returned job ID includes poll and stream URLs for fallback and live views.
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded-md border border-graphite-200 bg-white p-5 shadow-panel">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold">Jobs inbox</h2>
                  <div className="flex gap-2">
                    <button className="inline-flex items-center gap-2 rounded-md border border-graphite-200 px-3 py-2 text-xs">
                      <RotateCcw size={14} />
                      Bulk retry
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-md border border-graphite-200 px-3 py-2 text-xs">
                      <Square size={14} />
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                    <thead className="text-xs uppercase text-graphite-500">
                      <tr className="border-b border-graphite-200">
                        <th className="py-3 font-semibold">Job</th>
                        <th className="py-3 font-semibold">Recipe</th>
                        <th className="py-3 font-semibold">Status</th>
                        <th className="py-3 font-semibold">Duration</th>
                        <th className="py-3 font-semibold">Cost</th>
                        <th className="hidden py-3 font-semibold 2xl:table-cell">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.jobs.map((job) => (
                        <tr key={job.id} className="border-b border-graphite-100">
                          <td className="max-w-32 truncate py-3 font-mono text-xs">{job.id}</td>
                          <td className="py-3">{job.recipeName}</td>
                          <td className="py-3">
                            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusColor[job.status]}`}>{job.status}</span>
                          </td>
                          <td className="py-3">{job.durationMs ? `${Math.round(job.durationMs / 1000)}s` : "pending"}</td>
                          <td className="py-3">${job.costUsd.toFixed(4)}</td>
                          <td className="hidden py-3 text-graphite-500 2xl:table-cell">{job.createdLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <div className="rounded-md border border-graphite-200 bg-white p-5 shadow-panel">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Live job</h2>
                    <p className="font-mono text-xs text-graphite-500">{selectedJob.id}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusColor[selectedJob.status]}`}>{selectedJob.status}</span>
                </div>
                <div className="mt-5 space-y-3">
                  {selectedJob.timeline.map((event, index) => (
                    <div key={`${event.status}-${event.at}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`grid h-6 w-6 place-items-center rounded-full ${event.status === "complete" ? "bg-teal-600 text-white" : "bg-graphite-200 text-graphite-700"}`}>
                          {event.status === "complete" ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
                        </span>
                        {index < selectedJob.timeline.length - 1 ? <span className="h-9 w-px bg-graphite-200" /> : null}
                      </div>
                      <div>
                        <div className="text-sm font-semibold capitalize">{event.status}</div>
                        <div className="text-xs text-graphite-500">{event.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-md border border-graphite-200 bg-graphite-900 p-4 text-white">
                  <div className="mb-3 flex items-center justify-between text-xs text-graphite-200">
                    <span>Streaming output</span>
                    <RefreshCw size={14} />
                  </div>
                  <pre className="whitespace-pre-wrap text-xs leading-5 text-graphite-100">{selectedJob.outputPreview}</pre>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <Metric label="Queued" value={snapshot.health.queued} accent="bg-amber-500" />
                <Metric label="Processing" value={snapshot.health.processing} accent="bg-teal-600" />
                <Metric label="Retrying" value={snapshot.health.retrying} accent="bg-orange-500" />
              </div>

              <div className="rounded-md border border-graphite-200 bg-white p-5 shadow-panel">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold">Queue health</h2>
                  <span className="text-xs text-graphite-500">{queueTotal} active</span>
                </div>
                <div className="flex h-24 items-end gap-2">
                  {snapshot.health.latencySparkline.map((value, index) => (
                    <span
                      key={index}
                      className="flex-1 rounded-t bg-teal-600/80"
                      style={{ height: `${Math.max(12, value)}%` }}
                    />
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-graphite-50 p-3">
                    <div className="text-xs text-graphite-500">Avg latency</div>
                    <div className="font-semibold">{snapshot.health.averageLatencySeconds}s</div>
                  </div>
                  <div className="rounded-md bg-graphite-50 p-3">
                    <div className="text-xs text-graphite-500">Error rate</div>
                    <div className="font-semibold">{snapshot.health.errorRatePercent}%</div>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-graphite-200 bg-white p-5 shadow-panel">
                <h2 className="text-base font-semibold">Delivery</h2>
                <div className="mt-4 space-y-3 text-sm">
                  {snapshot.deliveries.map((delivery) => (
                    <div key={delivery.target} className="flex items-center justify-between rounded-md border border-graphite-200 px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        <Webhook size={14} />
                        {delivery.target}
                      </span>
                      <span className="text-xs text-graphite-500">{delivery.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-md border border-graphite-200 bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-xs text-graphite-500">
        <span className={`h-2 w-2 rounded-full ${accent}`} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
