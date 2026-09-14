import type { JobRecord } from "@/lib/jobs/types";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging/logger";
import { deliverWebhook } from "./webhook";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deliverJobResult(job: JobRecord) {
  const deliveries: Array<{ target: string; status: string }> = [];
  if (job.delivery.inApp !== false) {
    await db.addDelivery({
      jobId: job.id,
      target: "in-app",
      status: "unread",
      attempt: 1,
    });
    deliveries.push({ target: "in-app", status: "unread" });
    logEvent("info", "delivery_attempted", {
      jobId: job.id,
      deliveryTarget: "in-app",
      status: "unread",
    });
  }
  if (job.delivery.webhookUrl) {
    let status = "failed";
    let responseStatus: number | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (attempt > 1) await sleep(2 ** (attempt - 2) * 1000);
      const result = await deliverWebhook(job.delivery.webhookUrl, {
        jobId: job.id,
        status: job.status,
        output: job.output,
      });
      responseStatus = result.status;
      status = result.ok ? "delivered" : `failed:${result.status}`;
      await db.addDelivery({
        jobId: job.id,
        target: "webhook",
        status,
        attempt,
        responseStatus,
        deliveredAt: result.ok ? new Date().toISOString() : undefined,
      });
      logEvent(result.ok ? "info" : "warn", "delivery_attempted", {
        jobId: job.id,
        deliveryTarget: "webhook",
        status,
        attempt,
        responseStatus,
      });
      if (result.ok) break;
    }
    deliveries.push({ target: "webhook", status });
  }
  if (job.delivery.email) {
    const status = process.env.EMAIL_PROVIDER_KEY
      ? "queued"
      : "feature-flag-disabled";
    await db.addDelivery({
      jobId: job.id,
      target: "email",
      status,
      attempt: 1,
    });
    deliveries.push({ target: "email", status });
    logEvent("info", "delivery_attempted", {
      jobId: job.id,
      deliveryTarget: "email",
      status,
    });
  }
  return deliveries;
}
