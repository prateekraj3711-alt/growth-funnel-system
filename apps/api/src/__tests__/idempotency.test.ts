import { describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
vi.mock("../lib/db.js", () => ({
  prisma: { idempotencyKey: { findUnique } },
}));

const { findExistingIdempotentResponse, hashRequestBody, IdempotencyConflictError } = await import(
  "../services/idempotency.js"
);

describe("hashRequestBody", () => {
  it("is deterministic for identical input", () => {
    const body = { a: 1, b: "two" };
    expect(hashRequestBody(body)).toBe(hashRequestBody({ a: 1, b: "two" }));
  });

  it("differs for different input", () => {
    expect(hashRequestBody({ a: 1 })).not.toBe(hashRequestBody({ a: 2 }));
  });
});

describe("findExistingIdempotentResponse", () => {
  it("returns null when no key exists yet (first submission)", async () => {
    findUnique.mockResolvedValueOnce(null);
    const result = await findExistingIdempotentResponse("key-1", "hash-1");
    expect(result).toBeNull();
  });

  it("returns the cached response when the key exists with a matching hash (true retry)", async () => {
    findUnique.mockResolvedValueOnce({
      key: "key-1",
      requestHash: "hash-1",
      responseBody: { success: true, leadId: "lead_abc", status: "accepted", eventId: "evt_abc" },
    });
    const result = await findExistingIdempotentResponse("key-1", "hash-1");
    expect(result).toEqual({
      success: true,
      leadId: "lead_abc",
      status: "accepted",
      eventId: "evt_abc",
    });
  });

  it("throws IdempotencyConflictError when the key is reused with a different body", async () => {
    findUnique.mockResolvedValueOnce({
      key: "key-1",
      requestHash: "hash-1",
      responseBody: {},
    });
    await expect(findExistingIdempotentResponse("key-1", "hash-DIFFERENT")).rejects.toBeInstanceOf(
      IdempotencyConflictError,
    );
  });
});
