import type { JobRecord } from "@/lib/jobs/types";
import { memoryDb } from "@/lib/db/memory";
import { deliverWebhook } from "./webhook";

export async function deliverJobResult(job: JobRecord) {
  const deliveries: Array<{ target: string; status: string }> = [];
  if (job.delivery.inApp !== false) {
    await memoryDb.addDelivery({
      jobId: job.id,
      target: "in-app",
      status: "unread",
      attempt: 1,
    });
    deliveries.push({ target: "in-app", status: "unread" });
  }
  if (job.delivery.webhookUrl) {
    let status = "failed";
    let responseStatus: number | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const result = await deliverWebhook(job.delivery.webhookUrl, {
        jobId: job.id,
        status: job.status,
        output: job.output,
      });
      responseStatus = result.status;
      status = result.ok ? "delivered" : `failed:${result.status}`;
      await memoryDb.addDelivery({
        jobId: job.id,
        target: "webhook",
        status,
        attempt,
        responseStatus,
        deliveredAt: result.ok ? new Date().toISOString() : undefined,
      });
      if (result.ok) break;
    }
    deliveries.push({ target: "webhook", status });
  }
  if (job.delivery.email) {
    const status = process.env.EMAIL_PROVIDER_KEY
      ? "queued"
      : "feature-flag-disabled";
    await memoryDb.addDelivery({
      jobId: job.id,
      target: "email",
      status,
      attempt: 1,
    });
    deliveries.push({ target: "email", status });
  }
  return deliveries;
}
