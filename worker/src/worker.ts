import { processAirtableLeadSyncJob } from "./jobs/airtableLeadSync.js";
import { processMetaLeadEventJob } from "./jobs/metaLeadEvent.js";
import { prisma } from "./lib/db.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { claimNextJob, type ClaimedJob } from "./queue/claim.js";
import { markJobCompleted, markJobFailed } from "./queue/finish.js";

let shuttingDown = false;
let currentJobPromise: Promise<void> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processJob(job: ClaimedJob): Promise<void> {
  const startedAt = Date.now();
  try {
    if (job.jobType === "META_LEAD_EVENT") {
      await processMetaLeadEventJob(job);
    } else if (job.jobType === "AIRTABLE_LEAD_SYNC") {
      await processAirtableLeadSyncJob(job);
    } else {
      throw new Error(`Unknown job type: ${String(job.jobType)}`);
    }

    await markJobCompleted(job);
    logger.info(
      {
        jobId: job.jobId,
        leadId: job.leadId,
        jobType: job.jobType,
        status: "completed",
        durationMs: Date.now() - startedAt,
      },
      "Job completed",
    );
  } catch (err) {
    const outcome = await markJobFailed(job, err);
    logger.warn(
      {
        jobId: job.jobId,
        leadId: job.leadId,
        jobType: job.jobType,
        status: outcome,
        durationMs: Date.now() - startedAt,
        errorCode: err instanceof Error ? err.name : "UnknownError",
      },
      "Job failed",
    );
  }
}

async function heartbeat(): Promise<void> {
  // An empty `update: {}` is a no-op in Prisma and silently does NOT bump
  // @updatedAt (confirmed by hitting exactly this during local testing —
  // the admin endpoint kept reporting the worker as stale_or_down despite
  // it actively processing jobs). Setting the field explicitly guarantees
  // every poll cycle actually advances it.
  const now = new Date();
  await prisma.workerHeartbeat.upsert({
    where: { id: 1 },
    create: { id: 1, updatedAt: now },
    update: { updatedAt: now },
  });
}

async function pollLoop(): Promise<void> {
  logger.info(
    {
      pollIntervalMs: env.JOB_POLL_INTERVAL_MS,
      leaseTimeoutMs: env.JOB_LEASE_TIMEOUT_MS,
      maxAttempts: env.MAX_JOB_ATTEMPTS,
      meta: env.META_ENABLED ? "enabled" : "mock",
      airtable: env.AIRTABLE_ENABLED ? "enabled" : "mock",
    },
    "Worker started",
  );

  while (!shuttingDown) {
    try {
      await heartbeat();

      const job = await claimNextJob();
      if (job) {
        currentJobPromise = processJob(job);
        await currentJobPromise;
        currentJobPromise = null;
        continue; // more work may be waiting — check again immediately
      }
    } catch (err) {
      logger.error({ err }, "Worker poll loop error");
    }

    await sleep(env.JOB_POLL_INTERVAL_MS);
  }

  logger.info("Worker poll loop stopped");
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Worker shutting down: no longer claiming new jobs");

  if (currentJobPromise) {
    logger.info("Waiting for in-flight job to finish before exiting");
    await currentJobPromise;
  }

  await prisma.$disconnect();
  logger.info("Worker shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

pollLoop().catch((err: unknown) => {
  logger.error({ err }, "Fatal worker error");
  process.exit(1);
});
