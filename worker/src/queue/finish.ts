import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { computeBackoffMs } from "./backoff.js";
import type { ClaimedJob } from "./claim.js";

export async function markJobCompleted(job: ClaimedJob): Promise<void> {
  await prisma.job.update({
    where: { jobId: job.jobId },
    data: {
      status: "completed",
      processedAt: new Date(),
      lastError: null,
      lockedAt: null,
      leaseExpiresAt: null,
    },
  });
}

export async function markJobFailed(
  job: ClaimedJob,
  error: unknown,
): Promise<"retry" | "dead_letter"> {
  const message = error instanceof Error ? error.message : String(error);

  if (job.attempts >= job.maxAttempts) {
    await prisma.job.update({
      where: { jobId: job.jobId },
      data: {
        status: "dead_letter",
        failedAt: new Date(),
        lastError: message,
        lockedAt: null,
        leaseExpiresAt: null,
      },
    });
    logger.error(
      { jobId: job.jobId, leadId: job.leadId, jobType: job.jobType, attempts: job.attempts },
      "Job exhausted all retries, moved to dead_letter",
    );
    return "dead_letter";
  }

  const delayMs = computeBackoffMs(job.attempts);
  await prisma.job.update({
    where: { jobId: job.jobId },
    data: {
      status: "pending",
      availableAt: new Date(Date.now() + delayMs),
      lastError: message,
      lockedAt: null,
      leaseExpiresAt: null,
    },
  });
  logger.warn(
    { jobId: job.jobId, leadId: job.leadId, jobType: job.jobType, attempts: job.attempts, delayMs },
    "Job failed, scheduled for retry",
  );
  return "retry";
}
