// Types shared between the funnel (apps/web), the API (apps/api) and the
// worker. Anything that crosses the HTTP boundary or the jobs table lives
// here so the three services can never drift out of sync.

export interface LeadContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/** What the qualification funnel actually collects. See SUBMISSION.md for
 * why `ageOver40` is a boolean rather than a numeric age. */
export interface QualificationData {
  ageOver40?: boolean;
  receivesBenefits?: boolean;
  employed?: boolean;
  conditionLimitsWork?: boolean;
}

/** First-touch acquisition parameters. Captured once, on the first landing
 * in the browser session, and never overwritten afterwards. */
export interface AttributionData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  landingPage?: string;
  referrer?: string;
  /** ISO-8601 timestamp of first touch. */
  firstTouchAt?: string;
}

/** Meta's own browser-assigned identifiers, read from first-party cookies. */
export interface TrackingData {
  fbp?: string;
  fbc?: string;
}

export interface ConsentData {
  consentGiven: boolean;
  /** ISO-8601 timestamp of when consent was given. */
  consentTimestamp: string;
  privacyPolicyVersion: string;
}

/** Body of POST /api/leads. `eventId` is generated client-side and becomes
 * the single event_id shared by the browser Pixel "Lead" event and the
 * server-side CAPI "Lead" event for this exact conversion. */
export interface CreateLeadRequest {
  eventId: string;
  lead: LeadContact;
  qualification: QualificationData;
  attribution: AttributionData;
  tracking: TrackingData;
  consent: ConsentData;
}

export interface CreateLeadResponseBody {
  success: true;
  leadId: string;
  status: "accepted";
  eventId: string;
}

export interface ApiErrorResponseBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

export type ApiLeadResponse = CreateLeadResponseBody | ApiErrorResponseBody;

export type FunnelStepType = "boolean" | "number" | "text" | "email" | "phone";

export interface FunnelStepOption {
  label: string;
  value: string;
}

/** A single qualification micro-question. Keeping these in config (rather
 * than hardcoded per-component) means adding/editing/reordering questions
 * never touches the step-rendering components. */
export interface FunnelStep {
  id: keyof QualificationData;
  /** Analytics key pushed to the dataLayer / GTM for this specific step. */
  dlKey: string;
  question: string;
  type: FunnelStepType;
  required: boolean;
  options?: FunnelStepOption[];
  /** If the user picks an option with this flag, the funnel ends early as
   * not-a-fit rather than continuing to the contact step. */
  disqualifyingValues?: string[];
}

export const JOB_TYPES = ["META_LEAD_EVENT", "AIRTABLE_LEAD_SYNC"] as const;
export type JobTypeName = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "dead_letter",
] as const;
export type JobStatusName = (typeof JOB_STATUSES)[number];

export const META_EVENTS = {
  PAGE_VIEW: "PageView",
  QUALIFICATION_STARTED: "QualificationStarted",
  QUALIFICATION_COMPLETED: "QualificationCompleted",
  LEAD: "Lead",
} as const;
