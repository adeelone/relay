import type { JobRecord } from "@/lib/jobs/types";
import { deliverWebhook } from "./webhook";

export async function deliverJobResult(job: JobRecord) {
  const deliveries: Array<{ target: string; status: string }> = [];
  if (job.delivery.inApp !== false) {
    deliveries.push({ target: "in-app", status: "unread" });
  }
  if (job.delivery.webhookUrl) {
    const result = await deliverWebhook(job.delivery.webhookUrl, { jobId: job.id, status: job.status, output: job.output });
    deliveries.push({ target: "webhook", status: result.ok ? "delivered" : `failed:${result.status}` });
  }
  if (job.delivery.email) {
    deliveries.push({ target: "email", status: process.env.EMAIL_PROVIDER_KEY ? "queued" : "feature-flag-disabled" });
  }
  return deliveries;
}
