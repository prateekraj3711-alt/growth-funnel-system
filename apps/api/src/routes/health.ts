import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/db.js";
import { env } from "../lib/env.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async (_request, reply) => {
    const databaseHealthy = await prisma
      .$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false);

    const body = {
      status: databaseHealthy ? "healthy" : "degraded",
      database: databaseHealthy ? "healthy" : "unhealthy",
      meta: env.META_ENABLED ? "enabled" : "disabled",
      airtable: env.AIRTABLE_ENABLED ? "enabled" : "disabled",
    };

    return reply.code(databaseHealthy ? 200 : 503).send(body);
  });
}
