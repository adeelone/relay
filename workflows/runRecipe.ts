import { computeActualCost } from "@/lib/cost/pricing";
import { memoryDb } from "@/lib/db/memory";
import { deliverJobResult } from "@/lib/delivery";
import { logEvent } from "@/lib/logging/logger";
import { publishJobEvent } from "@/lib/realtime/bus";
import { getRecipe } from "@/recipes/registry";

export async function runRecipeJob(jobId: string) {
  const job = await memoryDb.getJob(jobId);
  if (!job || job.status === "cancelled") return;
  const recipe = getRecipe(job.recipe);
  const attempt = job.attempts + 1;
  const checkCancelled = async () => {
    const latest = await memoryDb.getJob(jobId);
    if (latest?.status === "cancelled") {
      throw new Error("Job cancelled");
    }
  };
  await memoryDb.updateJob(jobId, {
    status: "processing",
    startedAt: new Date().toISOString(),
    attempts: attempt,
  });
  await memoryDb.startAttempt(jobId, attempt);
  publishJobEvent(
    await memoryDb.addEvent(jobId, {
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
        const record = await memoryDb.addEvent(jobId, event);
        publishJobEvent(record);
      },
    });
    await checkCancelled();

    const promptTokens = JSON.stringify(job.input).length;
    const completionTokens = JSON.stringify(output).length;
    const costUsd = computeActualCost(promptTokens, completionTokens, "mock");
    const completed = await memoryDb.updateJob(jobId, {
      output,
      status: "complete",
      completedAt: new Date().toISOString(),
      promptTokens,
      completionTokens,
      costUsd,
    });
    await memoryDb.finishAttempt(jobId, attempt, "succeeded");
    publishJobEvent(
      await memoryDb.addEvent(jobId, {
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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Job cancelled") {
      await memoryDb.finishAttempt(jobId, attempt, "failed", message);
      publishJobEvent(
        await memoryDb.addEvent(jobId, { status: "cancelled", message }),
      );
      logEvent("warn", "job_cancelled", { jobId, recipe: recipe.id, attempt });
      return;
    }
    await memoryDb.finishAttempt(jobId, attempt, "failed", message);
    if (attempt < 3) {
      await memoryDb.updateJob(jobId, { status: "retrying", error: message });
      publishJobEvent(
        await memoryDb.addEvent(jobId, {
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
      setTimeout(() => {
        void runRecipeJob(jobId);
      }, attempt * 500);
      return;
    }
    await memoryDb.updateJob(jobId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: message,
    });
    publishJobEvent(
      await memoryDb.addEvent(jobId, { status: "failed", message }),
    );
    logEvent("error", "job_failed", {
      jobId,
      recipe: recipe.id,
      attempt,
      error: message,
    });
  }
}
