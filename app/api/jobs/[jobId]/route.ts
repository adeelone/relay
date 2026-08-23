import { NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth/api-keys";
import { getJobSnapshot } from "@/lib/jobs/service";
import { toPublicJob } from "@/lib/jobs/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } },
) {
  const caller = getCallerFromRequest(request);
  const snapshot = await getJobSnapshot(params.jobId, caller);
  if (!snapshot)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ...snapshot, job: toPublicJob(snapshot.job) });
}
