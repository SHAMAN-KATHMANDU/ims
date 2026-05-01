import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { readOnlyGuard } from "./readOnlyGuard";

function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

function makeReq(method: string): Request {
  return { method } as unknown as Request;
}

describe("readOnlyGuard", () => {
  it.each(["GET", "HEAD", "OPTIONS"])("allows %s", (method) => {
    const req = makeReq(method);
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    readOnlyGuard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "405s on %s and sets Allow header",
    (method) => {
      const req = makeReq(method);
      const res = mockRes();
      const next = vi.fn() as NextFunction;
      readOnlyGuard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.setHeader).toHaveBeenCalledWith("Allow", "GET, HEAD, OPTIONS");
      expect(next).not.toHaveBeenCalled();
    },
  );
});
