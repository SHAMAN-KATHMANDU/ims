import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./pipeline.service", () => ({
  default: {
    create: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import pipelineController from "./pipeline.controller";
import * as pipelineServiceModule from "./pipeline.service";

const mockService = pipelineServiceModule.default as unknown as Record<
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

describe("PipelineController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("returns 201 with pipeline on success", async () => {
      const pipeline = { id: "1", name: "Sales" };
      mockService.create.mockResolvedValue(pipeline);
      const req = makeReq({ body: { name: "Sales" } });
      const res = mockRes() as Response;

      await pipelineController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ pipeline }),
      );
    });
  });

  describe("getById", () => {
    it("returns 404 when pipeline not found", async () => {
      const err = new Error("Pipeline not found") as Error & {
        statusCode: number;
      };
      err.statusCode = 404;
      mockService.getById.mockRejectedValue(err);
      const req = makeReq({ params: { id: "999" } });
      const res = mockRes() as Response;

      await pipelineController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
