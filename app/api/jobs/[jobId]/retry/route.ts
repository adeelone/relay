import { NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth/api-keys";
import { retryJob } from "@/lib/jobs/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const caller = await getCallerFromRequest(request);
  const job = await retryJob(jobId, caller);
  if (!job)
    return NextResponse.json({ error: "not_retryable" }, { status: 409 });
  return NextResponse.json({ jobId: job.id, status: job.status });
}
