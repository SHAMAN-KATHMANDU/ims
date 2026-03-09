import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./deal.service", () => ({
  default: {
    create: vi.fn(),
    getAll: vi.fn(),
    getByPipeline: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    updateStage: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import dealController from "./deal.controller";
import * as dealServiceModule from "./deal.service";

const mockService = dealServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: "u1", tenantId: "t1", role: "admin", tenantSlug: "acme" },
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

describe("DealController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("returns 201 with deal on success", async () => {
      const deal = { id: "1", name: "Deal 1" };
      mockService.create.mockResolvedValue(deal);
      const req = makeReq({ body: { name: "Deal 1" } });
      const res = mockRes() as Response;

      await dealController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ deal }));
    });
  });

  describe("getById", () => {
    it("returns 404 when deal not found", async () => {
      const err = new Error("Deal not found") as Error & { statusCode: number };
      err.statusCode = 404;
      mockService.getById.mockRejectedValue(err);
      const req = makeReq({ params: { id: "999" } });
      const res = mockRes() as Response;

      await dealController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
