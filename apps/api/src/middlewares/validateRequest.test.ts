import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/middlewares/validateRequest";

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("validateBody", () => {
  const schema = z.object({
    username: z.string().trim().min(1, "Username is required"),
  });

  it("returns 400 when validation fails", () => {
    const middleware = validateBody(schema);
    const req = { body: { username: "   " } } as Request;
    const res = mockRes() as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Username is required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next and assigns parsed body when valid", () => {
    const middleware = validateBody(schema);
    const req = { body: { username: "  roshan  " } } as Request;
    const res = mockRes() as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toEqual({ username: "roshan" });
  });
});

describe("validateParams", () => {
  const schema = z.object({
    tier: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]),
  });

  it("returns 400 when params validation fails", () => {
    const middleware = validateParams(schema);
    const req = { params: { tier: "INVALID" } } as unknown as Request;
    const res = mockRes() as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next and assigns parsed params when valid", () => {
    const middleware = validateParams(schema);
    const req = { params: { tier: "STARTER" } } as unknown as Request;
    const res = mockRes() as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.params).toEqual({ tier: "STARTER" });
  });
});

describe("validateQuery", () => {
  const schema = z.object({
    year: z.coerce.number().int().min(2000).optional(),
  });

  it("returns 400 when query validation fails", () => {
    const middleware = validateQuery(schema);
    const req = { query: { year: "bad" } } as unknown as Request;
    const res = mockRes() as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next and assigns parsed query when valid", () => {
    const middleware = validateQuery(schema);
    const req = { query: { year: "2026" } } as unknown as Request;
    const res = mockRes() as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.query).toEqual({ year: 2026 });
  });
});
