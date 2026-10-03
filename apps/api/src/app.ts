import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyError } from "fastify";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { adminRoutes } from "./routes/admin.js";
import { healthRoutes } from "./routes/health.js";
import { leadsRoutes } from "./routes/leads.js";

// No explicit return-type annotation: passing a pino instance via
// `loggerInstance` specializes Fastify's logger generic, and widening it
// back to the default `FastifyInstance` here breaks route typing. Letting
// TS infer the real (specialized) type is the fix, not a type hole.
export async function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
    // This endpoint only ever receives a small JSON form — 32KB is
    // generous headroom, not a real payload, and rejects abuse early.
    bodyLimit: 32 * 1024,
    trustProxy: true,
  });

  // WEB_ORIGIN may be a single origin or a comma-separated list (e.g. a
  // production domain plus preview deployments). Never falls back to "*" —
  // an unmatched origin is simply refused.
  const allowedOrigins = env.WEB_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  });

  await app.register(rateLimit, {
    max: 20,
    timeWindow: "1 minute",
  });

  await app.register(leadsRoutes);
  await app.register(healthRoutes);
  await app.register(adminRoutes);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "Unhandled error");
    const status = error.statusCode ?? 500;
    reply.code(status).send({
      success: false,
      error: {
        code: status === 429 ? "RATE_LIMITED" : "INTERNAL_ERROR",
        message: status === 429 ? "Too many requests. Please slow down." : "Something went wrong.",
      },
      requestId: request.id,
    });
  });

  return app;
}
