import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import express from "express";
import request from "supertest";
import { z } from "zod";
import {
  validateBody,
  validateParams,
  validateQuery,
  getValidatedQuery,
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

  it("calls next and stores parsed query in res.locals when valid", () => {
    const middleware = validateQuery(schema);
    const req = { query: { year: "2026" } } as unknown as Request;
    const res = { ...mockRes(), locals: {} } as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.locals.validated?.query).toEqual({ year: 2026 });
  });
});

describe("validateQuery integration", () => {
  it("does not reassign req.query and exposes validated query via locals", async () => {
    const app = express();
    const schema = z.object({
      year: z.coerce.number().int().min(2000),
    });

    app.get(
      "/reports",
      validateQuery(schema),
      (req: Request, res: Response): void => {
        const query = getValidatedQuery<{ year: number }>(req, res);
        res.status(200).json({
          year: query.year,
          reqQueryType: typeof req.query.year,
        });
      },
    );

    const success = await request(app).get("/reports").query({ year: "2026" });
    expect(success.status).toBe(200);
    expect(success.body).toEqual({
      year: 2026,
      reqQueryType: "string",
    });

    const failure = await request(app).get("/reports").query({ year: "bad" });
    expect(failure.status).toBe(400);
    expect(failure.body.message).toContain("number");
  });
});
