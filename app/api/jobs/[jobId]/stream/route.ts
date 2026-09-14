import { NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth/api-keys";
import { db } from "@/lib/db";
import { canAccessJob } from "@/lib/jobs/service";
import { subscribeToJob } from "@/lib/realtime/bus";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const caller = await getCallerFromRequest(request);
  const job = await db.getJob(jobId);
  if (!job || !canAccessJob(job, caller)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };
      const existing = await db.listEvents(jobId);
      existing.forEach(send);
      const unsubscribe = subscribeToJob(jobId, send);
      setTimeout(() => {
        unsubscribe();
        controller.close();
      }, 60_000);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
