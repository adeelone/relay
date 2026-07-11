import { NextResponse } from "next/server";
import { memoryDb } from "@/lib/db/memory";
import { createJob } from "@/lib/jobs/service";
import { getRecipe } from "@/recipes/registry";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const result = await createJob(request);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  return NextResponse.json(
    {
      jobId: result.job.id,
      status: result.job.status,
      pollUrl: `${baseUrl}/api/jobs/${result.job.id}`,
      streamUrl: `${baseUrl}/api/jobs/${result.job.id}/stream`
    },
    { status: result.existing ? 200 : 202 }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const recipeFilter = url.searchParams.get("recipe");
  const statusFilter = url.searchParams.get("status");
  const jobs = await memoryDb.listJobs();
  return NextResponse.json({
    jobs: jobs
      .filter((job) => !recipeFilter || job.recipe === recipeFilter)
      .filter((job) => !statusFilter || job.status === statusFilter)
      .map((job) => ({ ...job, recipeName: getRecipe(job.recipe).name }))
  });
}
