import { createHash } from "node:crypto";
import {
  normalizeEmail,
  normalizeNameForHashing,
  normalizePhoneForHashing,
} from "@growth-funnel/shared";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

// Meta requires: lowercase + trim, THEN SHA-256, for em/fn/ln; digits-only
// (no leading "+") THEN SHA-256, for ph. ip/ua/fbp/fbc are sent raw — never
// hashed. Getting this backwards silently destroys match rate with no
// visible error, so it's centralized here and unit-tested.
export const hashEmail = (email: string): string => sha256Hex(normalizeEmail(email));
export const hashPhoneE164 = (e164Phone: string): string =>
  sha256Hex(normalizePhoneForHashing(e164Phone));
export const hashName = (name: string): string => sha256Hex(normalizeNameForHashing(name));
