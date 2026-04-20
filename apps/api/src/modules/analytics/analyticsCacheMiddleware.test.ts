import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("@/utils/analyticsCache", () => ({
  buildAnalyticsCacheKey: vi.fn(),
  getCachedAnalytics: vi.fn(),
  setCachedAnalytics: vi.fn(),
}));

import {
  buildAnalyticsCacheKey,
  getCachedAnalytics,
  setCachedAnalytics,
} from "@/utils/analyticsCache";
import { analyticsCacheMiddleware } from "./analyticsCacheMiddleware";

const mockedBuildKey = buildAnalyticsCacheKey as unknown as ReturnType<
  typeof vi.fn
>;
const mockedGet = getCachedAnalytics as unknown as ReturnType<typeof vi.fn>;
const mockedSet = setCachedAnalytics as unknown as ReturnType<typeof vi.fn>;

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    path: "/analytics/sales",
    query: {},
    // user may or may not be present; consumer casts to any
    ...overrides,
  } as unknown as Request;
}

function makeRes() {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn().mockReturnThis();
  const res: Partial<Response> & { statusCode: number } = {
    statusCode: 200,
    status,
    json,
  };
  return res as Response & { statusCode: number };
}

describe("analyticsCacheMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedBuildKey.mockReturnValue("cache-key-123");
  });

  it("builds the cache key from path, userId, and query", () => {
    mockedGet.mockReturnValue(undefined);
    const req = makeReq({
      path: "/analytics/sales",
      query: { dateFrom: "2024-01-01" },
    });
    (req as unknown as { user: { id: string } }).user = { id: "u1" };
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    analyticsCacheMiddleware(req, res, next);

    expect(mockedBuildKey).toHaveBeenCalledWith("/analytics/sales", "u1", {
      dateFrom: "2024-01-01",
    });
  });

  it("builds the key with undefined userId when req.user is missing", () => {
    mockedGet.mockReturnValue(undefined);
    const req = makeReq();
    const res = makeRes();
    analyticsCacheMiddleware(req, res, vi.fn() as unknown as NextFunction);
    expect(mockedBuildKey).toHaveBeenCalledWith(
      "/analytics/sales",
      undefined,
      {},
    );
  });

  it("serves the cached body and skips next() when cache hits", () => {
    const cached = { items: [1, 2] };
    mockedGet.mockReturnValue(cached);
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    analyticsCacheMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(cached);
    expect(next).not.toHaveBeenCalled();
    expect(mockedSet).not.toHaveBeenCalled();
  });

  it("calls next() and wraps res.json on cache miss", () => {
    mockedGet.mockReturnValue(undefined);
    const req = makeReq();
    const res = makeRes();
    const originalJson = res.json;
    const next = vi.fn() as unknown as NextFunction;

    analyticsCacheMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    // res.json should have been replaced with the wrapper (not the same fn)
    expect(res.json).not.toBe(originalJson);
  });

  it("caches the response body when the wrapped res.json is called with status 200", () => {
    mockedGet.mockReturnValue(undefined);
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    analyticsCacheMiddleware(req, res, next);

    // Simulate the controller calling res.json later
    res.statusCode = 200;
    (res.json as unknown as (body: unknown) => Response)({ ok: true });

    expect(mockedSet).toHaveBeenCalledWith("cache-key-123", { ok: true });
  });

  it("does NOT cache non-200 responses (e.g. 400, 500)", () => {
    mockedGet.mockReturnValue(undefined);
    const req = makeReq();
    const res = makeRes();
    analyticsCacheMiddleware(req, res, vi.fn() as unknown as NextFunction);

    res.statusCode = 400;
    (res.json as unknown as (body: unknown) => Response)({
      error: "bad request",
    });
    expect(mockedSet).not.toHaveBeenCalled();

    res.statusCode = 500;
    (res.json as unknown as (body: unknown) => Response)({ error: "boom" });
    expect(mockedSet).not.toHaveBeenCalled();
  });

  it("treats the cached value `null` as a hit (not a miss) if getCached returns it", () => {
    // The middleware checks `cached !== undefined`, so `null` would short-circuit.
    mockedGet.mockReturnValue(null);
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    analyticsCacheMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(null);
    expect(next).not.toHaveBeenCalled();
  });
});
