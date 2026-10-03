import { prisma } from "../lib/db.js";

// CLI alternative to POST /admin/jobs/:jobId/requeue. Usage:
//   npm run requeue --workspace worker -- <jobId>
async function main(): Promise<void> {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error("Usage: npm run requeue --workspace worker -- <jobId>");
    process.exitCode = 1;
    return;
  }

  const job = await prisma.job.findUnique({ where: { jobId } });
  if (!job) {
    console.error(`Job ${jobId} not found`);
    process.exitCode = 1;
    return;
  }
  if (job.status !== "dead_letter") {
    console.error(`Job ${jobId} is not dead_letter (current status: ${job.status})`);
    process.exitCode = 1;
    return;
  }

  await prisma.job.update({
    where: { jobId },
    data: {
      status: "pending",
      attempts: 0,
      availableAt: new Date(),
      lastError: null,
      failedAt: null,
      lockedAt: null,
      leaseExpiresAt: null,
    },
  });

  console.log(`Requeued job ${jobId} (lead ${job.leadId}, type ${job.jobType})`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
