import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { enforceOriginMatch } from "./enforceOriginMatch";

function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as unknown as Request;
}

const apiKey = {
  id: "k1",
  tenantDomain: { id: "d1", hostname: "shop.acme.com" },
} as unknown as Request["apiKey"];

describe("enforceOriginMatch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("500s when req.apiKey is missing (auth must run first)", () => {
    const req = makeReq();
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    enforceOriginMatch(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  it("403s when Origin header is missing", () => {
    const req = makeReq({ apiKey });
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    enforceOriginMatch(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("403s when Origin host does not match the bound domain", () => {
    const req = makeReq({
      apiKey,
      headers: { origin: "https://evil.com" },
    });
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    enforceOriginMatch(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("403s when Origin is not a valid URL", () => {
    const req = makeReq({
      apiKey,
      headers: { origin: "not a url" },
    });
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    enforceOriginMatch(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("calls next + reflects matching Origin (case-insensitive)", () => {
    const req = makeReq({
      apiKey,
      headers: { origin: "https://Shop.Acme.com" },
    });
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    enforceOriginMatch(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      "https://Shop.Acme.com",
    );
    expect(res.setHeader).toHaveBeenCalledWith("Vary", "Origin");
  });
});
