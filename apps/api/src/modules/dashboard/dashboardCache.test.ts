import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCached, setCached } from "./dashboardCache";

// The store is module-level. To keep tests independent, we use fake timers
// and fresh keys per test so entries cannot bleed between cases.
describe("dashboardCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getCached", () => {
    it("returns undefined when no entry exists for the key", () => {
      expect(getCached("/dashboard/kpis", "user-miss-1")).toBeUndefined();
    });

    it("returns the cached body within TTL", () => {
      setCached("/dashboard/kpis", "user-hit-1", { sales: 42 });
      expect(getCached("/dashboard/kpis", "user-hit-1")).toEqual({ sales: 42 });
    });

    it("returns undefined once TTL has elapsed (entry is expired)", () => {
      setCached("/dashboard/kpis", "user-ttl-1", { sales: 1 });
      // TTL is 90s — advance past it
      vi.advanceTimersByTime(90 * 1000 + 1);
      expect(getCached("/dashboard/kpis", "user-ttl-1")).toBeUndefined();
    });

    it("still returns the body just before TTL expires", () => {
      setCached("/dashboard/kpis", "user-ttl-edge", { sales: 2 });
      // 89s later — still within TTL (Date.now() > expiresAt is strict >)
      vi.advanceTimersByTime(89 * 1000);
      expect(getCached("/dashboard/kpis", "user-ttl-edge")).toEqual({
        sales: 2,
      });
    });

    it("isolates entries by userId — one user cannot read another's cache", () => {
      setCached("/dashboard/kpis", "user-a", { mine: true });
      expect(getCached("/dashboard/kpis", "user-b")).toBeUndefined();
    });

    it("isolates entries by path — different endpoints do not share cache", () => {
      setCached("/dashboard/kpis", "user-path-1", { kind: "kpis" });
      expect(getCached("/dashboard/revenue", "user-path-1")).toBeUndefined();
    });
  });

  describe("setCached", () => {
    it("overwrites an existing entry for the same key", () => {
      setCached("/dashboard/kpis", "user-overwrite", { v: 1 });
      setCached("/dashboard/kpis", "user-overwrite", { v: 2 });
      expect(getCached("/dashboard/kpis", "user-overwrite")).toEqual({ v: 2 });
    });

    it("refreshes the TTL when called again", () => {
      setCached("/dashboard/kpis", "user-refresh", { v: "first" });
      vi.advanceTimersByTime(60 * 1000); // 60s into the 90s TTL
      setCached("/dashboard/kpis", "user-refresh", { v: "second" });
      // Advance another 60s — total 120s since first set, but only 60s since refresh
      vi.advanceTimersByTime(60 * 1000);
      expect(getCached("/dashboard/kpis", "user-refresh")).toEqual({
        v: "second",
      });
    });

    it("accepts arbitrary body shapes", () => {
      setCached("/dashboard/widgets", "user-shape", [1, 2, 3]);
      expect(getCached("/dashboard/widgets", "user-shape")).toEqual([1, 2, 3]);

      setCached("/dashboard/widgets", "user-shape-2", null);
      expect(getCached("/dashboard/widgets", "user-shape-2")).toBeNull();
    });
  });
});
