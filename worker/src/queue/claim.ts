import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import { env } from "../lib/env.js";

export interface ClaimedJob {
  id: string;
  jobId: string;
  leadId: string;
  jobType: "META_LEAD_EVENT" | "AIRTABLE_LEAD_SYNC";
  status: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
}

interface ClaimRow {
  id: string;
  job_id: string;
  lead_id: string;
  job_type: string;
  status: string;
  payload: unknown;
  attempts: number;
  max_attempts: number;
}

/**
 * Atomically claims the single oldest available job — either a fresh
 * `pending` job, or a `processing` job whose lease has expired (meaning
 * whatever worker claimed it crashed or was killed before finishing).
 *
 * `FOR UPDATE SKIP LOCKED` inside the sub-select means two workers racing
 * this query at the same instant can never claim the same row: one takes
 * the lock, the other skips past it and either claims the next row or
 * finds nothing. Because the lock-and-update happen in a single statement,
 * there is no gap between "select" and "update" for a second worker to
 * race into.
 */
export async function claimNextJob(): Promise<ClaimedJob | null> {
  const rows = await prisma.$queryRaw<ClaimRow[]>(Prisma.sql`
    UPDATE jobs
    SET status = 'processing',
        attempts = attempts + 1,
        locked_at = now(),
        lease_expires_at = now() + (${env.JOB_LEASE_TIMEOUT_MS}::text || ' milliseconds')::interval,
        updated_at = now()
    WHERE id = (
      SELECT id FROM jobs
      WHERE (status = 'pending' AND available_at <= now())
         OR (status = 'processing' AND lease_expires_at < now())
      ORDER BY available_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, job_id, lead_id, job_type, status, payload, attempts, max_attempts
  `);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    jobId: row.job_id,
    leadId: row.lead_id,
    jobType: row.job_type as ClaimedJob["jobType"],
    status: row.status,
    payload: row.payload,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
  };
}
