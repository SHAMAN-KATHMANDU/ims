import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./workflow.service", () => ({
  default: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import workflowController from "./workflow.controller";
import * as serviceModule from "./workflow.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = serviceModule.default as unknown as Record<
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

describe("WorkflowController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("returns 200 with workflows on success", async () => {
      const workflows = [{ id: "w1", name: "Follow-up", pipelineId: "p1" }];
      mockService.getAll.mockResolvedValue(workflows);
      const req = makeReq();
      const res = mockRes() as Response;

      await workflowController.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ workflows }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.getAll.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await workflowController.getAll(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("returns 201 with created workflow on success", async () => {
      const workflow = {
        id: "w1",
        name: "Follow-up",
        pipelineId: "p1",
        isActive: true,
      };
      mockService.create.mockResolvedValue(workflow);
      const req = makeReq({
        body: {
          pipelineId: "00000000-0000-0000-0000-000000000001",
          name: "Follow-up",
        },
      });
      const res = mockRes() as Response;

      await workflowController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ workflow }),
      );
    });
  });
});
