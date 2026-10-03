import { z } from "zod";
import { isValidE164, normalizeEmail, normalizePhoneE164 } from "@growth-funnel/shared";

// Single source of truth for request shape. Used both client-side (fast
// inline feedback) and server-side (the only copy that is actually
// trusted — see apps/api/src/routes/leads.ts).

export const leadContactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(254)
    .transform(normalizeEmail),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20, "Enter a valid phone number")
    .transform((value) => normalizePhoneE164(value))
    .refine(isValidE164, "Enter a valid phone number"),
});

export const qualificationSchema = z.object({
  ageOver40: z.boolean().optional(),
  receivesBenefits: z.boolean().optional(),
  employed: z.boolean().optional(),
  conditionLimitsWork: z.boolean().optional(),
});

export const attributionSchema = z.object({
  utmSource: z.string().trim().max(255).optional(),
  utmMedium: z.string().trim().max(255).optional(),
  utmCampaign: z.string().trim().max(255).optional(),
  utmContent: z.string().trim().max(255).optional(),
  utmTerm: z.string().trim().max(255).optional(),
  fbclid: z.string().trim().max(500).optional(),
  landingPage: z.string().trim().max(2048).optional(),
  referrer: z.string().trim().max(2048).optional(),
  firstTouchAt: z.string().datetime().optional(),
});

export const trackingSchema = z.object({
  fbp: z.string().trim().max(255).optional(),
  fbc: z.string().trim().max(255).optional(),
});

export const consentSchema = z.object({
  consentGiven: z
    .boolean()
    .refine((value) => value === true, { message: "Consent is required to submit" }),
  consentTimestamp: z.string().datetime(),
  privacyPolicyVersion: z.string().trim().min(1).max(50),
});

export const createLeadRequestSchema = z.object({
  eventId: z.string().uuid("eventId must be a valid UUID"),
  lead: leadContactSchema,
  qualification: qualificationSchema,
  attribution: attributionSchema,
  tracking: trackingSchema,
  consent: consentSchema,
});

export type CreateLeadRequestParsed = z.output<typeof createLeadRequestSchema>;

/** Loose on purpose: any client (browser fetch, curl, a retried request from
 * a flaky mobile network) just needs to send the same opaque string back. */
export const idempotencyKeyHeaderSchema = z
  .string()
  .trim()
  .min(8, "Idempotency-Key header is required")
  .max(255);

export * from "./dead-letter.js";
