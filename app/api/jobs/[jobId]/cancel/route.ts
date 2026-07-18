import { NextResponse } from "next/server";
import { cancelJob } from "@/lib/jobs/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { jobId: string } },
) {
  const job = await cancelJob(params.jobId);
  if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ jobId: job.id, status: job.status });
}
