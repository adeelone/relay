import { memoryDb } from "@/lib/db/memory";
import { subscribeToJob } from "@/lib/realtime/bus";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { jobId: string } }) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const existing = await memoryDb.listEvents(params.jobId);
      existing.forEach(send);
      const unsubscribe = subscribeToJob(params.jobId, send);
      setTimeout(() => {
        unsubscribe();
        controller.close();
      }, 60_000);
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive"
    }
  });
}
