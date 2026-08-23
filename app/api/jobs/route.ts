import { NextResponse } from "next/server";
import { memoryDb } from "@/lib/db/memory";
import { getCallerFromRequest } from "@/lib/auth/api-keys";
import { createJob } from "@/lib/jobs/service";
import { jobStatuses, toPublicJob, type JobStatus } from "@/lib/jobs/types";
import { getRecipe } from "@/recipes/registry";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const result = await createJob(request);
  if ("error" in result) {
    if (result.error === "rate_limited") {
      return NextResponse.json(
        { error: result.error },
        {
          status: 429,
          headers: { "Retry-After": String(result.retryAfterSeconds) },
        },
      );
    }
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: 400 },
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  return NextResponse.json(
    {
      jobId: result.job.id,
      status: result.job.status,
      pollUrl: `${baseUrl}/api/jobs/${result.job.id}`,
      streamUrl: `${baseUrl}/api/jobs/${result.job.id}/stream`,
    },
    { status: result.existing ? 200 : 202 },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const caller = getCallerFromRequest(request);
  const recipeFilter = url.searchParams.get("recipe");
  const statusFilter = url.searchParams.get("status");
  const status = jobStatuses.includes(statusFilter as JobStatus)
    ? (statusFilter as JobStatus)
    : undefined;
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(url.searchParams.get("pageSize"), 25);
  const result = await memoryDb.listJobs({
    apiKeyId: caller.apiKeyHash,
    admin: !caller.apiKeyHash,
    recipe: recipeFilter ?? undefined,
    status,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    page,
    pageSize,
  });
  return NextResponse.json({
    ...result,
    jobs: result.jobs.map((job) => ({
      ...toPublicJob(job),
      recipeName: getRecipe(job.recipe).name,
    })),
  });
}

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
