/**
 * Phase 4 — Edge case expansion: time-based tests.
 * Trash cutoff date calculation, date boundary behavior.
 */

import { describe, it, expect, vi } from "vitest";
import { getCutoffDate } from "@/jobs/trashCleanup";

describe("Time-based edge cases", () => {
  it("getCutoffDate returns date 30 days before system time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-09T12:00:00Z"));

    const cutoff = getCutoffDate();

    expect(cutoff.getTime()).toBe(new Date("2026-02-07T12:00:00Z").getTime());

    vi.useRealTimers();
  });

  it("getCutoffDate handles month boundary correctly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00Z"));

    const cutoff = getCutoffDate();

    expect(cutoff.getTime()).toBe(new Date("2026-01-30T00:00:00Z").getTime());

    vi.useRealTimers();
  });

  it("getCutoffDate handles year boundary correctly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));

    const cutoff = getCutoffDate();

    expect(cutoff.getTime()).toBe(new Date("2025-12-16T12:00:00Z").getTime());

    vi.useRealTimers();
  });
});
