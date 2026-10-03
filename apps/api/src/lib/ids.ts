import { randomUUID } from "node:crypto";

// Deliberately distinct prefixes/identifiers for the three concepts the
// assignment calls out as easy to conflate — see SUBMISSION.md "Key
// Decisions" for why lead_id, event_id and idempotency_key are never the
// same value.
export const generateLeadId = (): string => `lead_${randomUUID()}`;
export const generateJobId = (): string => `job_${randomUUID()}`;
export const generateRequestId = (): string => `req_${randomUUID()}`;
