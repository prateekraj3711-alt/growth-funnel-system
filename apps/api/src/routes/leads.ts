import type { FastifyInstance } from "fastify";
import type { ApiErrorResponseBody } from "@growth-funnel/shared";
import { createLeadRequestSchema, idempotencyKeyHeaderSchema } from "@growth-funnel/validation";
import { generateRequestId } from "../lib/ids.js";
import { IdempotencyConflictError } from "../services/idempotency.js";
import { createLead } from "../services/leadService.js";

export async function leadsRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/leads", async (request, reply) => {
    const requestId =
      (request.headers["x-request-id"] as string | undefined) || generateRequestId();
    reply.header("x-request-id", requestId);

    const idempotencyParsed = idempotencyKeyHeaderSchema.safeParse(
      request.headers["idempotency-key"],
    );
    if (!idempotencyParsed.success) {
      const body: ApiErrorResponseBody = {
        success: false,
        error: {
          code: "MISSING_IDEMPOTENCY_KEY",
          message: "Idempotency-Key header is required",
        },
        requestId,
      };
      return reply.code(400).send(body);
    }

    const parsed = createLeadRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      request.log.warn(
        { requestId, errors: parsed.error.flatten() },
        "Lead submission failed validation",
      );
      const body: ApiErrorResponseBody = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "The submitted information is invalid.",
          details: parsed.error.flatten(),
        },
        requestId,
      };
      return reply.code(422).send(body);
    }

    try {
      const result = await createLead(parsed.data, {
        requestId,
        idempotencyKey: idempotencyParsed.data,
        clientIp: request.ip,
        userAgent: request.headers["user-agent"],
      });

      // 200 either way: a first-time creation and an idempotent replay are
      // both a successful "accepted" outcome from the caller's point of
      // view. The response body is byte-for-byte identical on replay.
      return reply.code(200).send(result.body);
    } catch (err) {
      if (err instanceof IdempotencyConflictError) {
        const body: ApiErrorResponseBody = {
          success: false,
          error: { code: "IDEMPOTENCY_KEY_CONFLICT", message: err.message },
          requestId,
        };
        return reply.code(409).send(body);
      }

      request.log.error({ requestId, err }, "Failed to create lead");
      const body: ApiErrorResponseBody = {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
        requestId,
      };
      return reply.code(500).send(body);
    }
  });
}
