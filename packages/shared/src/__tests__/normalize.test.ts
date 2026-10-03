import { describe, expect, it } from "vitest";
import {
  isValidE164,
  normalizeEmail,
  normalizeNameForHashing,
  normalizePhoneE164,
  normalizePhoneForHashing,
} from "../normalize.js";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  John.Doe@Example.COM  ")).toBe("john.doe@example.com");
  });
});

describe("normalizeNameForHashing", () => {
  it("lowercases and trims", () => {
    expect(normalizeNameForHashing("  Jane  ")).toBe("jane");
  });
});

describe("normalizePhoneE164", () => {
  it("adds the default US country code to a 10-digit number", () => {
    expect(normalizePhoneE164("5551234567")).toBe("+15551234567");
  });

  it("adds the default US country code to a formatted 10-digit number", () => {
    expect(normalizePhoneE164("(555) 123-4567")).toBe("+15551234567");
  });

  it("accepts an 11-digit number already starting with the country code", () => {
    expect(normalizePhoneE164("15551234567")).toBe("+15551234567");
  });

  it("preserves an already-E.164 number", () => {
    expect(normalizePhoneE164("+44 20 7946 0958")).toBe("+442079460958");
  });
});

describe("normalizePhoneForHashing", () => {
  it("strips the leading + for Meta's expected hashing input", () => {
    expect(normalizePhoneForHashing("+15551234567")).toBe("15551234567");
  });
});

describe("isValidE164", () => {
  it("accepts a valid E.164 number", () => {
    expect(isValidE164("+15551234567")).toBe(true);
  });

  it("rejects a number without a leading +", () => {
    expect(isValidE164("15551234567")).toBe(false);
  });

  it("rejects a number that is too short", () => {
    expect(isValidE164("+1555")).toBe(false);
  });

  it("rejects a leading zero after the +", () => {
    expect(isValidE164("+0551234567")).toBe(false);
  });
});
