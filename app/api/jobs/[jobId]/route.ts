import { NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth/api-keys";
import { getJobSnapshot } from "@/lib/jobs/service";
import { toPublicJob } from "@/lib/jobs/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const caller = await getCallerFromRequest(request);
  const snapshot = await getJobSnapshot(jobId, caller);
  if (!snapshot)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ...snapshot, job: toPublicJob(snapshot.job) });
}
