import { NextResponse } from "next/server";
import { getJobSnapshot } from "@/lib/jobs/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } },
) {
  const snapshot = await getJobSnapshot(params.jobId);
  if (!snapshot)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(snapshot);
}
