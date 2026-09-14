import { computeActualCost } from "@/lib/cost/pricing";
import { db, isUsingPostgres } from "@/lib/db";
import { deliverJobResult } from "@/lib/delivery";
import { logEvent } from "@/lib/logging/logger";
import { publishJobEvent } from "@/lib/realtime/bus";
import { getRecipe } from "@/recipes/registry";

export async function runRecipeJob(jobId: string) {
  const job = await db.getJob(jobId);
  if (!job || job.status === "cancelled") return;
  const recipe = getRecipe(job.recipe);
  const attempt = job.attempts + 1;
  const checkCancelled = async () => {
    const latest = await db.getJob(jobId);
    if (latest?.status === "cancelled") {
      throw new Error("Job cancelled");
    }
  };
  await db.updateJob(jobId, {
    status: "processing",
    startedAt: new Date().toISOString(),
    attempts: attempt,
  });
  await db.startAttempt(jobId, attempt);
  publishJobEvent(
    await db.addEvent(jobId, {
      status: "processing",
      message: `Attempt ${attempt} started`,
    }),
  );
  logEvent("info", "job_attempt_started", {
    jobId,
    recipe: recipe.id,
    attempt,
  });

  try {
    await checkCancelled();
    const output = await recipe.run(job.input, {
      jobId,
      attempt,
      checkCancelled,
      emit: async (event) => {
        await checkCancelled();
        const record = await db.addEvent(jobId, event);
        publishJobEvent(record);
      },
    });
    await checkCancelled();

    const promptTokens = JSON.stringify(job.input).length;
    const completionTokens = JSON.stringify(output).length;
    const costUsd = computeActualCost(promptTokens, completionTokens, "mock");
    const completed = await db.updateJob(jobId, {
      output,
      status: "complete",
      completedAt: new Date().toISOString(),
      promptTokens,
      completionTokens,
      costUsd,
    });
    await db.finishAttempt(jobId, attempt, "succeeded");
    publishJobEvent(
      await db.addEvent(jobId, {
        status: "complete",
        message: "Job complete",
        chunk: JSON.stringify(output, null, 2),
      }),
    );
    await deliverJobResult(completed);
    logEvent("info", "job_completed", {
      jobId,
      recipe: recipe.id,
      attempt,
      promptTokens,
      completionTokens,
      costUsd,
      durationMs:
        completed.startedAt && completed.completedAt
          ? Date.parse(completed.completedAt) - Date.parse(completed.startedAt)
          : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Job cancelled") {
      await db.finishAttempt(jobId, attempt, "failed", message);
      publishJobEvent(
        await db.addEvent(jobId, { status: "cancelled", message }),
      );
      logEvent("warn", "job_cancelled", { jobId, recipe: recipe.id, attempt });
      return;
    }
    await db.finishAttempt(jobId, attempt, "failed", message);
    if (attempt < 3) {
      await db.updateJob(jobId, { status: "retrying", error: message });
      publishJobEvent(
        await db.addEvent(jobId, {
          status: "retrying",
          message: `Retry scheduled after error: ${message}`,
        }),
      );
      logEvent("warn", "job_retrying", {
        jobId,
        recipe: recipe.id,
        attempt,
        error: message,
      });
      // With Postgres, the worker's poll loop picks up "retrying" jobs on its
      // own; without it, self-reschedule since nothing else is watching.
      if (!isUsingPostgres()) {
        setTimeout(() => {
          void runRecipeJob(jobId);
        }, attempt * 500);
      }
      return;
    }
    await db.updateJob(jobId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: message,
    });
    publishJobEvent(await db.addEvent(jobId, { status: "failed", message }));
    logEvent("error", "job_failed", {
      jobId,
      recipe: recipe.id,
      attempt,
      error: message,
    });
  }
}
