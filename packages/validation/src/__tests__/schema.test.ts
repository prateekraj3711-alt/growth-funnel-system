import { describe, expect, it } from "vitest";
import {
  consentSchema,
  createLeadRequestSchema,
  idempotencyKeyHeaderSchema,
  leadContactSchema,
} from "../index.js";

const validContact = {
  firstName: "Jane",
  lastName: "Doe",
  email: "Jane.Doe@Example.com",
  phone: "5551234567",
};

const validConsent = {
  consentGiven: true,
  consentTimestamp: "2026-01-01T00:00:00.000Z",
  privacyPolicyVersion: "1.0.0",
};

function validRequest(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "11111111-1111-1111-1111-111111111111",
    lead: validContact,
    qualification: { ageOver40: true, receivesBenefits: false, employed: false, conditionLimitsWork: true },
    attribution: { utmSource: "facebook" },
    tracking: {},
    consent: validConsent,
    ...overrides,
  };
}

describe("leadContactSchema", () => {
  it("accepts a valid contact and normalizes email + phone", () => {
    const result = leadContactSchema.safeParse(validContact);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jane.doe@example.com");
      expect(result.data.phone).toBe("+15551234567");
    }
  });

  it("rejects an empty first name", () => {
    const result = leadContactSchema.safeParse({ ...validContact, firstName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = leadContactSchema.safeParse({ ...validContact, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a phone number that's too short", () => {
    const result = leadContactSchema.safeParse({ ...validContact, phone: "123" });
    expect(result.success).toBe(false);
  });
});

describe("consentSchema", () => {
  it("rejects consentGiven: false — consent must be explicitly affirmative", () => {
    const result = consentSchema.safeParse({ ...validConsent, consentGiven: false });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed timestamp", () => {
    const result = consentSchema.safeParse({ ...validConsent, consentTimestamp: "not-a-date" });
    expect(result.success).toBe(false);
  });
});

describe("createLeadRequestSchema", () => {
  it("accepts a fully valid request", () => {
    const result = createLeadRequestSchema.safeParse(validRequest());
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID eventId", () => {
    const result = createLeadRequestSchema.safeParse(validRequest({ eventId: "not-a-uuid" }));
    expect(result.success).toBe(false);
  });

  it("accepts qualification fields being entirely absent (not every step is required to answer every field)", () => {
    const result = createLeadRequestSchema.safeParse(validRequest({ qualification: {} }));
    expect(result.success).toBe(true);
  });

  it("rejects a request missing the lead object entirely", () => {
    const { lead: _lead, ...withoutLead } = validRequest();
    const result = createLeadRequestSchema.safeParse(withoutLead);
    expect(result.success).toBe(false);
  });
});

describe("idempotencyKeyHeaderSchema", () => {
  it("accepts a reasonable opaque key", () => {
    expect(idempotencyKeyHeaderSchema.safeParse("a-sufficiently-long-key-123").success).toBe(true);
  });

  it("rejects an undefined header (header missing entirely)", () => {
    expect(idempotencyKeyHeaderSchema.safeParse(undefined).success).toBe(false);
  });

  it("rejects a too-short key", () => {
    expect(idempotencyKeyHeaderSchema.safeParse("short").success).toBe(false);
  });
});
