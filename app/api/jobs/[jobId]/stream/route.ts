import { NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth/api-keys";
import { memoryDb } from "@/lib/db/memory";
import { canAccessJob } from "@/lib/jobs/service";
import { subscribeToJob } from "@/lib/realtime/bus";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } },
) {
  const caller = getCallerFromRequest(request);
  const job = await memoryDb.getJob(params.jobId);
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
      const existing = await memoryDb.listEvents(params.jobId);
      existing.forEach(send);
      const unsubscribe = subscribeToJob(params.jobId, send);
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
