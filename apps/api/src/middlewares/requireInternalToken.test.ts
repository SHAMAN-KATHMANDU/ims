import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: { internalApiToken: "" },
}));

vi.mock("@/config/env", () => ({
  env: mockEnv,
}));

import { requireInternalToken } from "./requireInternalToken";

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function makeReq(
  headers: Record<string, string> = {},
  query: Record<string, string> = {},
): Request {
  return { headers, query } as unknown as Request;
}

describe("requireInternalToken", () => {
  beforeEach(() => {
    mockEnv.internalApiToken = "correct-horse-battery-staple-1234567890";
  });

  it("calls next() when token matches", () => {
    const req = makeReq({
      "x-internal-token": "correct-horse-battery-staple-1234567890",
    });
    const res = mockRes() as Response;
    const next = vi.fn();

    requireInternalToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 503 when env token is unset (fail-closed)", () => {
    mockEnv.internalApiToken = "";
    const req = makeReq({ "x-internal-token": "whatever" });
    const res = mockRes() as Response;
    const next = vi.fn();

    requireInternalToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when header is missing", () => {
    const req = makeReq({});
    const res = mockRes() as Response;
    const next = vi.fn();

    requireInternalToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "missing_internal_token" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when header is wrong", () => {
    const req = makeReq({ "x-internal-token": "not-the-right-token" });
    const res = mockRes() as Response;
    const next = vi.fn();

    requireInternalToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "invalid_internal_token" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects tokens of different lengths without leaking timing", () => {
    const req = makeReq({ "x-internal-token": "short" });
    const res = mockRes() as Response;
    const next = vi.fn();

    requireInternalToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("handles array headers by taking the first value", () => {
    const req = makeReq({
      "x-internal-token": "correct-horse-battery-staple-1234567890",
    });
    const res = mockRes() as Response;
    const next = vi.fn();

    requireInternalToken(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("accepts the token via ?_t= query param (Caddy ask hook fallback)", () => {
    const req = makeReq({}, { _t: "correct-horse-battery-staple-1234567890" });
    const res = mockRes() as Response;
    const next = vi.fn();

    requireInternalToken(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("prefers header over query param when both are present", () => {
    const req = makeReq(
      { "x-internal-token": "correct-horse-battery-staple-1234567890" },
      { _t: "not-the-right-token" },
    );
    const res = mockRes() as Response;
    const next = vi.fn();

    requireInternalToken(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("rejects wrong query-param token", () => {
    const req = makeReq({}, { _t: "not-the-right-token" });
    const res = mockRes() as Response;
    const next = vi.fn();

    requireInternalToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
