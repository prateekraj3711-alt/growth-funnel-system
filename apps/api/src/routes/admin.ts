import type { FastifyInstance } from "fastify";
import { requeueJobParamsSchema } from "@growth-funnel/validation";
import { prisma } from "../lib/db.js";
import { env } from "../lib/env.js";

const WORKER_STALE_AFTER_MS = 30_000;

/**
 * Lightweight diagnostics — deliberately NOT a dashboard (see assignment
 * §37 "keep it lightweight"). Returns plain JSON; the web app renders it at
 * /admin/health if you want a visual, but curling this endpoint is enough
 * to demo reliability during the Loom.
 */
export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin/health", async (_request, reply) => {
    const [heartbeat, pendingJobs, deadLetterJobs, lastCompletedJob, databaseHealthy] =
      await Promise.all([
        prisma.workerHeartbeat.findUnique({ where: { id: 1 } }),
        prisma.job.count({ where: { status: { in: ["pending", "processing"] } } }),
        prisma.job.findMany({
          where: { status: "dead_letter" },
          orderBy: { failedAt: "desc" },
          take: 20,
        }),
        prisma.job.findFirst({ where: { status: "completed" }, orderBy: { processedAt: "desc" } }),
        prisma
          .$queryRaw`SELECT 1`
          .then(() => true)
          .catch(() => false),
      ]);

    const workerHealthy = heartbeat
      ? Date.now() - heartbeat.updatedAt.getTime() < WORKER_STALE_AFTER_MS
      : false;

    return reply.send({
      api: "healthy",
      database: databaseHealthy ? "healthy" : "unhealthy",
      worker: workerHealthy ? "healthy" : "stale_or_down",
      meta: env.META_ENABLED ? "enabled" : "disabled",
      airtable: env.AIRTABLE_ENABLED ? "enabled" : "disabled",
      pendingJobs,
      deadLetterJobs: deadLetterJobs.map((job) => ({
        jobId: job.jobId,
        leadId: job.leadId,
        jobType: job.jobType,
        attempts: job.attempts,
        lastError: job.lastError,
        failedAt: job.failedAt,
      })),
      lastSuccessfulJob: lastCompletedJob
        ? {
            jobId: lastCompletedJob.jobId,
            jobType: lastCompletedJob.jobType,
            processedAt: lastCompletedJob.processedAt,
          }
        : null,
    });
  });

  app.post("/admin/jobs/:jobId/requeue", async (request, reply) => {
    const params = requeueJobParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ success: false, error: "Invalid jobId" });
    }

    const job = await prisma.job.findUnique({ where: { jobId: params.data.jobId } });
    if (!job) {
      return reply.code(404).send({ success: false, error: "Job not found" });
    }
    if (job.status !== "dead_letter") {
      return reply
        .code(409)
        .send({ success: false, error: `Job is not dead_letter (current status: ${job.status})` });
    }

    // Safe to requeue: Meta dedups by the original stable event_id, and
    // Airtable dedups by lead_id — so retrying this job cannot create a
    // duplicate conversion or a duplicate Airtable record.
    await prisma.job.update({
      where: { jobId: job.jobId },
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

    request.log.info({ jobId: job.jobId }, "Dead-letter job manually requeued");
    return reply.send({ success: true, jobId: job.jobId, status: "pending" });
  });
}
