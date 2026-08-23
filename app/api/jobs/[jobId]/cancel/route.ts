import { NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth/api-keys";
import { cancelJob } from "@/lib/jobs/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { jobId: string } },
) {
  const caller = getCallerFromRequest(request);
  const job = await cancelJob(params.jobId, caller);
  if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ jobId: job.id, status: job.status });
}
