import { describe, expect, it } from "vitest";
import { computeBackoffMs } from "../queue/backoff.js";

describe("computeBackoffMs", () => {
  it("matches the assignment's documented schedule exactly", () => {
    expect(computeBackoffMs(1)).toBe(5_000); // 5 seconds
    expect(computeBackoffMs(2)).toBe(30_000); // 30 seconds
    expect(computeBackoffMs(3)).toBe(120_000); // 2 minutes
    expect(computeBackoffMs(4)).toBe(600_000); // 10 minutes
  });

  it("keeps doubling from the last scheduled entry beyond the table", () => {
    expect(computeBackoffMs(5)).toBe(1_200_000); // 20 minutes
    expect(computeBackoffMs(6)).toBe(2_400_000); // 40 minutes
  });

  it("caps the backoff at 1 hour so retries never wait indefinitely", () => {
    expect(computeBackoffMs(10)).toBe(60 * 60 * 1000);
    expect(computeBackoffMs(50)).toBe(60 * 60 * 1000);
  });

  it("returns 0 for a non-positive attempt number", () => {
    expect(computeBackoffMs(0)).toBe(0);
    expect(computeBackoffMs(-1)).toBe(0);
  });
});
