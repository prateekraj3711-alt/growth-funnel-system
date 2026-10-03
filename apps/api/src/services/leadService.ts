import { Prisma } from "@prisma/client";
import type { CreateLeadRequestParsed } from "@growth-funnel/validation";
import type { CreateLeadResponseBody } from "@growth-funnel/shared";
import { env } from "../lib/env.js";
import { prisma } from "../lib/db.js";
import { generateJobId, generateLeadId } from "../lib/ids.js";
import { logger } from "../lib/logger.js";
import { findExistingIdempotentResponse, hashRequestBody } from "./idempotency.js";

export interface CreateLeadContext {
  requestId: string;
  idempotencyKey: string;
  clientIp?: string;
  userAgent?: string;
}

export interface CreateLeadResult {
  /** "created" on the first successful submission, "replayed" on every
   * idempotent retry after that — both return 200 with the same body. */
  outcome: "created" | "replayed";
  body: CreateLeadResponseBody;
}

/**
 * The only path into PostgreSQL for a lead. Everything downstream (Meta,
 * Airtable) is created as pending jobs in the SAME transaction as the lead
 * row, so a lead can never exist without its jobs, and the jobs can never
 * exist without a persisted lead — see SUBMISSION.md "Reliability".
 */
export async function createLead(
  input: CreateLeadRequestParsed,
  ctx: CreateLeadContext,
): Promise<CreateLeadResult> {
  const requestHash = hashRequestBody(input);

  const existing = await findExistingIdempotentResponse(ctx.idempotencyKey, requestHash);
  if (existing) {
    logger.info(
      { requestId: ctx.requestId, idempotencyKey: ctx.idempotencyKey, leadId: existing.leadId },
      "Idempotent replay: returning cached response, no new lead created",
    );
    return { outcome: "replayed", body: existing };
  }

  const leadId = generateLeadId();
  const metaJobId = generateJobId();
  const airtableJobId = generateJobId();

  const responseBody: CreateLeadResponseBody = {
    success: true,
    leadId,
    status: "accepted",
    eventId: input.eventId,
  };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.lead.create({
        data: {
          leadId,
          firstName: input.lead.firstName,
          lastName: input.lead.lastName,
          email: input.lead.email,
          phone: input.lead.phone,
          ageOver40: input.qualification.ageOver40 ?? null,
          receivesBenefits: input.qualification.receivesBenefits ?? null,
          employed: input.qualification.employed ?? null,
          conditionLimitsWork: input.qualification.conditionLimitsWork ?? null,
          utmSource: input.attribution.utmSource,
          utmMedium: input.attribution.utmMedium,
          utmCampaign: input.attribution.utmCampaign,
          utmContent: input.attribution.utmContent,
          utmTerm: input.attribution.utmTerm,
          fbclid: input.attribution.fbclid,
          landingPage: input.attribution.landingPage,
          referrer: input.attribution.referrer,
          firstTouchAt: input.attribution.firstTouchAt
            ? new Date(input.attribution.firstTouchAt)
            : null,
          fbp: input.tracking.fbp,
          fbc: input.tracking.fbc,
          consentGiven: input.consent.consentGiven,
          consentTimestamp: new Date(input.consent.consentTimestamp),
          privacyPolicyVersion: input.consent.privacyPolicyVersion,
          requestId: ctx.requestId,
        },
      });

      await tx.event.create({
        data: {
          eventId: input.eventId,
          leadId,
          eventName: "Lead",
          eventStatus: "pending",
          // Non-PII summary only. Never raw email/phone — see
          // SUBMISSION.md "Privacy / Data Handling".
          payload: { leadId, requestId: ctx.requestId },
        },
      });

      await tx.job.create({
        data: {
          jobId: metaJobId,
          leadId,
          jobType: "META_LEAD_EVENT",
          status: "pending",
          maxAttempts: env.MAX_JOB_ATTEMPTS,
          payload: {
            eventId: input.eventId,
            clientIp: ctx.clientIp ?? null,
            userAgent: ctx.userAgent ?? null,
            eventSourceUrl: input.attribution.landingPage ?? null,
          },
        },
      });

      await tx.job.create({
        data: {
          jobId: airtableJobId,
          leadId,
          jobType: "AIRTABLE_LEAD_SYNC",
          status: "pending",
          maxAttempts: env.MAX_JOB_ATTEMPTS,
          payload: {},
        },
      });

      await tx.idempotencyKey.create({
        data: {
          key: ctx.idempotencyKey,
          leadId,
          requestHash,
          responseBody: responseBody as unknown as Prisma.InputJsonValue,
        },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Two concurrent requests raced on the same Idempotency-Key (e.g. a
      // double-click firing two requests before the first commits). One
      // wins the insert; the loser replays the winner's result instead of
      // erroring — this IS the idempotency guarantee under concurrency.
      const raced = await findExistingIdempotentResponse(ctx.idempotencyKey, requestHash);
      if (raced) {
        logger.info(
          { requestId: ctx.requestId, idempotencyKey: ctx.idempotencyKey },
          "Idempotency race detected: replaying winning request's result",
        );
        return { outcome: "replayed", body: raced };
      }
    }
    throw err;
  }

  logger.info(
    { requestId: ctx.requestId, leadId, eventId: input.eventId, metaJobId, airtableJobId },
    "Lead created, jobs enqueued",
  );

  return { outcome: "created", body: responseBody };
}
