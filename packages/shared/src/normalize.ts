// Canonical normalization rules. Used in exactly two places: server-side
// request validation (apps/api) and immediately before SHA-256 hashing for
// Meta CAPI (apps/api/src/integrations/meta). Having one implementation
// means the API and the Meta client can never normalize differently and
// silently break Meta's matching.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Best-effort E.164 normalization. Defaults to the US/Canada country code
 * (+1) since the reference funnel and its SSA/SSDI subject matter are
 * US-specific — documented as an assumption in SUBMISSION.md. */
export function normalizePhoneE164(raw: string, defaultCountryCode = "1"): string {
  const hadPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");

  if (hadPlus) return `+${digits}`;
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith(defaultCountryCode)) return `+${digits}`;
  return `+${digits}`;
}

/** Meta requires lowercased, trimmed first/last name before hashing. */
export function normalizeNameForHashing(name: string): string {
  return name.trim().toLowerCase();
}

/** Meta requires digits-only (no leading +) phone before hashing. */
export function normalizePhoneForHashing(e164: string): string {
  return e164.replace(/\D/g, "");
}

export function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}
