# Submission Notes

## Assumptions

- US/Canada phone numbers (`+1` default normalization) — the reference funnel and
  subject matter (SSA/SSDI) are US-specific.
- The qualification step labeled "age" in the brief's example data model
  (`age: number`) is actually only ever asked as a yes/no "40 or older?" question in
  the brief's own example flow — so I store `ageOver40: boolean`, the thing actually
  collected, rather than fabricate a precise numeric age from a binary answer.
- No real Meta/Airtable credentials were available or appropriate to create for a
  take-home — the system runs, is fully tested, and is demoable end-to-end in mock
  mode, with the real integration clients fully implemented behind the same
  interface (see `META_ENABLED`/`AIRTABLE_ENABLED` in `.env.example`).

## Architecture

React (Vite) funnel → Fastify API → PostgreSQL (system of record) → a hand-rolled
Postgres-backed job queue, polled by an independent worker process, which syncs to
Meta CAPI and Airtable independently and retryably. Full diagram and rationale in
README.md.

## Key Decisions

- **Meta/Airtable clients live in the worker, not the API** — the API's only job is
  validate → persist → enqueue → respond; it never makes an outbound call to a
  third party, so a slow/down integration can never slow down lead capture.
- **Three identifiers, never conflated**: `lead_id` (the business record),
  `event_id` (the Meta conversion, stable across retries), `Idempotency-Key` (this
  specific HTTP request). Each has its own column/constraint.
- **`event_id` is generated client-side**, at the moment the user reaches the
  contact step, and sent to the API — so the browser's `fbq('track','Lead',...,
  {eventID})` call and the worker's server-side CAPI call trivially share one id
  with no extra round-trip.
- **Job claiming uses a single atomic `UPDATE ... WHERE id = (SELECT ... FOR UPDATE
  SKIP LOCKED)` statement**, not a separate select-then-update — eliminates the race
  window entirely rather than mitigating it.

## Meta Tracking

Browser Pixel (`PageView`, `QualificationStarted`, `QualificationCompleted`, `Lead`)
+ server CAPI, sharing one `event_id` per conversion for deduplication. Matching
params (em/ph/fn/ln) are normalized then SHA-256 hashed immediately before the
request is built; ip/ua/fbp/fbc are sent raw, per Meta's spec. No qualification data
is ever sent to Meta — `custom_data` is omitted entirely.

## Reliability

API responds the instant Postgres commits — never waits on Meta/Airtable. Both are
separate job rows that retry independently with exponential backoff (5s/30s/2m/10m,
capped at 1h), move to `dead_letter` after exhausting attempts, and are manually
recoverable (`POST /admin/jobs/:jobId/requeue` or `npm run requeue`) without risk of
duplicating the conversion or the Airtable record, since both syncs are themselves
idempotent. A crashed worker's claimed job is recovered automatically once its lease
expires. Verified live against a real local Postgres instance, not just by reading
the code (see Known Limitations — this caught two real bugs).

## Privacy / Data Handling

Full PII (name/email/phone/qualification/attribution) → PostgreSQL only. Hashed
contact fields + non-sensitive matching params → Meta. Full lead record → Airtable
(an internal operational CRM, not a third party ad platform). Consent is an explicit,
unchecked-by-default checkbox; `consent_given`/`consent_timestamp`/
`privacy_policy_version` are persisted server-side. No PII in logs (pino `redact`),
URLs, or Meta event names/payloads.

## Trade-offs

- A hand-rolled job queue instead of a library (BullMQ, etc.) — the brief explicitly
  asked for this, to demonstrate understanding of the underlying claim/lease/backoff
  problem rather than configuring a tool. Costs: no built-in UI, no job
  scheduling beyond simple backoff.
- No admin authentication — fine for a local/demo deployment; would need it before
  fronting a real production system.
- Attribution/idempotency state lives in `sessionStorage`, not `localStorage` — a
  closed tab means a genuinely fresh attempt rather than resuming a stale one,
  trading a small amount of resilience for stronger data-minimization (no
  indefinitely-lived tracking state in the browser).

## Extra Features

- `/admin/health` diagnostics endpoint (pending/dead-letter jobs, last successful
  job, live worker heartbeat) and a CLI requeue script, beyond the required HTTP
  endpoint.
- 52 automated tests across all five packages, including real component-level
  integration tests of the funnel (render, click through, fill the form, assert the
  success screen and that the Pixel's `Lead` event carries the exact server-confirmed
  `event_id`) rather than only unit tests.
- Failure simulation is hard-refused at boot if `NODE_ENV=production`, so it can
  never be accidentally left on in a real deployment.

## Known Limitations

See README.md "Known limitations" for the full list, including a genuinely
interesting one: every `DateTime` column had to be made explicitly
`@db.Timestamptz` after live testing revealed that Postgres's default
timezone-naive `timestamp` columns, compared against raw-SQL `now()` on a
non-UTC-configured session, silently defeated retry backoff entirely — a bug that
typecheck, lint, and unit tests would never have caught, and that building and
running the whole thing for real did.
