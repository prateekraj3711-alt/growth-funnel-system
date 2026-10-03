import { createHash } from "node:crypto";
import type { CreateLeadResponseBody } from "@growth-funnel/shared";
import { prisma } from "../lib/db.js";

export function hashRequestBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

/** Same Idempotency-Key reused for a materially different request body —
 * this is a client bug, not a legitimate retry, so it must not silently
 * replay the wrong lead's result. */
export class IdempotencyConflictError extends Error {
  constructor() {
    super("Idempotency-Key was already used with a different request body");
    this.name = "IdempotencyConflictError";
  }
}

export async function findExistingIdempotentResponse(
  key: string,
  requestHash: string,
): Promise<CreateLeadResponseBody | null> {
  const existing = await prisma.idempotencyKey.findUnique({ where: { key } });
  if (!existing) return null;
  if (existing.requestHash !== requestHash) {
    throw new IdempotencyConflictError();
  }
  return existing.responseBody as unknown as CreateLeadResponseBody;
}
