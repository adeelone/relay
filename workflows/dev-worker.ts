import { backendReady, db, isUsingPostgres } from "@/lib/db";
import { logEvent } from "@/lib/logging/logger";
import { workflowTasks } from "./index";
import { runRecipeJob } from "./runRecipe";

const POLL_INTERVAL_MS = 2_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let stopped = false;

async function pollLoop() {
  while (!stopped) {
    let job;
    try {
      job = await db.claimNextJob();
    } catch (error) {
      logEvent("error", "worker_poll_error", {
        error: error instanceof Error ? error.message : "unknown error",
      });
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    if (!job) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    logEvent("info", "worker_claimed_job", {
      jobId: job.id,
      recipe: job.recipe,
    });
    await runRecipeJob(job.id);
  }
}

async function main() {
  await backendReady();
  console.log(
    `Relay worker ready with ${workflowTasks.length} registered recipe tasks.`,
  );

  if (!isUsingPostgres()) {
    console.log(
      "No reachable Postgres backend: the web process executes jobs inline " +
        "against its own in-memory store, which this separate process can't " +
        "see. Nothing to poll — exiting. Set DATABASE_URL to a reachable " +
        "Postgres instance to run a real, independent worker.",
    );
    return;
  }

  console.log(
    `Polling for queued/retrying jobs every ${POLL_INTERVAL_MS}ms (Postgres backend).`,
  );
  await pollLoop();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopped = true;
    process.exit(0);
  });
}

void main();
