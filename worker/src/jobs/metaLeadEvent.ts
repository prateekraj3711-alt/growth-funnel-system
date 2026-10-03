import { prisma } from "../lib/db.js";
import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { MetaCapiClient } from "../integrations/meta/client.js";
import type { ClaimedJob } from "../queue/claim.js";

const metaClient = new MetaCapiClient(
  {
    enabled: env.META_ENABLED,
    pixelId: env.META_PIXEL_ID,
    accessToken: env.META_ACCESS_TOKEN,
    testEventCode: env.META_TEST_EVENT_CODE || undefined,
    simulateFailure: env.META_SIMULATE_FAILURE,
  },
  logger,
);

interface MetaJobPayload {
  eventId: string;
  clientIp?: string | null;
  userAgent?: string | null;
  eventSourceUrl?: string | null;
}

export async function processMetaLeadEventJob(job: ClaimedJob): Promise<void> {
  const payload = job.payload as MetaJobPayload;

  const lead = await prisma.lead.findUnique({ where: { leadId: job.leadId } });
  if (!lead) {
    throw new Error(`Lead ${job.leadId} not found for META_LEAD_EVENT job ${job.jobId}`);
  }

  await metaClient.sendLeadEvent({
    eventId: payload.eventId,
    // event_time is the moment the conversion actually happened (lead
    // creation), not the moment this retry runs — stable across retries.
    eventTime: Math.floor(lead.createdAt.getTime() / 1000),
    eventSourceUrl: payload.eventSourceUrl ?? undefined,
    userData: {
      email: lead.email,
      phone: lead.phone,
      firstName: lead.firstName,
      lastName: lead.lastName,
      clientIp: payload.clientIp ?? undefined,
      userAgent: payload.userAgent ?? undefined,
      fbp: lead.fbp ?? undefined,
      fbc: lead.fbc ?? undefined,
    },
  });

  await prisma.event.update({
    where: { eventId: payload.eventId },
    data: { eventStatus: "sent", sentAt: new Date() },
  });
}
