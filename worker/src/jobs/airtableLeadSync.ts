import { prisma } from "../lib/db.js";
import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import { AirtableClient } from "../integrations/airtable/client.js";
import type { ClaimedJob } from "../queue/claim.js";

const airtableClient = new AirtableClient(
  {
    enabled: env.AIRTABLE_ENABLED,
    apiKey: env.AIRTABLE_API_KEY,
    baseId: env.AIRTABLE_BASE_ID,
    tableId: env.AIRTABLE_TABLE_ID,
    simulateFailure: env.AIRTABLE_SIMULATE_FAILURE,
  },
  logger,
);

export async function processAirtableLeadSyncJob(job: ClaimedJob): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { leadId: job.leadId } });
  if (!lead) {
    throw new Error(`Lead ${job.leadId} not found for AIRTABLE_LEAD_SYNC job ${job.jobId}`);
  }

  const leadEvent = await prisma.event.findFirst({
    where: { leadId: job.leadId, eventName: "Lead" },
  });

  await airtableClient.upsertLead({
    lead_id: lead.leadId,
    created_at: lead.createdAt.toISOString(),
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    qualification_age_over_40: lead.ageOver40 ?? undefined,
    receives_benefits: lead.receivesBenefits ?? undefined,
    employed: lead.employed ?? undefined,
    condition_limits_work: lead.conditionLimitsWork ?? undefined,
    utm_source: lead.utmSource ?? undefined,
    utm_medium: lead.utmMedium ?? undefined,
    utm_campaign: lead.utmCampaign ?? undefined,
    utm_content: lead.utmContent ?? undefined,
    utm_term: lead.utmTerm ?? undefined,
    fbclid: lead.fbclid ?? undefined,
    fbp: lead.fbp ?? undefined,
    fbc: lead.fbc ?? undefined,
    event_id: leadEvent?.eventId ?? "",
  });
}
