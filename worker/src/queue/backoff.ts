// Handpicked schedule rather than a pure formula — matches the assignment's
// example exactly (5s, 30s, 2m, 10m) so behaviour is predictable to demo.
// Beyond the table, we keep doubling from the last entry, capped at 1 hour.
const BACKOFF_SCHEDULE_MS = [5_000, 30_000, 120_000, 600_000];
const MAX_BACKOFF_MS = 60 * 60 * 1000;

/** `attempt` is 1-indexed: the attempt number that just failed. Returns how
 * long to wait before the job becomes available again. */
export function computeBackoffMs(attempt: number): number {
  if (attempt <= 0) return 0;

  const index = attempt - 1;
  if (index < BACKOFF_SCHEDULE_MS.length) {
    return BACKOFF_SCHEDULE_MS[index]!;
  }

  const last = BACKOFF_SCHEDULE_MS[BACKOFF_SCHEDULE_MS.length - 1]!;
  const extraDoublings = index - BACKOFF_SCHEDULE_MS.length + 1;
  return Math.min(last * 2 ** extraDoublings, MAX_BACKOFF_MS);
}
