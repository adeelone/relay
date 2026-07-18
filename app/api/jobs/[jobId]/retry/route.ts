import { NextResponse } from "next/server";
import { retryJob } from "@/lib/jobs/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { jobId: string } },
) {
  const job = await retryJob(params.jobId);
  if (!job)
    return NextResponse.json({ error: "not_retryable" }, { status: 409 });
  return NextResponse.json({ jobId: job.id, status: job.status });
}
