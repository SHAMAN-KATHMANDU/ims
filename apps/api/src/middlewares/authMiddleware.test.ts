import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import authMiddleware from "./authMiddleware";

const mockNext = vi.fn();

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  },
}));

vi.mock("@/config/env", () => ({
  env: { jwtSecret: "test-secret" },
}));

vi.mock("@/config/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

import jwt from "jsonwebtoken";

describe("authMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockRes(): Partial<Response> {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  }

  it("returns 401 when Authorization header is missing", () => {
    const req = { headers: {} } as Request;
    const res = mockRes() as Response;

    authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "No token, authorization denied",
    });
    expect(mockNext).not.toHaveBeenCalled();
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header does not start with Bearer", () => {
    const req = { headers: { authorization: "Basic abc" } } as Request;
    const res = mockRes() as Response;

    authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "No token, authorization denied",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error("invalid");
    });
    const req = {
      headers: { authorization: "Bearer invalid-token" },
    } as Request;
    const res = mockRes() as Response;

    authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Token is not valid",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("returns 401 when token payload fails Zod validation (e.g. missing id or role)", () => {
    vi.mocked(jwt.verify).mockReturnValue({
      tenantId: "t1",
      tenantSlug: "acme",
    } as unknown as object);
    const req = {
      headers: { authorization: "Bearer valid-token" },
    } as Request;
    const res = mockRes() as Response;

    authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Token is not valid",
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("sets req.user and calls next when token is valid", () => {
    const decoded = {
      id: "u1",
      role: "admin",
      tenantId: "t1",
      tenantSlug: "acme",
    };
    vi.mocked(jwt.verify).mockReturnValue(decoded);
    const req = {
      headers: { authorization: "Bearer valid-token" },
    } as Request;
    const res = mockRes() as Response;

    authMiddleware(req, res, mockNext);

    expect(req.user).toEqual(
      expect.objectContaining({
        id: "u1",
        role: "admin",
        tenantId: "t1",
        tenantSlug: "acme",
      }),
    );
    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
